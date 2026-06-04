import React, { useEffect } from "react";
import { FileText } from "lucide-react";
import { Card } from "../ui.jsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const cleanRawText = (rawText) => {
  if (!rawText) return "Fragment de text indisponibil.";
  let text = rawText;

  text = text.replace(/<ai_vision_description[^>]*>[\s\S]*?(<\/ai_vision_description>|$)/gi, "");
  text = text.replace(/\*\*Descriere Vizuală\s*\(Generată\s*AI\):\*\*[\s\S]*?(?=(\n\s*#{1,6}|\n\s*\*\*|$))/gi, "");
  text = text.replace(/[-*#_]*\s*Start of picture text\s*[-*#_]*/gi, "");
  text = text.replace(/[-*#_]*\s*End of picture text\s*[-*#_]*/gi, "");
  text = text.replace(/\[Imagine de referință extrasă din curs\]/gi, "");
  text = text.replace(/Diagramă/gi, "");

  // Normalize bullet symbols parsed as backticked o or ~o
  text = text.replace(/`\s*~?o\s*`/gi, "\n  - ");
  text = text.replace(/~\s*o\s*/gi, "\n  - ");
  text = text.replace(/([:;])\s*o\s+([a-zA-Z\u0100-\u024F\w])/g, "$1\n  - $2");

  // Clean diamond bullets (❖ or * ❖)
  text = text.replace(/\*\s*❖/g, "-");
  text = text.replace(/❖/g, "-");

  // Split inline numbered questions into separate paragraphs
  text = text.replace(/([.?!])\s+(\d+\.\s+[A-Z\u0100-\u024F])/g, "$1\n\n$2");

  // Clean text separator asterisks (like ****)
  text = text.replace(/\*{3,}/g, "");

  // Convert inline list items marked with ' - ' after sentence endings into actual list items
  text = text.replace(/([.?!)]|`)\s*-\s+/g, "$1\n- ");

  // Remove backticks inside table cells (e.g. | `cell` | -> | cell |)
  text = text.replace(/(\|\s*)`([^`|\n]+)`(\s*(?=\|))/g, "$1$2$3");

  text = text.replace(/\n\s*#{0,4}\s*(Bibliografie|Bibliografii|Referințe|Referinte|References)[\s\S]*/i, "");

  // Fix tables by making sure adjacent table rows have newlines
  text = text.replace(/(\|[^\n]+\|)\s+(?=\|)/g, "$1\n");

  // Fix tables where text is mixed up before the table header
  text = text.replace(/([^\n|])\s+(\|[^|\n]+\|)/g, (match, p1, p2, offset) => {
    const textBeforeMatch = text.slice(0, offset);
    const lastNewlineIdx = textBeforeMatch.lastIndexOf("\n");
    const currentLineBeforeMatch = textBeforeMatch.slice(lastNewlineIdx + 1);
    
    if (currentLineBeforeMatch.includes("|")) {
      return match; 
    }
    return `${p1}\n\n${p2}`;
  });

  // Fix tables with missing closing pipe
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

  // Flip upside-down markdown tables
  const lines = text.split("\n");
  const resultLines = [];
  let currentTable = [];

  const isTableLine = (line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("|") && trimmed.endsWith("|");
  };

  const isSeparatorLine = (line) => {
    const trimmed = line.trim();
    return /^\|[\s:-|]+\|$/.test(trimmed) && trimmed.includes("-");
  };

  const processTable = (tableLines) => {
    if (tableLines.length < 3) return tableLines;
    
    let sepIdx = -1;
    for (let j = 0; j < tableLines.length; j++) {
      if (isSeparatorLine(tableLines[j])) {
        sepIdx = j;
        break;
      }
    }
    
    if (sepIdx !== -1 && sepIdx >= Math.floor(tableLines.length / 2)) {
      const remaining = tableLines.filter((_, idx) => idx !== sepIdx);
      remaining.reverse();
      remaining.splice(1, 0, tableLines[sepIdx]);
      return remaining;
    }
    
    return tableLines;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isTableLine(line)) {
      currentTable.push(line);
    } else {
      if (currentTable.length > 0) {
        resultLines.push(...processTable(currentTable));
        currentTable = [];
      }
      resultLines.push(line);
    }
  }
  if (currentTable.length > 0) {
    resultLines.push(...processTable(currentTable));
  }
  text = resultLines.join("\n");

  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
};

export const SourcesPanel = ({
  setRightPanelState,
  sources = [],
  documents = [],
  focusedSourceId,
  openDocumentPanel,
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
  let isClickable = false;
  let matchedMaterial = null;

  if (sourceToRender) {
    const textContent = sourceToRender.text_extras || sourceToRender.text || "";
    cleanContent = cleanRawText(textContent);

    const sourceFile = sourceToRender.source_file || "Sursă Necunoscută";
    const pageNumMatch = sourceToRender.header
      ? sourceToRender.header.match(/Pagina\s+(\d+)/i)
      : null;
    pageNum = pageNumMatch ? pageNumMatch[1] : null;

    const isGlobalSummary = sourceFile.toLowerCase() === "rezumat global" || 
                            sourceToRender.header === "Viziune de Ansamblu";

    if (isGlobalSummary) {
      finalSourceName = "Rezumat";
      isClickable = false;
    } else {
      finalSourceName = sourceFile.replace(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]?/i,
        ""
      );
      if (!finalSourceName || finalSourceName.toLowerCase() === ".pdf") {
        finalSourceName = "Document Curs";
      }

      const cleanForCompare = (name) => {
        if (!name) return "";
        return name.toLowerCase().replace(/\.(pdf|docx?|pptx?)$/i, "").trim();
      };
      const cleanSource = cleanForCompare(finalSourceName);

      matchedMaterial = materials?.find((m) => {
        const extractedJobId = sourceFile.replace(/\.pdf$/i, "").trim();
        if (String(m.id) === extractedJobId || String(m.backendId) === extractedJobId) {
          return true;
        }
        const uuidMatch = sourceFile.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (uuidMatch) {
          const uuid = uuidMatch[1].toLowerCase();
          if (m.id?.toString().toLowerCase() === uuid || m.backendId?.toString().toLowerCase() === uuid || m.jobId?.toString().toLowerCase() === uuid) {
            return true;
          }
        }
        const cleanMatName = cleanForCompare(m.name);
        return cleanMatName && cleanSource && cleanMatName === cleanSource;
      });

      if (matchedMaterial && matchedMaterial.name) {
        finalSourceName = matchedMaterial.name;
        isClickable = true;
      } else {
        isClickable = false;
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
                  {isClickable ? (
                    <button
                      onClick={() => openDocumentPanel && openDocumentPanel(matchedMaterial)}
                      className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline text-left truncate flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                      title={`Deschide ${finalSourceName}`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 text-primary-500" />
                      <span>{finalSourceName}</span>
                    </button>
                  ) : (
                    <span
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1"
                      title={finalSourceName}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>{finalSourceName}</span>
                    </span>
                  )}
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
            <div className="flex flex-col space-y-5">
              <div className="p-4 text-center text-sm font-medium text-slate-500 italic border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                Sursa [{focusedSourceId}] nu a putut fi localizată în acest mesaj (posibil o referință inexistentă generată de AI).
              </div>
              
              {displayedSources.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Surse disponibile în acest mesaj:
                  </p>
                  <div className="space-y-3">
                    {displayedSources.map((src) => {
                      const sourceFile = src.source_file || "Sursă Necunoscută";
                      const cleanSourceName = sourceFile.replace(
                        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]?/i,
                        ""
                      );
                      const pageNumMatch = src.header
                        ? src.header.match(/Pagina\s+(\d+)/i)
                        : null;
                      const srcPage = pageNumMatch ? pageNumMatch[1] : null;

                      return (
                        <Card
                          key={src.id || src.displayIndex}
                          className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-5 h-5 shrink-0 rounded-full bg-primary-600 text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                                {src.displayIndex}
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                {cleanSourceName}
                              </span>
                            </div>
                            {srcPage != null && (
                              <span className="text-[10px] font-bold shrink-0 text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                Pag. {srcPage}
                              </span>
                            )}
                          </div>
                          <div className="border-l-[3px] border-slate-300 dark:border-slate-700 pl-3 py-1 text-[13px] text-slate-600 dark:text-slate-400 line-clamp-3">
                            {src.text_extras || src.text || ""}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
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
