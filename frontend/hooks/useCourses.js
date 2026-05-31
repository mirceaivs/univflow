import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient.js';

const DEFAULT_YEARS = ['Toate', 'Anul 1', 'Anul 2', 'Anul 3', 'Anul 4', 'Anul 5', 'Anul 6'];
const DEFAULT_SEMESTERS = ['Toate', 'Semestrul 1', 'Semestrul 2'];
const DEFAULT_SORT_OPTIONS = ['Cele mai recente', 'Alfabetic (A-Z)', 'Scor descrescător'];

const normalizeSemester = (sem) => {
  if (!sem) return sem;
  if (sem === 'Sem 1') return 'Semestrul 1';
  if (sem === 'Sem 2') return 'Semestrul 2';
  return sem;
};

const compareBySort = (sortBy) => (a, b) => {
  if (sortBy === 'Alfabetic (A-Z)') return a.name.localeCompare(b.name, 'ro');
  if (sortBy === 'Scor descrescător') return (b.score ?? 0) - (a.score ?? 0);
  return 0;
};

const toUiCourse = (dto, idx) => {
  const studyYear = dto?.studyYear;
  const semester = dto?.semester;

  const docsCount =
    typeof dto?.documentsCount === 'number'
      ? dto.documentsCount
      : typeof dto?.docsCount === 'number'
        ? dto.docsCount
        : typeof dto?.materialsCount === 'number'
          ? dto.materialsCount
          : 0;

  return {
    
    id: Number.isFinite(Number(dto?.id)) ? Number(dto.id) : idx + 1,
    backendId: dto?.id,

    name: dto?.name ?? '',
    description: dto?.description ?? '',

    year: studyYear ? `Anul ${studyYear}` : 'Anul 1',
    sem: semester ? `Semestrul ${semester}` : 'Semestrul 1',

    score: typeof dto?.progress === 'number' ? dto.progress : 0,
    docs: docsCount,
    lastAccessed: dto?.lastAccessed ?? null,
  };
};

export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedYear, setSelectedYear] = useState('Toate');
  const [selectedSem, setSelectedSem] = useState('Toate');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('Cele mai recente');

  const years = useMemo(() => DEFAULT_YEARS, []);
  const semesters = useMemo(() => DEFAULT_SEMESTERS, []);
  const sortOptions = useMemo(() => DEFAULT_SORT_OPTIONS, []);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/courses/my-courses');
      const list = Array.isArray(res?.data) ? res.data : [];
      setCourses(list.map(toUiCourse));
    } catch (e) {
      setError(e);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    const handleCoursesUpdate = () => {
      fetchCourses();
    };
    window.addEventListener('courses-updated', handleCoursesUpdate);
    return () => {
      window.removeEventListener('courses-updated', handleCoursesUpdate);
    };
  }, [fetchCourses]);

  const addCourse = useCallback((course) => {
    setCourses((prev) => {
      const nextId = prev.length === 0 ? 1 : Math.max(...prev.map((c) => Number(c.id) || 0)) + 1;
      return [{ id: nextId, ...course }, ...prev];
    });
  }, []);

  const filterCourses = useCallback(
    (list) => {
      const normalized = list.map((c) => ({ ...c, sem: normalizeSemester(c.sem) }));
      return normalized.filter((course) => {
        const yearOk = selectedYear === 'Toate' || course.year === selectedYear;
        const semOk = selectedSem === 'Toate' || course.sem === selectedSem;
        return yearOk && semOk;
      });
    },
    [selectedSem, selectedYear]
  );

  const visibleCourses = useMemo(() => {
    const filtered = filterCourses(courses);
    return [...filtered].sort(compareBySort(sortBy));
  }, [courses, filterCourses, sortBy]);

  const getScoreBgColor = useCallback((score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }, []);

  const formatScore = useCallback((score) => {
    const outOf10 = score / 10;
    return Number.isInteger(outOf10) ? outOf10 : outOf10.toFixed(1);
  }, []);

  const setYear = useCallback((year) => {
    setSelectedYear(year);
    setSelectedSem('Toate');
  }, []);

  return {
    courses,
    setCourses,
    visibleCourses,
    loading,
    error,
    refetch: fetchCourses,

    selectedYear,
    selectedSem,
    viewMode,
    sortBy,
    years,
    semesters,
    sortOptions,

    setSelectedYear: setYear,
    setSelectedSem,
    setViewMode,
    setSortBy,
    addCourse,
    filterCourses,

    getScoreBgColor,
    formatScore,
  };
};