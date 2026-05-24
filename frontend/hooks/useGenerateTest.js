import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCourses } from './useCourses.js';
import { apiClient } from '../services/apiClient.js';
import { useNotification } from '../components/context/NotificationContext.jsx';

const YEARS = ['Toate', 'Anul 1', 'Anul 2', 'Anul 3', 'Anul 4', 'Anul 5', 'Anul 6'];
const SEMESTERS = ['Toate', 'Semestrul 1', 'Semestrul 2'];
const SORT_OPTIONS = ['Cele mai recente', 'Alfabetic (A-Z)', 'Scor descrescător'];

export function useGenerateTest({ 
  setView, 
  onStart, 
  navParams, 
  clearNavParams,
  startQuizGeneration,
  activeQuizGenerations = {}
}) {
  const { courses } = useCourses();
  const { showNotification } = useNotification();

  const [step, setStep] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectingId, setSelectingId] = useState(null);
  const [returnTo, setReturnTo] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('Toate');
  const [selectedSem, setSelectedSem] = useState('Toate');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('Cele mai recente');

  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('Mediu');

  const [questionCount, setQuestionCount] = useState(10);
  const selectedCourseId = selectedCourse?.backendId ?? selectedCourse?.id;
  const isGenerating = !!(activeQuizGenerations && selectedCourseId && activeQuizGenerations[selectedCourseId]);

  useEffect(() => {
    if (!navParams) return;

    if (navParams.course !== undefined) {
      setSelectedCourse(navParams.course);
    }
    if (navParams.step !== undefined) {
      setStep(navParams.step);
    }
    if (navParams.from !== undefined) {
      setReturnTo(navParams.from);
    } else if (navParams.step === 1) {
      setReturnTo(null);
    }
    clearNavParams();
  }, [navParams, clearNavParams]);

  const compareBySort = useCallback((sortByVal) => (a, b) => {
    if (sortByVal === 'Alfabetic (A-Z)') return a.name.localeCompare(b.name, 'ro');
    if (sortByVal === 'Scor descrescător') return (b.score ?? 0) - (a.score ?? 0);
    return 0;
  }, []);

  const filteredCourses = useMemo(() => {
    const list = courses || [];
    const filtered = list.filter((c) => {
      const matchYear = selectedYear === 'Toate' || c.year === selectedYear;
      const matchSem = selectedSem === 'Toate' || c.sem === selectedSem;
      const matchSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchYear && matchSem && matchSearch;
    });
    return [...filtered].sort(compareBySort(sortBy));
  }, [courses, selectedYear, selectedSem, searchQuery, sortBy, compareBySort]);

  const handleCourseSelect = useCallback((course) => {
    if (!course.docs || course.docs === 0) {
      showNotification({
        type: "warning",
        message: "Acest curs nu are materiale încărcate. Încarcă documente în secțiunea 'Materiale' a cursului pentru a genera teste.",
      });
      return;
    }
    setSelectingId(course.id);
    setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedCourse(course);
        setStep(2);
        setIsTransitioning(false);
        setSelectingId(null);
      }, 300);
    }, 400);
  }, [showNotification]);

  const handleBack = useCallback(() => {
    if (returnTo === 'workspace') {
      setView('workspace');
    } else if (returnTo === 'evaluare') {
      setView('evaluare');
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setStep(1);
        setSelectedCourse(null);
        setIsTransitioning(false);
      }, 300);
    }
  }, [returnTo, setView]);

  const handleGenerate = useCallback(async () => {
    if (!selectedCourse) return;
    startQuizGeneration(selectedCourse, subject, difficulty, questionCount);
  }, [selectedCourse, subject, difficulty, questionCount, startQuizGeneration]);

  const setYearAndResetSem = useCallback((year) => {
    setSelectedYear(year);
    setSelectedSem('Toate');
  }, []);

  return {
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
    years: YEARS,
    semesters: SEMESTERS,
    sortOptions: SORT_OPTIONS,
    filteredCourses,

    handleCourseSelect,
    handleBack,
    handleGenerate,
    setYearAndResetSem,
    generatedQuiz: null,
  };
}