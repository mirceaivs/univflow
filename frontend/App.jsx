import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LandingView } from "./views/Landing.jsx";
import { DashboardView } from "./views/Dashboard.jsx";
import { WorkspaceView } from "./views/Workspace.jsx";
import { CoursesView } from "./views/Courses.jsx";
import { GenerateTestView } from "./views/GenerateTest.jsx";
import { CreateCourseView } from "./views/CreateCourse.jsx";
import { SettingsView } from "./views/Settings.jsx";
import { NotFoundView } from "./views/NotFound.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import {
  AuthProvider,
  useAuthContext,
} from "./components/context/AuthContext.jsx";
import { QuizEvaluations } from "./views/QuizEvaluations.jsx";
import { IngestionOverlay } from "./components/IngestionOverlay.jsx"; 
import { IngestionProvider } from "./components/context/IngestionContext.jsx";
import { useNotification } from "./components/context/NotificationContext.jsx";
import { apiClient } from "./services/apiClient.js";

const THEME_STORAGE_KEY = "theme";

const getSystemPrefersDark = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const readStoredTheme = () => {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
};

const applyThemeClass = (isDark) => {
  if (typeof document === "undefined") return;
  if (isDark) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
};

function AppInner() {
  const { user, isAuthLoading: authLoading } = useAuthContext();
  const { showNotification } = useNotification();
  const [currentView, setCurrentView] = useState(() => {
    try {
      return localStorage.getItem("app_current_view") || "dashboard";
    } catch {
      return "dashboard";
    }
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [workspaceAction, setWorkspaceAction] = useState(null);
  const [navParams, setNavParams] = useState(() => {
    try {
      const saved = localStorage.getItem("app_nav_params");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [workspaceState, setWorkspaceState] = useState(() => {
    try {
      const saved = localStorage.getItem("app_workspace_state");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeQuizGenerations, setActiveQuizGenerations] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem("app_current_view", currentView);
    } catch {}
  }, [currentView]);

  useEffect(() => {
    try {
      if (navParams) {
        localStorage.setItem("app_nav_params", JSON.stringify(navParams));
      } else {
        localStorage.removeItem("app_nav_params");
      }
    } catch {}
  }, [navParams]);

  useEffect(() => {
    try {
      if (workspaceState) {
        localStorage.setItem("app_workspace_state", JSON.stringify(workspaceState));
      } else {
        localStorage.removeItem("app_workspace_state");
      }
    } catch {}
  }, [workspaceState]);

  useEffect(() => {
    if (!authLoading && !user) {
      try {
        localStorage.removeItem("app_current_view");
        localStorage.removeItem("app_workspace_state");
        localStorage.removeItem("app_nav_params");
      } catch {}
    }
  }, [user, authLoading]);

  const startQuizGeneration = useCallback(async (course, topic, difficulty, questionCount) => {
    const courseId = course.backendId ?? course.id;
    setActiveQuizGenerations((prev) => ({
      ...prev,
      [courseId]: { course, topic, difficulty, questionCount },
    }));

    try {
      showNotification({
        type: "info",
        message: `Am început generarea testului pentru cursul ${course.name}. Te vom notifica când este gata.`,
      });

      const ragRes = await apiClient.post(`/rag/quiz/${courseId}/generate`, {
        topic: topic || "conceptele principale",
        difficulty,
        numQuestions: questionCount,
        optionsPerQuestion: 4,
        allowMultipleCorrect: false,
      });

      const quizJsonString =
        typeof ragRes?.data === "string"
          ? ragRes.data
          : JSON.stringify(ragRes.data);

      const saveRes = await apiClient.post(`/quizzes/course/${courseId}`, {
        topic: topic || "conceptele principale",
        difficulty,
        contentJson: quizJsonString,
      });

      const savedQuiz = saveRes?.data ?? null;

      showNotification({
        type: "success",
        message: `Testul pentru ${course.name} a fost generat cu succes!`,
      });

      setWorkspaceAction({
        type: "START_QUIZ",
        course: course,
        from: "generate-test",
        quizId: savedQuiz?.id,
      });
      setCurrentView("workspace");
    } catch (err) {
      console.error("Eroare la generarea testului:", err);
      showNotification({
        type: "error",
        message: `Generarea testului pentru ${course.name} a eșuat. Vă rugăm să încercați din nou.`,
      });
    } finally {
      setActiveQuizGenerations((prev) => {
        const next = { ...prev };
        delete next[courseId];
        return next;
      });
    }
  }, [showNotification]);

  useEffect(() => {
    const stored = readStoredTheme();
    const isDark =
      stored === "dark" || (stored === null && getSystemPrefersDark());
    setIsDarkMode(isDark);
    applyThemeClass(isDark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      applyThemeClass(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
      } catch {}
      return next;
    });
  }, []);

  const handleStartGlobalQuiz = useCallback((data) => {
    setWorkspaceAction({
      type: "START_QUIZ",
      course: data?.course,
      from: "generate-test",
    });
    setCurrentView("workspace");
  }, []);

  const handleOpenWorkspace = useCallback((actionPayload) => {
    setWorkspaceAction(actionPayload);
    setCurrentView("workspace");
  }, []);

  const openCourseTab = useCallback((courseObj, tab = "chat") => {
    const docsCount = courseObj?.docs ?? courseObj?.documentsCount ?? 0;
    const finalTab = (tab === "chat" && docsCount === 0) ? "materials" : tab;
    if (tab === "chat" && docsCount === 0) {
      showNotification({
        type: "warning",
        message: "Acest curs nu are materiale. Încarcă mai întâi documente în secțiunea 'Materiale' pentru a putea discuta cu AI.",
      });
    }
    setWorkspaceAction({ type: "SET_COURSE", course: courseObj, tab: finalTab });
    setCurrentView("workspace");
  }, [showNotification]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingView isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
  }

  const validViews = [
    "dashboard",
    "workspace",
    "courses",
    "generate-test",
    "evaluare",
    "create-course",
    "settings",
  ];
  const safeView = validViews.includes(currentView) ? currentView : "not-found";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-primary-500/30 font-sans transition-colors duration-200">
      <Sidebar
        currentView={safeView}
        setView={setCurrentView}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        isExpanded={isSidebarExpanded}
        toggleSidebar={() => setIsSidebarExpanded((prev) => !prev)}
        openGenerateTest={() => setCurrentView("generate-test")}
        openWorkspace={() => setCurrentView("workspace")}
        openCourseTab={openCourseTab}
        workspaceState={workspaceState}
        activeQuizGenerations={activeQuizGenerations}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white dark:bg-slate-900 transition-colors duration-200 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] dark:shadow-none z-10">
        <div key={safeView} className="flex-1 flex flex-col h-full page-transition">
          {safeView === "dashboard" && (
            <DashboardView
              setView={setCurrentView}
              openCourseTab={openCourseTab}
            />
          )}

          {safeView === "courses" && (
            <CoursesView setView={setCurrentView} openCourseTab={openCourseTab} />
          )}

          {safeView === "create-course" && (
            <CreateCourseView
              setView={setCurrentView}
              openCourseTab={openCourseTab}
            />
          )}

          {safeView === "settings" && <SettingsView setView={setCurrentView} />}

          {safeView === "not-found" && (
            <NotFoundView goHome={() => setCurrentView("dashboard")} />
          )}

          {safeView === "generate-test" && (
            <GenerateTestView
              setView={setCurrentView}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              onStart={handleStartGlobalQuiz}
              navParams={navParams}
              clearNavParams={() => setNavParams(null)}
              openCourseTab={openCourseTab}
              startQuizGeneration={startQuizGeneration}
              activeQuizGenerations={activeQuizGenerations}
            />
          )}

          {safeView === "evaluare" && (
            <QuizEvaluations
              setView={setCurrentView}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              navParams={navParams}
              setNavParams={setNavParams}
              clearNavParams={() => setNavParams(null)}
              openWorkspace={handleOpenWorkspace}
            />
          )}

          {safeView === "workspace" && (
            <WorkspaceView
              setView={setCurrentView}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              workspaceAction={workspaceAction}
              clearWorkspaceAction={() => setWorkspaceAction(null)}
              setNavParams={setNavParams}
              workspaceState={workspaceState}
              setWorkspaceState={setWorkspaceState}
            />
          )}
        </div>
      </main>

      {}
      <IngestionOverlay />
    </div>
  );
}

export default function App() {
  const [viewBump, setViewBump] = useState(0);
  return (
    <AuthProvider onLogin={() => setViewBump((x) => x + 1)}>
      <IngestionProvider>
        <AppInner key={`app-inner-${viewBump}`} />
      </IngestionProvider>
    </AuthProvider>
  );
}
