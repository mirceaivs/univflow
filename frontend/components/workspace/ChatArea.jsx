import React, { useRef, useCallback, useEffect, useState } from "react";
import { Sparkles, ArrowUp, Loader2, X, FileText, BrainCircuit, Square } from "lucide-react";
import { Badge } from "../ui.jsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useIngestion } from "../context/IngestionContext.jsx";

const funnyLoadingMessages = [
  "Răsfoiesc cursurile mai repede decât un student în dimineața examenului...",
  "Se ascut creioanele digitale și se prepară argumentele...",
  "Interoghez baza de date hibridă și stelele călăuzitoare...",
  "Traduc limbajul academic în ceva inteligibil...",
  "Se prepară o cafea virtuală pentru neuronii mei artificiali...",
  "Caut răspunsul perfect ca să te impresionez...",
  "Analizez paginile secrete din suportul de curs...",
];

const deduplicateCitations = (rawText) => {
  if (!rawText) return rawText;
  
  let sanitizedText = rawText.replace(/(\[\d+(?:,\s*\d+)*\])(?:\s*\1)+/g, "$1");
  
  sanitizedText = sanitizedText.replace(/\s+(\[\d+(?:,\s*\d+)*\])/g, " $1");
  return sanitizedText;
};

function cleanRomanianText(text) {
  if (typeof text !== 'string') return text;
  let clean = text.normalize('NFC');
  
  clean = clean.replace(/\u008e/g, 'Î');
  clean = clean.replace(/\u009e/g, 'î');
  clean = clean.replace(/\u008f/g, 'î');
  clean = clean.replace(/\u0090/g, 'Î');
  clean = clean.replace(/\u009f/g, 'î');
  clean = clean.replace(/\u00ad/g, '');
  
  clean = clean.replace(/\u00c3\u008e/g, 'Î');
  clean = clean.replace(/\u00c3\u00ae/g, 'î');
  clean = clean.replace(/\u00c3\u0082/g, 'Â');
  clean = clean.replace(/\u00c3\u00a2/g, 'â');
  clean = clean.replace(/\u00c3\u0083/g, 'Ă');
  clean = clean.replace(/\u00c3\u00a3/g, 'ă');
  clean = clean.replace(/\u00c3\u0085/g, 'Ș');
  clean = clean.replace(/\u00c3\u00ba/g, 'ș');
  clean = clean.replace(/\u00c3\u00a5/g, 'ț');
  
  clean = clean.replace(/[\u007f-\u009f]([nN][a-zA-ZăâîșțĂÂÎȘȚ])/g, (m, p1) => {
    const firstChar = p1[0];
    const isUpper = firstChar === firstChar.toUpperCase();
    return (isUpper ? 'Î' : 'î') + p1;
  });

  return clean;
}

