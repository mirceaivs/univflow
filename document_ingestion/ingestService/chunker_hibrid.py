import fitz
import pymupdf4llm
import base64
import os
import time
import random
import uuid
import concurrent.futures
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.messages import HumanMessage
from langchain_experimental.text_splitter import SemanticChunker
from dotenv import load_dotenv
import re

load_dotenv()

def sync_exponential_backoff(retries=5, initial_delay=2.0, max_delay=60.0):
    def decorator(func):
        def wrapper(*args, **kwargs):
            delay = initial_delay
            for attempt in range(retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    error_msg = str(e).lower()
                    is_transient = "429" in error_msg or "quota" in error_msg or "exhausted" in error_msg or "503" in error_msg
                    if is_transient:
                        if attempt == retries - 1:
                            print(f"Eșec definitiv la Vertex AI după {retries} încercări: {e}")
                            raise e
                        jitter = random.uniform(0, 0.2 * delay)
                        sleep_time = min(delay + jitter, max_delay)
                        print(f"Cotă atinsă. Așteptăm {sleep_time:.1f}s (Încercarea {attempt + 1}/{retries})")
                        time.sleep(sleep_time)
                        delay *= 2
                    else:
                        raise e
        return wrapper
    return decorator

class MultimodalSemanticPipeline:
    def __init__(self, project_id: str, location: str, credentials=None):
        self.vision_model = os.getenv("GEMINI_MODEL_NAME", "gemini-3.5-flash")
        self.project_id = project_id
        self.location = location
        self.credentials = credentials
        self.llm = ChatGoogleGenerativeAI(
            model=self.vision_model,
            project=project_id,
            location=location,
            credentials=credentials,
            temperature=0.0,
            thinking_level="medium"
        )   
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-005",
            project=project_id,
            location=location,
            credentials=credentials
        )
        self.semantic_chunker = SemanticChunker(
            self.embeddings,
            breakpoint_threshold_type="percentile",
            breakpoint_threshold_amount=95
        )

    @sync_exponential_backoff(retries=4, initial_delay=2.0)
    def _interpret_visual_element(self, image_bytes, context_type, storage_client, bucket_name, job_id, element_index):
        
        bucket = storage_client.bucket(bucket_name)
        unique_img_id = uuid.uuid4().hex[:8]
        blob_name = f"graphrag_ingestion/{job_id}/diagrams/element_{element_index}_{unique_img_id}.png"
        blob = bucket.blob(blob_name)
        blob.upload_from_string(image_bytes, content_type="image/png")
        
        
        try:
            blob.make_public()
        except Exception as e:
            print(f"Nu s-a putut face public blob-ul direct (Uniform Bucket-Level Access activat): {e}")
            
        gcs_base_url = os.getenv("GCS_BASE_URL", "https://storage.googleapis.com")
        gcs_public_url = f"{gcs_base_url}/{bucket_name}/{blob_name}"

        
        prompt = (
            f"Ești un asistent expert. Această imagine reprezintă un/o {context_type} "
            "dintr-un document tehnic. Evaluează dacă imaginea este o diagramă, un grafic sau o schemă cu conținut informațional real. "
            "Dacă imaginea este doar un element decorativ (de ex. un omuleț 3D, o pictogramă de atenționare, un semn de exclamare, un icon generic sau un bullet point), "
            "răspunde EXACT și DOAR cu cuvântul 'DECORATIV'. "
            "Altfel, oferă o descriere textuală detaliată și exhaustivă a informației tehnice, ÎN LIMBA ROMÂNĂ."
        )
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}}
            ]
        )
        
        response = self.llm.invoke([message])
        if isinstance(response.content, list):
            text_parts = [block.get("text", "") for block in response.content if isinstance(block, dict) and "text" in block]
            ai_description = "".join(text_parts).strip()
        else:
            ai_description = str(response.content).strip()
            
        return gcs_public_url, ai_description

    def process_document(self, file_path: str, course_id: str, storage_client, bucket_name: str, job_id: str) -> list:
        pdf_document = fitz.open(file_path)
        try:
            layout_data = pymupdf4llm.to_markdown(file_path, page_chunks=True)
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                for page_index, page_data in enumerate(layout_data):
                    page = pdf_document.load_page(page_index)
                    has_extracted_images = False
                    
                    if 'images' in page_data and page_data['images']:
                        for index, img_meta in enumerate(page_data['images']):
                            bbox = img_meta.get('bbox')
                            if not bbox: continue
                            width = bbox[2] - bbox[0]
                            height = bbox[3] - bbox[1]
                            if width < 50 or height < 50: continue
                            
                            pix = page.get_pixmap(clip=fitz.Rect(bbox), dpi=200)
                            
                            future = executor.submit(
                                self._interpret_visual_element, 
                                pix.tobytes("png"), 
                                "diagramă", 
                                storage_client, 
                                bucket_name, 
                                job_id, 
                                f"p{page_index}_img_{index}"
                            )
                            img_meta['future_data'] = future
                            has_extracted_images = True

                    # Dacă pymupdf4llm nu a extras imagini individuale, dar pagina conține desene vectoriale complexe
                    # (cum ar fi diagrame ER în format vectorial: Visio/Draw.io) sau imagini pe care nu le-a extras,
                    # determinăm regiunea activă a acestora și o decupăm (crop) în loc de a randa întreaga pagină
                    if not has_extracted_images:
                        drawings = page.get_drawings()
                        images = page.get_images()
                        
                        if len(images) > 0 or len(drawings) > 10:
                            drawings_rect = fitz.Rect()
                            
                            # Includem desenele vectoriale
                            for d in drawings:
                                r = fitz.Rect(d.get("rect"))
                                # Ignorăm elementele de fundal/border care ocupă aproape toată pagina
                                if r.width >= page.rect.width * 0.95 and r.height >= page.rect.height * 0.95:
                                    continue
                                drawings_rect.include_rect(r)
                            
                            # Includem imagini raster
                            if len(images) > 0:
                                for img in images:
                                    xref = img[0]
                                    for r in page.get_image_rects(xref):
                                        drawings_rect.include_rect(r)
                            
                            # Dacă bounding box-ul determinat nu este gol, decupăm acea zonă
                            if not drawings_rect.is_empty:
                                # Adăugăm un padding de 15px pentru a nu tăia din margini/texte explicative ale diagramei
                                clip_rect = fitz.Rect(
                                    max(0, drawings_rect.x0 - 15),
                                    max(0, drawings_rect.y0 - 15),
                                    min(page.rect.width, drawings_rect.x1 + 15),
                                    min(page.rect.height, drawings_rect.y1 + 15)
                                )
                                label = "diagramă decupată"
                            else:
                                clip_rect = page.rect
                                label = "diagramă/schemă completă pe pagină"
                            
                            pix = page.get_pixmap(clip=clip_rect, dpi=200)
                            future = executor.submit(
                                self._interpret_visual_element,
                                pix.tobytes("png"),
                                label,
                                storage_client,
                                bucket_name,
                                job_id,
                                f"p{page_index}_crop"
                            )
                            if 'images' not in page_data:
                                page_data['images'] = []
                            page_data['images'].append({
                                'bbox': [clip_rect.x0, clip_rect.y0, clip_rect.x1, clip_rect.y1],
                                'future_data': future
                            })

                comprehensive_markdown_pages = []
                for page_data in layout_data:
                    page_text = page_data.get('text', '') 
                    # 1. Ștergem adnotările de tip "newline ca HTML"
                    page_text = re.sub(r'<br\s*/?>', ' ', page_text)
                    
                    # 2. Ștergem liniile de copyright evidente și drepturi rezervate
                    page_text = re.sub(r'(?i)^.*(?:copyright|©|\(c\)|&copy;).*$', '', page_text, flags=re.MULTILINE)
                    page_text = re.sub(r'(?i)^.*toate\s+drepturile\s+rezervate.*$', '', page_text, flags=re.MULTILINE)
                    
                    # 3. Eliminăm liniile din cuprins (cu cel puțin 4 puncte consecutive)
                    page_text = re.sub(r'^.*\.{4,}.*$', '', page_text, flags=re.MULTILINE)
                    
                    # 4. Eliminăm cuvântul "Cuprins" dacă este singur pe linie
                    page_text = re.sub(r'^\s*#*\s*\*?\*?\s*cuprins\s*\*?\*?\s*$', '', page_text, flags=re.IGNORECASE | re.MULTILINE)
                    
                    # 5. Eliminăm numerele de pagină (singure pe linie, formate de tip "5- 2" sau "pagina 12")
                    page_text = re.sub(r'^\s*\d+\s*-\s*\d+\s*$', '', page_text, flags=re.MULTILINE)
                    page_text = re.sub(r'^\s*(pag(ina|\.)?|page)?\s*\d+\s*$', '', page_text, flags=re.IGNORECASE | re.MULTILINE)
                    
                    # Eliminam imaginile neprocesate (intentionally omitted)
                    page_text = re.sub(r'==>\s*picture.*?intentionally omitted\s*<==', '', page_text, flags=re.IGNORECASE)
                    
                    # Curățare zgomot de header/footer specific (Data Warehousing)
                    page_text = re.sub(r'(?i)^\s*Data Warehousing & Business Intelligence\s*$', '', page_text, flags=re.MULTILINE)
                    page_text = re.sub(r'(?i)^\s*5\.\s*Indecși\s*$', '', page_text, flags=re.MULTILINE)
                    
                    if 'images' in page_data:
                        for img_meta in page_data['images']:
                            if 'future_data' in img_meta:
                                try:
                                    image_url, ai_description = img_meta['future_data'].result()
                                    
                                    if ai_description.strip().upper() == 'DECORATIV':
                                        continue
                                        
                                    injection_block = (
                                        f"\n\n**[Imagine de referință extrasă din curs]**\n"
                                        f"<img src=\"{image_url}\" style=\"max-width: 50%; height: auto;\" alt=\"Diagramă\"/>\n"
                                        f"<ai_vision_description>{ai_description}</ai_vision_description>\n\n"
                                    )
                                    page_text += injection_block
                                except Exception as e:
                                    print(f"Eroare procesare imagine la nivel de chunker: {e}")
                    
                    comprehensive_markdown_pages.append(page_text)
            
            full_document_text = "\n".join(comprehensive_markdown_pages)
            
            # Corectam problemele de formatare specifice LaTeX/Math rezultate din pymupdf4llm
            full_document_text = re.sub(r'\$B\^\*Tree\$', 'B*Tree', full_document_text)
            
            full_document_text = re.sub(r'\n{3,}', '\n\n', full_document_text)
        finally:
            pdf_document.close()
            
        
        
        
        
        

        bib_pattern = re.compile(r'\n#{1,4}\s*(Bibliografie|Referințe|References)[\s\S]*', re.IGNORECASE)
        full_document_text = re.sub(bib_pattern, '', full_document_text)

        
        
        
        global_summary_doc = None
        try:
            print(f"[{course_id}] Generez rezumatul global al cursului...")
            summary_prompt = (
                "Ești un profesor universitar și expert în analiză de text. "
                "Te rog să generezi un rezumat global, executiv și foarte bine structurat (Course Overview) "
                "al întregului material de curs de mai jos. Surprinde ideile și conceptele principale într-un text clar. "
                "Nu folosi formule de salut, intră direct în subiect.\n\n"
                f"MATERIAL:\n{full_document_text[:80000]}" 
            )
            
            
            llm_summary = ChatGoogleGenerativeAI(
                model=os.getenv("GEMINI_MODEL_NAME", "gemini-3.5-flash"),
                project=self.project_id,
                location=self.location,
                credentials=self.credentials,
                temperature=0.5
            )
            
            summary_response = llm_summary.invoke([HumanMessage(content=summary_prompt)])
            
            
            summary_text = ""
            if isinstance(summary_response.content, list):
                text_parts = [block.get("text", "") for block in summary_response.content if isinstance(block, dict) and "text" in block]
                summary_text = "".join(text_parts).strip()
            else:
                summary_text = str(summary_response.content).strip()
            
            
            global_summary_doc = Document(
                page_content=summary_text,
                metadata={
                    "course_id": course_id,
                    "source_file": "Rezumat_Global_Curs.pdf",
                    "is_global_summary": "True", 
                    "header": "Rezumatul Global al Cursului"
                }
            )
            print(f"[{course_id}] Rezumat global generat cu succes!")
        except Exception as e:
            print(f"[{course_id}] Eroare la generarea rezumatului global: {e}")

        
        
        
        
        # Protejăm tabelele Markdown prin placeholders pentru a preveni fragmentarea lor de către Semantic Chunker
        lines = full_document_text.split("\n")
        processed_lines = []
        tables_list = []
        current_table = []
        
        for line in lines:
            trimmed = line.strip()
            if trimmed.startswith("|"):
                current_table.append(line)
            else:
                if current_table:
                    table_text = "\n".join(current_table)
                    placeholder = f"__TABLE_PLACEHOLDER_{len(tables_list)}__"
                    tables_list.append(table_text)
                    processed_lines.append(placeholder)
                    current_table = []
                processed_lines.append(line)
                
        if current_table:
            table_text = "\n".join(current_table)
            placeholder = f"__TABLE_PLACEHOLDER_{len(tables_list)}__"
            tables_list.append(table_text)
            processed_lines.append(placeholder)
            
        placeholder_text = "\n".join(processed_lines)

        clean_file_name = re.sub(r'^([0-9a-fA-F\-]+_|[a-zA-Z0-9]+_)', '', os.path.basename(file_path))
        
        docs = self.semantic_chunker.create_documents(
            [placeholder_text],
            metadatas=[{"course_id": course_id, "source_file": clean_file_name}]
        )
        
        # Restabilim tabelele originale în cadrul chunk-urilor generate
        def restore_tables(chunk_text, saved_tables):
            def replace_match(match):
                idx = int(match.group(1))
                if idx < len(saved_tables):
                    return f"\n\n{saved_tables[idx]}\n\n"
                return match.group(0)
            return re.sub(r'__TABLE_PLACEHOLDER_(\d+)__', replace_match, chunk_text)

        for doc in docs:
            doc.page_content = restore_tables(doc.page_content, tables_list)
            # Curățăm eventualele linii goale excesive adăugate la restabilire
            doc.page_content = re.sub(r'\n{3,}', '\n\n', doc.page_content).strip()
        
        if global_summary_doc:
            docs.insert(0, global_summary_doc)
            
        return docs