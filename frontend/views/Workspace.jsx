import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  PanelRightClose,
  PanelRightOpen,
  ArrowLeft,
  MessageSquare,
  Layout,
} from "lucide-react";
import { ChatArea } from "../components/workspace/ChatArea.jsx";
import { QuizArea } from "../components/workspace/QuizArea.jsx";
import { MaterialsArea } from "../components/workspace/MaterialsArea.jsx";
import { StudioPanel } from "../components/workspace/StudioPanel.jsx";
import { SourcesPanel } from "../components/workspace/SourcesPanel.jsx";
import { DocumentPanel } from "../components/workspace/DocumentPanel.jsx";
import { CollapsedPanel } from "../components/workspace/CollapsedPanel.jsx";
import { useWorkspace } from "../hooks/useWorkspace.js";
import { useChat } from "../hooks/useChat.js";
import { useQuiz } from "../hooks/useQuiz.js";
import { useDocuments } from "../hooks/useDocuments.js";
import { useNotification } from "../components/context/NotificationContext.jsx";

export const WorkspaceView = ({
  setView,
  workspaceAction,
  clearWorkspaceAction,
  setNavParams,
  workspaceState,
  setWorkspaceState,
}) => {
  const { showNotification } = useNotification();
  const workspace = useWorkspace({
    setView,
    workspaceAction,
    clearWorkspaceAction,
    setNavParams,
    workspaceState,
    setWorkspaceState,
  });

  const backendCourseId = useMemo(() => {
    return workspace.course?.backendId ?? workspace.course?.id ?? "";
  }, [workspace.course]);

  const courseName = workspace.course?.name ?? "Curs";

  const chat = useChat({ courseId: backendCourseId });
  
  const quiz = useQuiz({
    quizResetKey: workspace.quizKey,
    courseId: backendCourseId,
    quizId: workspace.activeQuizId, 
  });

  const docsHook = useDocuments({ courseId: backendCourseId });
  const courseDocuments = docsHook?.materials || [];

  const {
    mainContent,
    setMainContent,
    rightPanelState,
    setRightPanelState,
    quizKey,
    backToChat,
    navigateToGenerateTest,
    openSources,
    openMaterials,
    activeSources,
    focusedSourceId,
    handleBackFromQuiz, 
  } = workspace;

  const hasLoadedDocs = docsHook?.hasLoaded || false;
  const isCorrectCourseLoaded = docsHook?.loadedCourseId === backendCourseId;

  useEffect(() => {
    if (hasLoadedDocs && isCorrectCourseLoaded && mainContent === "chat" && courseDocuments.length === 0) {
      showNotification({
        type: "warning",
        message: "Acest curs nu are materiale. Încarcă mai întâi documente în secțiunea 'Materiale' pentru a putea discuta cu AI.",
      });
      setMainContent("materials");
    }
  }, [hasLoadedDocs, isCorrectCourseLoaded, mainContent, courseDocuments.length, setMainContent, showNotification]);

  const handleNavigateToGenerateTest = useCallback(() => {
    if (courseDocuments.length === 0) {
      showNotification({
        type: "warning",
        message: "Acest curs nu are materiale. Încarcă mai întâi documente în secțiunea 'Materiale' a cursului pentru a genera un test.",
      });
      return;
    }
    navigateToGenerateTest();
  }, [courseDocuments.length, navigateToGenerateTest, showNotification]);

  
  const rightPanelRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rightPanelState !== "sources" && rightPanelState !== "document") {
        return;
      }
      if (rightPanelRef.current && rightPanelRef.current.contains(event.target)) {
        return;
      }
      setRightPanelState("studio");
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [rightPanelState, setRightPanelState]);

  const [sourcesPanelWidth, setSourcesPanelWidth] = useState(() => {
    const saved = localStorage.getItem("rag_sources_panel_width");
    if (saved) return parseInt(saved);
    return Math.max(400, Math.min(850, Math.round(window.innerWidth * 0.35)));
  });
  const [studioPanelWidth, setStudioPanelWidth] = useState(() => {
    return parseInt(localStorage.getItem("rag_studio_panel_width")) || 380;
  });

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const isSources = rightPanelState === "sources";
      const startWidth = isSources ? sourcesPanelWidth : studioPanelWidth;

      const onMouseMove = (moveEvent) => {
        const delta = startX - moveEvent.clientX; 
        let newWidth = startWidth + delta;

        if (newWidth < 300) newWidth = 300;
        if (newWidth > 900) newWidth = 900;

        if (isSources) {
          setSourcesPanelWidth(newWidth);
        } else {
          setStudioPanelWidth(newWidth);
        }
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        if (isSources) {
          setSourcesPanelWidth((finalWidth) => {
            localStorage.setItem("rag_sources_panel_width", finalWidth);
            return finalWidth;
          });
        } else {
          setStudioPanelWidth((finalWidth) => {
            localStorage.setItem("rag_studio_panel_width", finalWidth);
            return finalWidth;
          });
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [rightPanelState, sourcesPanelWidth, studioPanelWidth]
  );

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-200">
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-900">
          {mainContent !== "materials" && (
            <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shrink-0 z-10">
              <div className="flex items-center gap-3">
                {mainContent === "quiz" ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBackFromQuiz}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-primary-400 transition-all font-medium text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Înapoi
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">
                      /
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 font-medium text-sm truncate max-w-[200px]">
                      {courseName}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">
                      /
                    </span>
                    <span className="bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                      Test
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
                    <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    {courseName}
                  </div>
                )}
              </div>
              <div />
            </header>
          )}

          <div key={mainContent} className="flex-1 flex flex-col min-h-0 page-transition">
            {mainContent === "quiz" && (
              <QuizArea
                key={quizKey}
                navigateToGenerateTest={handleNavigateToGenerateTest}
                backToChat={backToChat}
                quiz={quiz}
              />
            )}

            {mainContent === "materials" && (
              <MaterialsArea
                navigateToGenerateTest={handleNavigateToGenerateTest}
                navigateToChat={backToChat}
                courseId={backendCourseId}
                course={workspace.course}
                docsHook={docsHook}
              />
            )}

            {mainContent === "chat" && (
              <ChatArea
                messages={chat.messages}
                isTyping={chat.isTyping}
                chatInput={chat.chatInput}
                setChatInput={chat.setChatInput}
                handleSendMessage={chat.handleSendMessage}
                stopGeneration={chat.stopGeneration}
                citations={chat.citations}
                activeSources={workspace.activeSources}
                focusedSourceId={workspace.focusedSourceId}
                focusedMessageId={workspace.focusedMessageId} 
                openSources={workspace.openSources}
                courseId={backendCourseId}
                isLoadingHistory={workspace.loadingCourses || chat.isLoadingHistory}
                openDocumentPanel={workspace.openDocumentPanel}
                documents={courseDocuments}
                isReasoningEnabled={chat.isReasoningEnabled}
                setIsReasoningEnabled={chat.setIsReasoningEnabled}
              />
            )}
          </div>
        </div>

        <div ref={rightPanelRef} className="flex h-full shrink-0 z-10">
          {}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col relative bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 ${
              rightPanelState === "sources"
                ? "border-l opacity-100"
                : "border-l-0 opacity-0"
            }`}
            style={{
              width: rightPanelState === "sources" ? `${sourcesPanelWidth}px` : "0px",
            }}
          >
            {rightPanelState === "sources" && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary-500/50 active:bg-primary-500 z-50 transition-colors"
                onMouseDown={handleMouseDown}
              />
            )}
            <div className="flex flex-col h-full w-full">
              <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-5 bg-white dark:bg-slate-900 shrink-0">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-base truncate pr-4">
                  Surse din curs
                </span>
                <button
                  onClick={() => setRightPanelState("closed")}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <PanelRightClose className="w-5 h-5" />
                </button>
              </div>
              <div
                id="sources-scroll-container"
                className="p-5 overflow-y-auto custom-scrollbar flex-1"
              >
                <SourcesPanel
                  setRightPanelState={setRightPanelState}
                  sources={activeSources}
                  documents={courseDocuments}
                  focusedSourceId={focusedSourceId}
                  openDocumentPanel={workspace.openDocumentPanel}
                />
              </div>
            </div>
          </div>

          {}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col relative bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 ${
              rightPanelState === "studio"
                ? "border-l opacity-100"
                : "border-l-0 opacity-0"
            }`}
            style={{
              width: rightPanelState === "studio" ? `${studioPanelWidth}px` : "0px",
            }}
          >
            {rightPanelState === "studio" && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary-500/50 active:bg-primary-500 z-50 transition-colors"
                onMouseDown={handleMouseDown}
              />
            )}
            <div className="flex flex-col h-full w-full">
              <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-5 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                  <Layout className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-base truncate pr-4">
                    Studio
                  </span>
                </div>
                <button
                  onClick={() => setRightPanelState("closed")}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <PanelRightClose className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                <StudioPanel
                  mainContent={mainContent}
                  setMainContent={setMainContent}
                  navigateToGenerateTest={handleNavigateToGenerateTest}
                  courseId={backendCourseId}
                  docsHook={docsHook}
                  openDocumentPanel={workspace.openDocumentPanel}
                />
              </div>
            </div>
          </div>

          {}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col relative bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 ${
              rightPanelState === "document"
                ? "border-l opacity-100"
                : "border-l-0 opacity-0"
            }`}
            style={{
              width: rightPanelState === "document" ? `${sourcesPanelWidth}px` : "0px",
            }}
          >
            {rightPanelState === "document" && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary-500/50 active:bg-primary-500 z-50 transition-colors"
                onMouseDown={handleMouseDown}
              />
            )}
            <div className="flex flex-col h-full w-full">
              <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-5 bg-white dark:bg-slate-900 shrink-0">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-base truncate pr-4">
                  {workspace.activeDocument?.name || "Document"}
                </span>
                <button
                  onClick={() => setRightPanelState("closed")}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <PanelRightClose className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                <DocumentPanel activeDocument={workspace.activeDocument} />
              </div>
            </div>
          </div>

          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 ${
              rightPanelState === "closed"
                ? "w-14 border-l opacity-100"
                : "w-0 border-l-0 opacity-0"
            }`}
          >
            <div className="w-14 flex flex-col h-full items-center">
              <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center w-full bg-white dark:bg-slate-900 shrink-0">
                <button
                  onClick={() => setRightPanelState("studio")}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Deschide Studio"
                >
                  <PanelRightOpen className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col items-center py-4 gap-4 w-full">
                <CollapsedPanel
                  setRightPanelState={setRightPanelState}
                  backToChat={backToChat}
                  openMaterials={openMaterials}
                  navigateToGenerateTest={handleNavigateToGenerateTest}
                  mainContent={mainContent}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
