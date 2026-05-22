import React, { useEffect, useState } from 'react';
import { Folder, BarChart2, TrendingUp, CheckCircle, Plus, Play, FileQuestion, Sparkles, MessageSquare } from 'lucide-react';
import { Card, Button, Progress } from '../components/ui.jsx';
import { CourseCard } from '../components/CourseCard.jsx';
import { AiRecommendation } from '../components/AiRecommendation.jsx';
import { UnfinishedTests } from '../components/UnfinishedTests.jsx';
import { useCourses } from '../hooks/useCourses.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import { apiClient } from '../services/apiClient.js';

export const DashboardView = ({ setView, openCourseTab }) => {
  const { courses, loading, error, formatScore } = useCourses();
  const { userFullName, email: profileEmail, isLoading: isProfileLoading } = useUserProfile();

  
  const [stats, setStats] = useState({ totalCompleted: 0, averageScore: 0, successRate: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/evaluations/stats');
        setStats(res.data);
      } catch (e) {
        console.error('Failed to fetch evaluation stats', e);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  
  const displayName = userFullName || profileEmail || '';

  
  const lastCourse = !loading && !error && courses?.length
    ? courses
        .filter(c => c.lastAccessed)
        .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))[0] || courses[0]
    : null;

  const handleNewConversation = async () => {
    if (!lastCourse) return;
    try {
      
      await apiClient.put(`/courses/${lastCourse.backendId}/touch`);
      
      openCourseTab(lastCourse, 'chat');
    } catch (e) {
      console.error('Failed to start conversation', e);
      
      openCourseTab(lastCourse, 'chat');
    }
  };

  const handleResumeQuiz = (quiz) => {
    
    const course = courses.find(c => c.backendId === quiz.courseId);
    if (course) {
      openCourseTab(course, 'quiz');
    }
  };



  return (
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8 p-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Salutare, {displayName}. Iată rezumatul activității tale.
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            O privire de ansamblu asupra progresului tău academic de astăzi.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Teste Finalizate</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {statsLoading ? '—' : stats.totalCompleted}
              </p>
            </div>
          </Card>

          <Card className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Media Generală</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {statsLoading ? '—' : (typeof stats.averageScore === 'number' ? stats.averageScore.toFixed(1) : '0.0')}
              </p>
            </div>
          </Card>

          <Card className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rata de Succes</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {statsLoading ? '—' : (typeof stats.successRate === 'number' ? `${stats.successRate.toFixed(1)}%` : '0.0%')}
              </p>
            </div>
          </Card>
        </div>

        {}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-sm flex flex-wrap gap-2 items-center w-fit">
          <Button
            variant="ghost"
            className="gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setView('create-course')}
          >
            <Plus className="w-4 h-4" /> Creează un curs nou
          </Button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-2"></div>

          <Button
            variant="ghost"
            className="gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setView('generate-test')}
          >
            <FileQuestion className="w-4 h-4" /> Generează un test
          </Button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-2"></div>

          <Button
            variant="ghost"
            className="gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={handleNewConversation}
            disabled={!lastCourse}
            title={lastCourse ? `Deschide chat pentru: ${lastCourse.name}` : 'Niciun curs accesat'}
          >
            <MessageSquare className="w-4 h-4" /> Deschide Ultimul Curs
          </Button>
        </div>

        {}
        <div className="flex flex-col lg:flex-row gap-8">
          {}
          <div className="flex-[7] space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Materiile Mele</h2>

            {loading && (
              <div className="text-slate-500 dark:text-slate-400">Se încarcă cursurile...</div>
            )}

            {!loading && error && (
              <div className="text-slate-500 dark:text-slate-400">Nu am putut încărca cursurile.</div>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.slice(0, 4).map(course => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    variant="dashboard"
                    onClick={() => openCourseTab(course, 'materials')}
                  />
                ))}
              </div>
            )}
          </div>

          {}
          <div className="flex-[3] space-y-6">
            {}
            <AiRecommendation
              courses={courses}
              loading={loading}
              onGenerateTest={() => setView('generate-test')}
              onOpenCourse={(course) => openCourseTab(course, 'chat')}
            />

            {}
            <UnfinishedTests onResumeQuiz={handleResumeQuiz} />
          </div>
        </div>

      </div>
    </div>
  );
};