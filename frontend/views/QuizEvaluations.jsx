import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  LayoutGrid,
  List,
  Timer,
  Play,
  Eye,
  Trash2,
  BookOpen,
  ListFilter,
  ClipboardList,
} from "lucide-react";
import { useCourses } from "../hooks/useCourses.js";
import { apiClient } from "../services/apiClient.js";
import { CourseCard } from "../components/CourseCard.jsx";
import { Card, Button, Badge, Input, CustomSelect } from "../components/ui.jsx";
import { useNotification } from "../components/context/NotificationContext.jsx";

export const QuizEvaluations = ({
  setView,
  navParams,
  setNavParams,
  clearNavParams,
  openWorkspace,
}) => {
  const { showNotification } = useNotification();
  
  const initialCourseId =
    navParams?.courseId ||
    navParams?.course?.backendId ||
    navParams?.course?.id ||
    null;
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);

  const {
    visibleCourses,
    courses,
    loading,
    selectedYear,
    selectedSem,
    viewMode,
    sortBy,
    years,
    semesters,
    sortOptions,
    setSelectedYear,
    setSelectedSem,
    setViewMode,
    setSortBy,
  } = useCourses();

  const [searchQuery, setSearchQuery] = useState("");
  const [history, setHistory] = useState([]);
  const [pendingQuizzes, setPendingQuizzes] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const filteredCourses = useMemo(() => {
    return (visibleCourses || []).filter((c) =>
      (c?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [visibleCourses, searchQuery]);

  
  const currentCourse = useMemo(() => {
    if (!selectedCourseId || !courses) return null;
    return courses.find(
      (c) =>
        String(c.id) === String(selectedCourseId) ||
        String(c.backendId) === String(selectedCourseId)
    );
  }, [courses, selectedCourseId]);

  const fetchCourseData = useCallback(async (actualBackendId) => {
    setLoadingHistory(true);
    try {
      const [historyRes, pendingRes] = await Promise.all([
        apiClient.get(`/quizzes/history`),
        apiClient.get(`/quizzes/pending`),
      ]);

      setHistory(
        (historyRes.data || []).filter(
          (attempt) => String(attempt.courseId) === String(actualBackendId)
        )
      );
      setPendingQuizzes(
        (pendingRes.data || []).filter(
          (quiz) => String(quiz.courseId) === String(actualBackendId)
        )
      );
    } catch (error) {
      console.error("Eroare la preluarea datelor testelor:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (currentCourse) {
      fetchCourseData(currentCourse.backendId || currentCourse.id);
    }
  }, [currentCourse, fetchCourseData]);

  
  const displayProgress = useMemo(() => {
    if (history && history.length > 0) {
      const totalScore = history.reduce(
        (sum, attempt) => sum + (attempt.score || 0),
        0
      );
      return Math.round(totalScore / history.length);
    }
    return currentCourse?.progress || 0;
  }, [history, currentCourse]);

  const handleBackToCourses = () => {
    setSelectedCourseId(null);
    if (typeof clearNavParams === "function") {
      clearNavParams();
    }
  };

  const handleGoToGenerate = useCallback(() => {
    if (setNavParams && setView && currentCourse) {
      const docsCount = currentCourse.docs ?? currentCourse.documentsCount ?? 0;
      if (docsCount === 0) {
        showNotification({
          type: "warning",
          message: "Acest curs nu are materiale încărcate. Încarcă mai întâi documente în secțiunea 'Materiale' a cursului pentru a genera teste.",
        });
        return;
      }
      setNavParams({
        course: currentCourse,
        step: 2,
        from: "evaluare",
      });
      setView("generate-test");
    }
  }, [currentCourse, setNavParams, setView, showNotification]);

  const handleResumeTest = useCallback(
    (quizId) => {
      if (openWorkspace && currentCourse) {
        openWorkspace({
          type: "START_QUIZ",
          course: currentCourse,
          quizId: quizId,
          from: "evaluare",
        });
      } else {
        setView("workspace");
      }
    },
    [openWorkspace, currentCourse, setView]
  );

  const handleDeleteTest = async (quizId, e) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/quizzes/${quizId}`);
      localStorage.removeItem(`quiz_session_${quizId}`);
      fetchCourseData(currentCourse.backendId || currentCourse.id);
    } catch (err) {
      console.error("Eroare la ștergere:", err);
    }
  };

  
  
  
  if (!selectedCourseId) {
    return (
      <div className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="max-w-6xl mx-auto space-y-8 p-8 animate-in fade-in duration-500">
          <header>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Evaluare Teste
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Selectează un curs pentru a revizui progresul și istoricul
              testelor tale.
            </p>
          </header>

          <div className="max-w-2xl">
            <Input
              icon={Search}
              placeholder="Caută în cursurile evaluate..."
              className="h-12 text-base rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center flex-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm">
                {years.map((year, idx) => (
                  <React.Fragment key={year}>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        selectedYear === year
                          ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 ring-1 ring-primary-600 dark:ring-primary-500 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                      onClick={() => {
                        setSelectedYear(year);
                        setSelectedSem("Toate");
                      }}
                    >
                      {year}
                    </button>
                    {idx < years.length - 1 && (
                      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <CustomSelect
                  options={sortOptions}
                  value={sortBy}
                  onChange={setSortBy}
                  icon={ListFilter}
                  className="w-56"
                />

                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-sm transition-colors">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "grid"
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === "list"
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {selectedYear !== "Toate" && (
              <div className="flex items-center flex-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm w-fit animate-in fade-in slide-in-from-top-2">
                {semesters.map((sem, idx) => (
                  <React.Fragment key={sem}>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        selectedSem === sem
                          ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 ring-1 ring-primary-600 dark:ring-primary-500 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                      onClick={() => setSelectedSem(sem)}
                    >
                      {sem}
                    </button>
                    {idx < semesters.length - 1 && (
                      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "flex flex-col gap-4"
              }
            >
              {filteredCourses.map((course) => (
                <div
                  key={course.id || course.backendId}
                  onClick={() => setSelectedCourseId(course.id)}
                  className="cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CourseCard course={course} variant={viewMode} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  
  
  
  return (
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            onClick={handleBackToCourses}
            className="-ml-4 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Înapoi la evaluări
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate max-w-md">
              {currentCourse?.name || "Curs"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Progres Mediu
            </span>
            <span
              className={`text-2xl font-black ${
                displayProgress >= 80
                  ? "text-green-500"
                  : displayProgress >= 50
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}
            >
              {displayProgress}%
            </span>
          </div>
          <Button
            onClick={handleGoToGenerate}
            className="gap-2 shadow-lg shadow-primary-500/20 h-12 px-6"
          >
            <Sparkles className="w-4 h-4" /> Test Nou
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8 space-y-12 animate-in fade-in duration-500">
        {loadingHistory ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {pendingQuizzes.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Timer className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Teste în Desfășurare
                  </h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingQuizzes.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="p-5 flex flex-col justify-between bg-white dark:bg-slate-900 border-l-4 border-l-yellow-400 dark:border-slate-800 hover:shadow-md transition-shadow group"
                    >
                      <div className="mb-6">
                        <div className="flex justify-between items-start">
                          <Badge variant="warning" className="mb-3">
                            {quiz.difficulty || "Mediu"}
                          </Badge>
                          <button
                            onClick={(e) => handleDeleteTest(quiz.id, e)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Șterge test"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg line-clamp-2 leading-tight">
                          {quiz.topic || "Test Grilă"}
                        </h3>
                        <p className="text-sm text-slate-500 mt-2 font-medium">
                          Creat la:{" "}
                          {quiz.createdAt
                            ? new Date(quiz.createdAt).toLocaleDateString(
                                "ro-RO"
                              )
                            : "Data necunoscută"}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleResumeTest(quiz.id)}
                        className="w-full gap-2 bg-slate-100 hover:bg-yellow-50 text-slate-700 hover:text-yellow-700 border-none shadow-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-400 font-bold h-11"
                      >
                        <Play className="w-4 h-4" /> Continuă Testul
                      </Button>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Istoric Evaluări
                </h2>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <ClipboardList className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Nu ai finalizat niciun test la această materie încă.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {history.map((attempt) => (
                    <Card
                      key={attempt.attemptId}
                      className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary-300 transition-colors group gap-4"
                    >
                      <div className="flex items-center gap-5 w-full md:w-auto">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                            attempt.score >= 80
                              ? "bg-green-50 text-green-600 dark:bg-green-900/20"
                              : attempt.score >= 50
                              ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20"
                              : "bg-red-50 text-red-600 dark:bg-red-900/20"
                          }`}
                        >
                          <span className="text-xl font-black">
                            {attempt.score}%
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-primary-600 transition-colors line-clamp-1">
                            {attempt.topic || "Test Grilă"}
                          </h3>
                          <p className="text-sm text-slate-500 font-medium">
                            Susținut pe:{" "}
                            {attempt.completedAt
                              ? new Date(
                                  attempt.completedAt
                                ).toLocaleDateString("ro-RO")
                              : "Data necunoscută"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button
                          onClick={(e) => handleDeleteTest(attempt.quizId, e)}
                          className="text-slate-400 hover:text-red-500 p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Șterge test definitiv"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <Button
                          variant="outline"
                          className="gap-2 shrink-0 h-11 px-5"
                          onClick={() => handleResumeTest(attempt.quizId)}
                        >
                          <Eye className="w-4 h-4" /> Revizuiește
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};
