import React from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { Card, Button } from './ui.jsx';

export const AiRecommendation = ({ courses, loading, onGenerateTest, onOpenCourse }) => {
  if (loading || !courses || courses.length === 0) return null;

  
  const totalDocs = courses.reduce((sum, c) => sum + (c.docs || 0), 0);

  
  const testedCourses = courses.filter(c => c.score > 0);

  
  const weakestCourse = testedCourses.length > 0
    ? testedCourses.reduce((min, c) => c.score < min.score ? c : min)
    : null;

  
  const lastCourse = courses
    .filter(c => c.lastAccessed)
    .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))[0] || courses[0];

  const hasWeakCourse = weakestCourse && weakestCourse.score < 50; 
  const displayScore = weakestCourse ? (weakestCourse.score / 10).toFixed(1) : '0';

  
  if (totalDocs === 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-900/20 border-indigo-100 dark:border-indigo-800/50 shadow-md shadow-indigo-100/50 dark:shadow-none relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-2xl"></div>
        <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400 relative z-10">
          <FileText className="w-5 h-5 animate-pulse" />
          <h3 className="font-bold">Recomandare AI</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-2 relative z-10">
          Nu ai încărcat niciun material de curs!
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5 relative z-10">
          Adaugă documente PDF la cursurile tale pentru ca asistentul AI să poată genera teste și recomandări de studiu personalizate.
        </p>
      </Card>
    );
  }

  
  if (testedCourses.length === 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-900/20 border-indigo-100 dark:border-indigo-800/50 shadow-md shadow-indigo-100/50 dark:shadow-none relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-2xl"></div>
        <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400 relative z-10">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <h3 className="font-bold">Recomandare AI</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-5 relative z-10">
          Ești pregătit pentru prima evaluare? Generează primul tău test din materialele de la materia 
          {' '}<strong>{lastCourse?.name || 'ultimul curs'}</strong>{' '}
          pentru a-ți evalua cunoștințele.
        </p>
        <Button
          size="sm"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm relative z-10 border-none"
          onClick={() => onGenerateTest && onGenerateTest()}
        >
          Generează Primul Test
        </Button>
      </Card>
    );
  }

  
  return (
    <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-900/20 border-indigo-100 dark:border-indigo-800/50 shadow-md shadow-indigo-100/50 dark:shadow-none relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-2xl"></div>
      <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400 relative z-10">
        <Sparkles className="w-5 h-5 animate-pulse" />
        <h3 className="font-bold">Recomandare AI</h3>
      </div>

      {hasWeakCourse ? (
        <>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-5 relative z-10">
            Scorul tău la <strong>{weakestCourse.name}</strong> este de <strong>{displayScore}</strong>.
            Îți sugerez să folosești asistentul AI pentru a recapitula conceptele neclare și să generezi un test nou de dificultate ușoară.
          </p>
          <Button
            size="sm"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm relative z-10 border-none"
            onClick={() => onGenerateTest && onGenerateTest()}
          >
            Generează Test
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-5 relative z-10">
            Rezultate excelente! Ești la zi cu materia. Generează un test recapitulativ din
            {' '}<strong>{lastCourse?.name || 'ultimul curs'}</strong>{' '}
            pentru a-ți menține cunoștințele proaspete.
          </p>
          <Button
            size="sm"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm relative z-10 border-none"
            onClick={() => onGenerateTest && onGenerateTest()}
          >
            Generează Test Recapitulativ
          </Button>
        </>
      )}
    </Card>
  );
};