function preprocessMarkdown(text) {
  if (!text) return "";
  let processedText = cleanRomanianText(text);

  
  processedText = processedText.replace(/<ai_vision_description[^>]*>[\s\S]*?(<\/ai_vision_description>|$)/gi, "");
  processedText = processedText.replace(/\*\*Descriere Vizuală\s*\(Generată\s*AI\):\*\*[\s\S]*?(?=(\n\s*#{1,6}|\n\s*\*\*|$))/gi, "");
  processedText = processedText.replace(/[-*#_]*\s*Start of picture text\s*[-*#_]*/gi, "");
  processedText = processedText.replace(/[-*#_]*\s*End of picture text\s*[-*#_]*/gi, "");

  
  processedText = processedText.replace(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/gi, "![Diagramă Curs]($1)");

  processedText = processedText.replace(
    /(^|[ \n(])\*([^*\n]+)\*(?=[ \n).,:;!?]|$)/g,
    "$1**$2**"
  );

  let citationCounter = 1;
  const displayMap = {};

  const citationRegex = /\[(?:SURSA\s*)?\d+(?:[\s,]*\d+)*\]/gi;
  const matches = processedText.match(citationRegex);

  if (matches) {
    matches.forEach((match) => {
      const nums = match.match(/\d+/g);
      if (nums) {
        nums.forEach((n) => {
          if (!displayMap[n]) {
            displayMap[n] = String(citationCounter++);
          }
        });
      }
    });

    processedText = processedText.replace(citationRegex, (match) => {
      const nums = match.match(/\d+/g);
      if (nums) {
        return nums
          .map((n) => `[${displayMap[n] || n}](citation-${n})`)
          .join(", ");
      }
      return match;
    });
  }

  return processedText;
}

export const ChatArea = ({
  messages,
  isTyping,
  chatInput,
  setChatInput,
  handleSendMessage,
  stopGeneration,
  citations,
  activeSources,
  focusedSourceId,
  focusedMessageId, 
  openSources,
  courseId,
  isLoadingHistory,
  openDocumentPanel,
  documents,
  isReasoningEnabled,
  setIsReasoningEnabled,
  loadMoreHistory,
  hasMore
}) => {
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const scrollRestoreRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages?.length || 0);
  const isFirstRenderRef = useRef(true);
  const { activeJobs, removeJob } = useIngestion();

  
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const stuckJob = Object.values(activeJobs || {}).find(
    (job) =>
      String(job.courseId) === String(courseId) &&
      job.status !== "COMPLETED" &&
      job.status !== "FAILED"
  );

  const isProcessing = !!stuckJob;

  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight } = e.currentTarget;
    if (scrollTop < 30 && !isLoadingHistory && hasMore && loadMoreHistory) {
      scrollRestoreRef.current = {
        prevScrollHeight: scrollHeight,
        prevScrollTop: scrollTop,
      };
      loadMoreHistory();
    }
  }, [isLoadingHistory, hasMore, loadMoreHistory]);

  useEffect(() => {
    const prevLength = prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages?.length || 0;

    if (scrollRestoreRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const diff = container.scrollHeight - scrollRestoreRef.current.prevScrollHeight;
      container.scrollTop = scrollRestoreRef.current.prevScrollTop + diff;
      scrollRestoreRef.current = null;
      return;
    }

    const hasNewMessageAtEnd = messages && messages.length > prevLength && 
      (prevLength === 0 || messages[messages.length - 1]?.id !== messages[prevLength - 1]?.id);

    if (isTyping || hasNewMessageAtEnd || isFirstRenderRef.current) {
      const behavior = isFirstRenderRef.current ? "auto" : "smooth";
      scrollToBottom(behavior);
      if (isFirstRenderRef.current && messages && messages.length > 0) {
        isFirstRenderRef.current = false;
      }
    }
  }, [messages, isTyping, scrollToBottom]);

  
  useEffect(() => {
    let interval;
    if (isTyping) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % funnyLoadingMessages.length);
      }, 3500);
    } else {
      setLoadingMsgIndex(0); 
    }
    return () => clearInterval(interval);
  }, [isTyping]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isProcessing) handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950/50 relative overflow-hidden h-full">
      {isProcessing && (
        <div className="absolute top-4 left-4 right-4 z-20 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-xl p-3 flex items-center gap-3 shadow-sm animate-in slide-in-from-top-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600 dark:text-primary-400 shrink-0" />
          <span className="text-sm font-bold text-primary-700 dark:text-primary-300">
            Asistentul AI analizează noile materiale încărcate. Chat-ul va fi
            deblocat automat la finalizare.
          </span>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pt-4 px-4 md:pt-8 md:px-8 pb-[240px] ${
          isProcessing
            ? "opacity-40 pointer-events-none pt-20 transition-all duration-300"
            : ""
        }`}
      >
        <div className="max-w-4xl mx-auto w-full flex flex-col space-y-6">
          {isLoadingHistory && (!messages || messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Se încarcă istoricul conversației...
              </p>
            </div>
          ) : (
            <>
              {isLoadingHistory && (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              )}
            {(!messages || messages.length === 0) && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto animate-in fade-in duration-500">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-slate-800 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-6">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                  Asistent Inteligent de Curs
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  Adresează întrebări punctuale despre suportul de curs, seminarii
                  sau bibliografie. Răspunsurile vor fi generate strict pe baza
                  materialelor oficiale încărcate.
                </p>
              </div>
            )}

            {(messages || []).map((msg) => {
              const isUser = msg.role === "user";
              const rawText = msg.content || msg.text || "";

              const isPlaceholder = !rawText && !isUser;
              
              const messageText = isPlaceholder
                ? funnyLoadingMessages[loadingMsgIndex]
                : rawText;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-primary-600 dark:text-primary-400 shadow-sm shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`flex-1 flex flex-col min-w-0 ${
                      isUser ? "max-w-[85%] md:max-w-[75%] items-end" : "w-full max-w-full items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-5 py-4 text-[15px] leading-relaxed ${
                        isUser
                          ? "bg-primary-600 text-white font-medium shadow-md shadow-primary-500/10 rounded-tr-none message-user-anim w-auto"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm rounded-tl-none message-ai-anim w-fit max-w-full"
                      } ${
                        isPlaceholder
                          ? "italic text-slate-400 dark:text-slate-500 select-none animate-pulse transition-all duration-500"
                          : ""
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{messageText}</p>
                      ) : isPlaceholder ? (
                        <div className="flex flex-col gap-2 py-1 px-0.5">
                          <div className="flex items-center gap-1.5 py-1">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                          </div>
                          <span className="text-slate-400 dark:text-slate-500 italic select-none text-[13px] leading-snug">
                            {messageText}
                          </span>
                        </div>
                      ) : (
                        <div className={`prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-normal ${msg.isStreaming ? "is-streaming" : ""}`}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => {
                                const childrenArray = React.Children.toArray(children);
                                const hasImage = childrenArray.some(
                                  (child) =>
                                    React.isValidElement(child) &&
                                    (child.type === "img" || (child.props && typeof child.props.src === "string"))
                                );
                                if (hasImage) {
                                  return (
                                    <div className="mb-4 last:mb-0 text-left w-full leading-relaxed">
                                      {childrenArray.map((child, idx) => {
                                        if (React.isValidElement(child) && (child.type === "img" || (child.props && typeof child.props.src === "string"))) {
                                          return (
                                            <div key={idx} className="w-full flex flex-col items-center my-2">
                                              {child}
                                            </div>
                                          );
                                        }
                                        return <React.Fragment key={idx}>{child}</React.Fragment>;
                                      })}
                                    </div>
                                  );
                                }
                                return <p className="mb-4 last:mb-0 text-left">{children}</p>;
                              },
                              a: ({ href, children }) => {
                                if (href && href.startsWith("citation-")) {
                                  const sourceId = href.replace("citation-", "");

                                  
                                  const isFocused =
                                    String(focusedSourceId) === String(sourceId) &&
                                    String(focusedMessageId) === String(msg.id);

                                  return (
                                    <span
                                      data-prevent-outside-click="true"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openSources(
                                          (msg.citations && msg.citations.length > 0) ? msg.citations : citations,
                                          sourceId,
                                          msg.id 
                                        );
                                      }}
                                      className={`inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 mx-0.5 text-[11px] font-bold rounded-full cursor-pointer select-none transition-all duration-200 ${
                                        isFocused
                                          ? "bg-primary-800 text-white ring-2 ring-primary-300 ring-offset-1 scale-105 shadow-md"
                                          : "bg-primary-600 text-white shadow-sm hover:bg-primary-500 hover:shadow-md hover:-translate-y-0.5"
                                      }`}
                                    >
                                      {children}
                                    </span>
                                  );
                                }
                                return (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {children}
                                  </a>
                                );
                              },
                              img: ({ src, alt }) => {
                                const match = src?.match(/\/graphrag_ingestion\/([a-f0-9\-]+)\/diagrams\//i);
                                const jobId = match ? match[1] : null;
                                const matchedDoc = documents?.find(doc => doc.jobId === jobId);

                                return (
                                    <div 
                                      data-prevent-outside-click="true"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (openSources) {
                                          openSources(
                                            [
                                              {
                                                id: "diagram-preview",
                                                source_file: matchedDoc?.name || "Diagramă Curs",
                                                text_extras: `![Imagine](${src})`,
                                                header: "Vizualizare Diagramă",
                                                document: matchedDoc
                                              }
                                            ],
                                            "diagram-preview",
                                            msg.id
                                          );
                                        }
                                      }}
                                    className="my-3 w-full max-w-3xl mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2 shadow-sm hover:shadow-md hover:border-primary-500/50 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition-all duration-200 group flex flex-col gap-2"
                                  >
                                    <div className="relative w-full rounded-lg overflow-hidden bg-white dark:bg-slate-950 flex items-center justify-center border border-slate-100 dark:border-slate-800/80 p-2 min-h-[150px] max-h-[520px]">
                                      <img 
                                        src={src} 
                                        alt={alt || "Diagramă Curs"} 
                                        className="max-h-[500px] w-auto max-w-full object-contain group-hover:scale-[1.01] transition-transform duration-200"
                                      />
                                      {matchedDoc && (
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                                          <FileText className="w-3.5 h-3.5 text-primary-400" /> Vezi Sursa
                                        </div>
                                      )}
                                    </div>
                                    <div className="px-1 py-0.5 flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                                      <span className="font-semibold truncate max-w-[200px]" title={matchedDoc?.name || "Diagramă"}>
                                        {matchedDoc?.name || "Diagramă extrasă"}
                                      </span>
                                      <span className="shrink-0 text-primary-600 dark:text-primary-400 font-bold group-hover:underline">
                                        Click pentru detalii
                                      </span>
                                    </div>
                                  </div>
                                );
                              },
                            }}
                          >
                            {preprocessMarkdown(
                              deduplicateCitations(messageText)
                            )}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-md pt-4 pb-6 px-4 md:px-8 z-10">
        <div className="max-w-4xl mx-auto relative flex flex-col gap-2">
          
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all flex flex-col p-1.5">
            <textarea
              className="w-full flex-1 max-h-48 min-h-[44px] pt-2 pb-1 px-4 bg-transparent border-none resize-none focus:outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-[15px] custom-scrollbar"
              placeholder={
                isProcessing
                  ? "Așteaptă finalizarea procesării noilor materiale..."
                  : "Pune o întrebare legată de cursul curent..."
              }
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={isTyping || isProcessing}
            />
            
            <div className="flex items-center justify-between px-3 pb-1.5 pt-1.5">
              <button
                onClick={() => setIsReasoningEnabled(!isReasoningEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 outline-none focus:outline-none border border-transparent ${
                  isReasoningEnabled
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                disabled={isTyping || isProcessing}
                title={isReasoningEnabled ? "Deep Reasoning Activ" : "Deep Reasoning Inactiv"}
              >
                <BrainCircuit className={`w-4 h-4 ${isReasoningEnabled ? "animate-pulse" : ""}`} />
                Deep Reasoning
              </button>

              {isTyping ? (
                <button
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 rounded-full transition-transform active:scale-95 shadow-md shrink-0 flex items-center justify-center border-none outline-none focus:outline-none"
                  onClick={() => stopGeneration && stopGeneration()}
                  title="Oprește generarea"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-md shrink-0 flex items-center justify-center border-none outline-none focus:outline-none"
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() || isProcessing}
                >
                  <ArrowUp className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
            Răspunsurile sunt generate de AI și pot conține erori. Vă rugăm să verificați informațiile cu sursele și suportul de curs.
          </p>
        </div>
      </div>
    </div>
  );
};
