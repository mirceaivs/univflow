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
        self.vision_model = os.getenv("GEMINI_MODEL_NAME", "gemini-3.1-flash-preview")
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
            "dintr-un document tehnic. Oferă o descriere textuală detaliată și exhaustivă, ÎN LIMBA ROMÂNĂ."
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
                    if 'images' in page_data and page_data['images']:
                        for index, img_meta in enumerate(page_data['images']):
                            bbox = img_meta.get('bbox')
                            if not bbox: continue
                            width = bbox[2] - bbox[0]
                            height = bbox[3] - bbox[1]
                            if width < 50 or height < 50: continue
                            
                            page = pdf_document.load_page(page_index)
                            pix = page.get_pixmap(clip=fitz.Rect(bbox), dpi=200)
                            
                            future = executor.submit(
                                self._interpret_visual_element, 
                                pix.tobytes("png"), 
                                "diagramă", 
                                storage_client, 
                                bucket_name, 
                                job_id, 
                                index
                            )
                            img_meta['future_data'] = future

                comprehensive_markdown_pages = []
                for page_data in layout_data:
                    page_text = page_data.get('text', '') 
                    
                    
                    
                    page_text = re.sub(r'<br\s*/?>', ' ', page_text)
                    
                    
                    
                    page_text = re.sub(r'^([a-zA-Z0-9©]\s+){4,}.*$', '', page_text, flags=re.MULTILINE)
                    
                    
                    page_text = re.sub(r'.*?\.{4,}\s*\d+$', '', page_text, flags=re.MULTILINE)
                    
                    
                    if 'images' in page_data:
                        for img_meta in page_data['images']:
                            if 'future_data' in img_meta:
                                try:
                                    image_url, ai_description = img_meta['future_data'].result()
                                    
                                    injection_block = (
                                        f"\n\n![Diagramă]({image_url})\n"
                                        f"**Descriere Vizuală (Generată AI):** {ai_description}\n\n"
                                    )
                                    page_text += injection_block
                                except Exception as e:
                                    print(f"Eroare procesare imagine la nivel de chunker: {e}")
                    
                    comprehensive_markdown_pages.append(page_text)
            
            full_document_text = "\n".join(comprehensive_markdown_pages)
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
                model=os.getenv("GEMINI_MODEL_NAME", "gemini-3.1-flash-preview"),
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

        
        
        
        
        clean_file_name = re.sub(r'^([0-9a-fA-F\-]+_|[a-zA-Z0-9]+_)', '', os.path.basename(file_path))
        
        docs = self.semantic_chunker.create_documents(
            [full_document_text],
            metadatas=[{"course_id": course_id, "source_file": clean_file_name}]
        )
        
        
        if global_summary_doc:
            docs.insert(0, global_summary_doc)
            
        return docs