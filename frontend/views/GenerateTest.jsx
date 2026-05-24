import React from "react";
import {
  Search,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Book,
  Bookmark,
  Briefcase,
  Compass,
  FileText,
  Folder,
  GraduationCap,
  Library,
  Microscope,
  CheckCircle2,
  Loader2,
  Plus,
  LayoutGrid,
  List,
  ListFilter,
} from "lucide-react";
import { Card, Button, Input, CustomSelect } from "../components/ui.jsx";
import { CourseCard } from "../components/CourseCard.jsx";
import { useGenerateTest } from "../hooks/useGenerateTest.js";

const genericIcons = [
  Book,
  BookOpen,
  Bookmark,
  Briefcase,
  Compass,
  FileText,
  Folder,
  GraduationCap,
  Library,
  Microscope,
];

export const GenerateTestView = ({
  setView,
  isDarkMode,
  toggleTheme,
  onStart,
  navParams,
  clearNavParams,
  startQuizGeneration,
  activeQuizGenerations,
}) => {
  const gt = useGenerateTest({
    setView,
    onStart,
    navParams,
    clearNavParams,
    startQuizGeneration,
    activeQuizGenerations,
  });

  const {
    step,
    selectedCourse,
    isTransitioning,
    selectingId,
    returnTo,
    searchQuery,
    setSearchQuery,
    selectedYear,
    selectedSem,
    setSelectedSem,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    subject,
    setSubject,
    difficulty,
    setDifficulty,
    questionCount,
    setQuestionCount,
    isGenerating,
    years,
    semesters,
    sortOptions,
    filteredCourses,
    handleCourseSelect,
    handleBack,
    handleGenerate,
    setYearAndResetSem,
  } = gt;

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8 p-8">
        {}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-500">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {step === 1 ? "Generează Test" : "Configurează Testul"}
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              {step === 1
                ? "Alege o materie pentru a începe generarea."
                : `Setează detaliile testului pentru ${selectedCourse?.name}`}
            </p>
          </div>
        </header>

        <div className="relative min-h-[600px] overflow-hidden -m-2 p-2">
          {}
          <div
            className={`absolute inset-2 transition-all duration-500 ease-in-out ${
              step === 1
                ? "translate-x-0 opacity-100 relative"
                : "-translate-x-full opacity-0 pointer-events-none"
            } ${
              isTransitioning && step === 1 ? "scale-95 opacity-0" : "scale-100"
            }`}
          >
            {}
            <div className="max-w-2xl mb-6">
              <Input
                icon={Search}
                placeholder="Caută materia..."
                className="h-12 text-base rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {}
            <div className="flex flex-col space-y-4 mb-8">
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
                          setYearAndResetSem(year);
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

            {}
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "flex flex-col gap-4"
              }
            >
              {filteredCourses.map((course) => {
                const isSelecting = selectingId === course.id;
                const hasNoDocs = !course.docs || course.docs === 0;

                return (
                  <div
                    key={course.id}
                    onClick={() => handleCourseSelect(course)}
                    className={`transition-all duration-300 ${
                      hasNoDocs
                        ? "opacity-60 grayscale"
                        : isSelecting
                        ? "scale-95 opacity-50 ring-2 ring-primary-500 rounded-2xl cursor-pointer"
                        : "hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    }`}
                  >
                    <CourseCard
                      course={course}
                      variant={viewMode}
                      actionText={hasNoDocs ? "Adaugă Materiale" : "Selectează Curs"}
                      onClick={(e) => {
                        if (hasNoDocs) {
                          e.stopPropagation();
                          openCourseTab(course, "materials");
                        }
                      }}
                    />
                  </div>
                );
              })}

              {filteredCourses.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Nu am găsit materii
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Încearcă alte filtre sau adaugă un curs nou.
                  </p>
                </div>
              )}
            </div>
          </div>

          {}
          <div
            className={`absolute inset-2 transition-all duration-500 ease-in-out ${
              step === 2
                ? "translate-x-0 opacity-100 relative"
                : "translate-x-full opacity-0 pointer-events-none"
            } ${
              isTransitioning && step === 2
                ? "scale-105 opacity-0"
                : "scale-100"
            }`}
          >
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-6 -ml-4 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              disabled={isGenerating}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {returnTo
                ? returnTo === "evaluare"
                  ? "Înapoi la Evaluare Teste"
                  : "Înapoi la Spațiu de Lucru"
                : "Înapoi la alegerea materiei"}
            </Button>

            {selectedCourse && (
              <div className="grid lg:grid-cols-3 gap-8">
                {}
                <div className="lg:col-span-1 space-y-6">
                  <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center mb-6">
                      {React.createElement(
                        genericIcons[
                          selectedCourse.name?.length % genericIcons.length || 0
                        ],
                        { className: "w-6 h-6 text-primary-600 dark:text-primary-400" }
                      )}
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">
                      {selectedCourse.name}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 line-clamp-3">
                      {selectedCourse.description ||
                        "Acest curs nu are o descriere detaliată, dar sistemul va genera un test pe baza materialelor încărcate."}
                    </p>
                    <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">An Studiu</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {selectedCourse.year || "Nespecificat"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Semestru</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {selectedCourse.sem || "Nespecificat"}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" /> Ce
                      urmează?
                    </h3>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                        AI-ul va analiza toate documentele salvate în acest
                        curs.
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                        Întrebările vor respecta nivelul de dificultate ales.
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                        Testul se va axa pe subiectul introdus în formular.
                      </li>
                    </ul>
                  </Card>
                </div>

                {}
                <Card className="lg:col-span-2 p-8 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-8">
                  {}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      Subiectul Testului
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-colors"
                      placeholder="Ex: Rezumă capitolele 3 și 4, sau axează-te pe noțiunile de bază..."
                      rows={3}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={isGenerating}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">
                      Lasă liber pentru o testare generală din tot cursul.
                    </p>
                  </div>

                  {}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Nivel de dificultate
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {["Ușor", "Mediu", "Avansat"].map((level) => (
                        <button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          disabled={isGenerating}
                          className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                            difficulty === level
                              ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Număr de întrebări
                      </label>
                      <span className="text-lg font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-4 py-1.5 rounded-lg border border-primary-100 dark:border-primary-800">
                        {questionCount}
                      </span>
                    </div>
                    <div className="relative pt-2 pb-6">
                      <input
                        type="range"
                        min="5"
                        max="25"
                        step="5"
                        value={questionCount}
                        onChange={(e) =>
                          setQuestionCount(parseInt(e.target.value))
                        }
                        disabled={isGenerating}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600 dark:accent-primary-500 disabled:opacity-50"
                      />
                      <div className="absolute w-full flex justify-between text-xs text-slate-400 font-medium px-1 mt-2">
                        <span>5</span>
                        <span>10</span>
                        <span>15</span>
                        <span>20</span>
                        <span>25</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      onClick={handleGenerate}
                      size="lg"
                      className="w-full gap-3 text-xl h-16 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:-translate-y-1 transition-all disabled:hover:translate-y-0"
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" /> Se
                          generează...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" /> Generează Testul Acum
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
