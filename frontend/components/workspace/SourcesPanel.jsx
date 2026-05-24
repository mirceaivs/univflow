import React, { useEffect } from "react";
import { FileText } from "lucide-react";
import { Card } from "../ui.jsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const cleanRawText = (rawText) => {
  if (!rawText) return "Fragment de text indisponibil.";
  let text = rawText;

  // Pasul 1: Separă rândurile tabelelor concatenate orizontal (dacă sunt separate prin | | )
  text = text.replace(/(\|[^\n]+\|)\s+(?=\|)/g, "$1\n");

  // Pasul 2: Remediază celulele goale ce conțin doar spații
  text = text.replace(/\|\s+\|/g, "|\n|");

  // Pasul 3: Separă textul simplu de începutul unui tabel, dar fără a distruge celulele aceluiași rând
  text = text.replace(/([^\n|])\s+(\|[^|\n]+\|)/g, (match, p1, p2, offset) => {
    const textBeforeMatch = text.slice(0, offset);
    const lastNewlineIdx = textBeforeMatch.lastIndexOf("\n");
    const currentLineBeforeMatch = textBeforeMatch.slice(lastNewlineIdx + 1);
    
    if (currentLineBeforeMatch.includes("|")) {
      return match; // Suntem deja în interiorul unui rând de tabel, nu fragmentăm celulele
    }
    return `${p1}\n\n${p2}`;
  });

  // Pasul 4: Asigură-te că rândurile care încep cu | se închid corect cu |
  text = text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && !trimmed.endsWith("|")) {
        return trimmed + " |";
      }
      return line;
    })
    .join("\n");

  // Pasul 5: Curățare spații și linii goale redundante
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
};

export const SourcesPanel = ({
  setRightPanelState,
  sources = [],
  documents = [],
  focusedSourceId,
}) => {
  const materials = documents;

  
  const displayedSources =
    sources?.map((src, index) => ({
      ...src,
      displayIndex: index + 1,
    })) || [];

  
  const sourceToRender = focusedSourceId
    ? displayedSources.find(
        (src) =>
          src.id?.toString() === focusedSourceId.toString() ||
          src.displayIndex?.toString() === focusedSourceId.toString()
      )
    : null;

  
  let cleanContent = "";
  let finalSourceName = "Sursă Necunoscută";
  let pageNum = null;

  if (sourceToRender) {
    const textContent = sourceToRender.text_extras || sourceToRender.text || "";
    cleanContent = cleanRawText(textContent);

    const sourceFile = sourceToRender.source_file || "Sursă Necunoscută";
    const pageNumMatch = sourceToRender.header
      ? sourceToRender.header.match(/Pagina\s+(\d+)/i)
      : null;
    pageNum = pageNumMatch ? pageNumMatch[1] : null;

    const extractedJobId = sourceFile.replace(/\.pdf$/i, "").trim();
    const matchedMaterial = materials?.find(
      (m) =>
        String(m.id) === extractedJobId ||
        String(m.backendId) === extractedJobId
    );

    if (matchedMaterial && matchedMaterial.name) {
      finalSourceName = matchedMaterial.name;
    } else {
      finalSourceName = sourceFile.replace(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]?/i,
        ""
      );
      if (!finalSourceName || finalSourceName.toLowerCase() === ".pdf") {
        finalSourceName = "Document Curs";
      }
    }
  }


  return (
    <div className="flex flex-col h-full h-[calc(100vh-140px)]">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-10">
        {focusedSourceId ? (
          sourceToRender ? (
            <Card
              key={sourceToRender.id || sourceToRender.displayIndex}
              id={`source-card-${
                sourceToRender.id || sourceToRender.displayIndex
              }`}
              className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-5 h-5 shrink-0 rounded-full bg-primary-600 text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                    {sourceToRender.displayIndex}
                  </div>
                  <span
                    className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate"
                    title={finalSourceName}
                  >
                    <FileText className="w-3.5 h-3.5 inline mr-1 text-primary-500" />{" "}
                    {finalSourceName}
                  </span>
                </div>
                {pageNum != null && (
                  <span className="text-[11px] font-bold shrink-0 text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                    Pag. {pageNum}
                  </span>
                )}
              </div>

              <div className="border-l-[3px] border-primary-400 pl-4 py-2 text-[13.5px] text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/30 rounded-r-lg prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-th:border prose-th:border-slate-300 dark:prose-th:border-slate-700 prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:p-2 prose-td:border prose-td:border-slate-300 dark:prose-td:border-slate-700 prose-td:p-2 prose-table:border-collapse prose-table:w-full prose-table:text-[12.5px] overflow-x-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {cleanContent}
                </ReactMarkdown>
              </div>
            </Card>
          ) : (
            <div className="p-4 text-center text-slate-500 italic border border-slate-200 rounded-md">
              Sursa referențiată nu a putut fi localizată în fereastra curentă
              de context hibrid.
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Modul de Explorare a Surselor
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Selectează o referință numerică direct din fluxul conversației
                pentru a izola și vizualiza detaliile textuale.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
