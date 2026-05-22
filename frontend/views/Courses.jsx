import React, { useMemo, useState } from "react";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  BookOpen,
  ListFilter,
  Trash2,
} from "lucide-react";
import { Card, Input, CustomSelect, Dialog, Button } from "../components/ui.jsx";
import { CourseCard } from "../components/CourseCard.jsx";
import { useCourses } from "../hooks/useCourses.js";
import { apiClient } from "../services/apiClient.js";

export const CoursesView = ({ setView, openCourseTab }) => {
  const {
    visibleCourses,
    loading,
    error,
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
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCourses = useMemo(() => {
    return (visibleCourses || []).filter((c) =>
      (c?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [visibleCourses, searchQuery]);

  const handleDeleteCourseClick = (courseId, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    setCourseToDelete(courseId);
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/courses/${courseToDelete}`);
      window.dispatchEvent(new CustomEvent("courses-updated"));
      setCourseToDelete(null);
    } catch (err) {
      console.error("Eroare la ștergerea cursului:", err);
      alert("Nu s-a putut șterge cursul. Vă rugăm să încercați din nou.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8 p-8">
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Cursurile mele
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Gestionează și accesează rapid cursurile la care ești înscris.
          </p>
        </header>

        <div className="max-w-2xl">
          <Input
            icon={Search}
            placeholder="Caută în cursurile tale..."
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
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Se încarcă cursurile...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "flex flex-col gap-4"
            }
          >
            <Card
              className={`p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer transition-all ${
                viewMode === "grid" ? "h-full min-h-[280px]" : "py-8"
              }`}
              onClick={() => setView("create-course")}
            >
              <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-sm">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">
                Adaugă un Curs Nou
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
                Înscrie-te la un curs nou folosind codul primit de la profesor.
              </p>
            </Card>

            {filteredCourses.map((course) => (
              <div
                key={course.id || course.backendId}
                onClick={() => openCourseTab(course, "materials")} 
                className="cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <CourseCard
                  course={course}
                  variant={viewMode}
                  onDelete={handleDeleteCourseClick}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        title="Confirmare ștergere curs"
      >
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Ești sigur că vrei să ștergi acest curs? Toate materialele și testele asociate vor fi șterse definitiv.
        </p>
        <div className="flex justify-end gap-3 mt-6 pt-4 pb-1 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={() => setCourseToDelete(null)} disabled={isDeleting}>
            Anulare
          </Button>
          <Button variant="danger" onClick={confirmDeleteCourse} disabled={isDeleting} className="gap-2">
            <Trash2 className="w-4 h-4" /> Șterge Cursul
          </Button>
        </div>
      </Dialog>
    </div>
  );
};
