import React, { useRef, useCallback, useEffect, useState } from "react";
import { Sparkles, ArrowUp, Loader2, X } from "lucide-react";
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

function preprocessMarkdown(text) {
  if (!text) return "";
  let processedText = text;

  // Eliminăm descrierile vizuale (să nu fie afișate nici în chat-ul text, ele existând doar pentru contextul AI-ului)
  processedText = processedText.replace(/\*\*Descriere Vizuală \(Generată AI\):\*\*.*?(?=(\n\n|$))/gi, "");
  processedText = processedText.replace(/<ai_vision_description>[\s\S]*?<\/ai_vision_description>/gi, "");

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
  citations,
  activeSources,
  focusedSourceId,
  focusedMessageId, 
  openSources,
  courseId,
  isLoadingHistory,
}) => {
  const messagesEndRef = useRef(null);
  const { activeJobs, removeJob } = useIngestion();

  
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const stuckJob = Object.values(activeJobs || {}).find(
    (job) =>
      String(job.courseId) === String(courseId) &&
      job.status !== "COMPLETED" &&
      job.status !== "FAILED"
  );

  const isProcessing = !!stuckJob;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
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
        className={`flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-6 ${
          isProcessing
            ? "opacity-40 pointer-events-none pt-20 transition-all duration-300"
            : ""
        }`}
      >
        {isLoadingHistory ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Se încarcă istoricul conversației...
            </p>
          </div>
        ) : (
          <>
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
                    className={`max-w-[85%] md:max-w-[75%] flex flex-col ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                        isUser
                          ? "bg-primary-600 text-white font-medium shadow-md shadow-primary-500/10 rounded-tr-none message-user-anim"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm rounded-tl-none message-ai-anim"
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
                              a: ({ href, children }) => {
                                if (href && href.startsWith("citation-")) {
                                  const sourceId = href.replace("citation-", "");

                                  
                                  const isFocused =
                                    String(focusedSourceId) === String(sourceId) &&
                                    String(focusedMessageId) === String(msg.id);

                                  return (
                                    <span
                                      onClick={() =>
                                        openSources(
                                          msg.citations || citations,
                                          sourceId,
                                          msg.id 
                                        )
                                      }
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
        <div ref={messagesEndRef} />
      </div>

      <div className="pb-6 px-4 md:px-8">
        <div className="max-w-3xl mx-auto relative">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all flex items-end gap-2 p-2">
            <textarea
              className="w-full max-h-32 min-h-[44px] py-2 px-3 bg-transparent border-none resize-none focus:outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-[15px]"
              placeholder={
                isProcessing
                  ? "Așteaptă finalizarea procesării noilor materiale..."
                  : "Pune o întrebare legată de cursul curent..."
              }
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isTyping || isProcessing}
            />
            <button
              className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-sm shrink-0 mb-1 mr-1"
              onClick={() => handleSendMessage()}
              disabled={!chatInput.trim() || isTyping || isProcessing}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
            Răspunsurile sunt construite contextual. Verificați sursele atașate
            pentru conformitate.
          </p>
        </div>
      </div>
    </div>
  );
};
