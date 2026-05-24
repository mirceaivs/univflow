import React, { useMemo } from "react";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  GraduationCap,
  Moon,
  Sun,
  Menu,
  Plus,
  Sparkles,
  ClipboardList,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui.jsx";
import { useCourses } from "../hooks/useCourses.js";
import { useAuthContext } from "./context/AuthContext.jsx";
import { useIngestion } from "./context/IngestionContext.jsx"; 

export const Sidebar = ({
  currentView,
  setView,
  isDarkMode,
  toggleTheme,
  isExpanded,
  toggleSidebar,
  openGenerateTest,
  openWorkspace,
  openCourseTab,
  workspaceState,
  activeQuizGenerations = {},
}) => {
  const isWorkspaceQuiz = currentView === "workspace" && workspaceState?.tab === "quiz";
  const quizOrigin = isWorkspaceQuiz ? workspaceState?.returnTo : null;

  const isCoursesActive =
    currentView === "courses" ||
    (currentView === "workspace" &&
      (!isWorkspaceQuiz || (quizOrigin !== "evaluare" && quizOrigin !== "generate-test")));
  const { courses } = useCourses();
  const { user, logout } = useAuthContext();

  
  const { activeJobs } = useIngestion();
  const isProcessing = Object.values(activeJobs || {}).some(
    (job) => job.status !== "COMPLETED" && job.status !== "FAILED"
  );

  const activeCourseId = workspaceState?.courseBackendId || (Array.isArray(courses) && courses.length > 0 ? courses[0]?.backendId : null);

  const displayName = useMemo(() => {
    const full = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
    return full || user?.email || "Cont";
  }, [user]);

  const navItems = [
    { id: "dashboard", label: "Acasă", icon: LayoutDashboard },
    { id: "generate-test", label: "Generează test", icon: Sparkles },
    { id: "evaluare", label: "Evaluare Teste", icon: ClipboardList },
    { id: "courses", label: "Cursurile mele", icon: BookOpen },
  ];

  return (
    <aside
      className={`bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out shrink-0 relative ${
        isExpanded ? "w-64" : "w-20"
      }`}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div
          className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${
            isExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white truncate">
            Univ
            <span className="text-primary-600 dark:text-primary-400">Flow</span>
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors mx-auto lg:mx-0"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="mb-4">
          <p
            className={`px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 transition-all duration-300 ${
              isExpanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden mb-0"
            }`}
          >
            Meniu Principal
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.id === "courses"
                ? isCoursesActive
                : currentView === item.id || (isWorkspaceQuiz && quizOrigin === item.id);

            return (
              <div key={item.id} className="w-full flex flex-col">
                <button
                  onClick={() => setView(item.id)}
                  className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200 dark:border-slate-800"
                      : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent"
                  } ${isExpanded ? "justify-start" : "justify-center"}`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    } ${isExpanded ? "mr-3" : ""}`}
                  />
                  {isExpanded && (
                    <>
                      <span className="flex-1 text-left font-medium">
                        {item.label}
                      </span>
                      {item.id === "courses" && isProcessing && (
                        <Loader2 className="w-4 h-4 animate-spin text-primary-500 ml-2 shrink-0" />
                      )}
                    </>
                  )}
                </button>

                {}
                {item.id === "courses" &&
                  isActive &&
                  isExpanded &&
                  Array.isArray(courses) &&
                  courses.length > 0 && (
                    <div className="ml-8 mt-1 mb-3 space-y-0.5 overflow-y-auto max-h-[40vh] custom-scrollbar pr-1 dropdown-enter">
                      {courses.map((course) => {
                        const isCourseQuizGenerating = !!activeQuizGenerations[course.backendId];
                        const isCourseProcessing = isCourseQuizGenerating || Object.values(activeJobs || {}).some(
                          (job) => String(job.courseId) === String(course.backendId) && job.status !== "COMPLETED" && job.status !== "FAILED"
                        );
                        const isCourseActive = currentView === "workspace" && String(course.backendId) === String(activeCourseId);
                        return (
                          <button
                            key={course.id}
                            disabled={isCourseProcessing}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCourseProcessing) {
                                e.preventDefault();
                                return;
                              }
                              if (typeof openCourseTab === "function") {
                                openCourseTab(course, "chat");
                              } else {
                                setView("workspace");
                              }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed ${
                              isCourseProcessing
                                ? "text-slate-500 dark:text-slate-400"
                                : isCourseActive
                                ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30"
                                : "text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                            }`}
                            title={course.name}
                          >
                            <span className="truncate pr-2">{course.name}</span>
                            {isCourseProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500 shrink-0" />
                            ) : (
                              <ChevronRight className={`w-3.5 h-3.5 text-primary-500 shrink-0 transition-all ${isCourseActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950">
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          title={isDarkMode ? "Mod Luminos" : "Mod Întunecat"}
        >
          {isDarkMode ? (
            <Sun className={`w-5 h-5 ${isExpanded ? "mr-3" : ""}`} />
          ) : (
            <Moon className={`w-5 h-5 ${isExpanded ? "mr-3" : ""}`} />
          )}
          {isExpanded && (
            <span className="font-medium">
              {isDarkMode ? "Mod Luminos" : "Mod Întunecat"}
            </span>
          )}
        </button>

        <button
          onClick={logout}
          className={`w-full flex items-center p-2 mt-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${
            isExpanded ? "justify-start" : "justify-center"
          }`}
          title="Deconectare"
        >
          <LogOut className={`w-5 h-5 ${isExpanded ? "mr-3" : ""}`} />
          {isExpanded && <span className="font-medium">Deconectare</span>}
        </button>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setView("settings")}
            className={`w-full flex items-center transition-all duration-300 ease-in-out rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 p-2 -mx-2 ${
              isExpanded ? "justify-start" : "justify-center"
            }`}
            title="Setări cont"
          >
            <img
              src={
                user?.profilePic ||
                user?.avatarUrl ||
                "https://picsum.photos/100/100"
              }
              alt="User"
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
            />
            <div
              className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out text-left ${
                isExpanded
                  ? "max-w-[150px] opacity-100 ml-3"
                  : "max-w-0 opacity-0 ml-0"
              }`}
            >
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {displayName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Student
              </p>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};
