import React from 'react';
import { 
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
  ArrowRight, 
  ArrowUpRight,
  Trash2
} from 'lucide-react';
import { Card, Badge, Progress, Button } from './ui.jsx';

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
  Microscope
];

export const CourseCard = ({ course, variant = 'grid', onClick, actionText = "Deschide Curs", onDelete }) => {
  
  const IconComponent = genericIcons[course.id % genericIcons.length];

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-500';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-500';
    return 'text-red-600 dark:text-red-500';
  };

  const formatScore = (score) => {
    const outOf10 = score / 10;
    return Number.isInteger(outOf10) ? outOf10 : outOf10.toFixed(1);
  };

  if (variant === 'dashboard') {
    return (
      <Card className="p-6 flex flex-col h-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-out border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <IconComponent className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight line-clamp-2">{course.name}</h3>
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="w-full space-y-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Rezultate Teste</span>
              <span className={`font-bold ${getScoreTextColor(course.score)}`}>
                {formatScore(course.score)}/10
              </span>
            </div>
            <Progress value={course.score} indicatorClassName={getScoreBgColor(course.score)} className="h-1.5" />
          </div>
          <Button variant="ghost" className="w-full gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={onClick}>
            <ArrowUpRight className="w-4 h-4" /> {actionText === "Deschide Curs" ? "Deschide Studio" : actionText}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-5 sm:p-6 flex hover:shadow-md transition-shadow ${variant === 'grid' ? 'flex-col h-full' : 'flex-col sm:flex-row sm:items-center gap-4 sm:gap-6'}`}>
      <div className={`flex justify-between items-start ${variant === 'grid' ? 'mb-4' : 'shrink-0'}`}>
        <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
          <IconComponent className="w-6 h-6" />
        </div>
        {variant === 'grid' && (
          <div className="flex items-center gap-2">
            <Badge variant="default" className="font-medium">{course.year}, {course.sem}</Badge>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="p-1.5 h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(course.backendId, e);
                }}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
      </div>
      
      <div className={variant === 'list' ? 'flex-1 flex flex-col justify-center' : ''}>
        <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 leading-tight mb-2">{course.name}</h3>
        <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-sm">
          <span className="flex items-center gap-1"><Folder className="w-4 h-4" /> {course.docs} materiale</span>
          {variant === 'list' && <Badge variant="default" className="font-medium">{course.year}, {course.sem}</Badge>}
        </div>
      </div>
      
      <div className={variant === 'grid' ? 'mt-auto pt-6 space-y-4 border-t border-slate-100 dark:border-slate-800' : 'w-full sm:w-64 shrink-0 flex flex-col justify-center gap-3 sm:border-l border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-4 sm:pt-0 pl-0 sm:pl-6'}>
        <div className="w-full space-y-1.5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">Rezultate Teste</span>
            <span className={`font-bold ${getScoreTextColor(course.score)}`}>{formatScore(course.score)}/10</span>
          </div>
          <Progress value={course.score} indicatorClassName={getScoreBgColor(course.score)} className="h-1.5" />
        </div>
        
        <div className="flex items-center gap-2 w-full">
          <Button variant="ghost" className="flex-1 gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={onClick}>
            <ArrowUpRight className="w-4 h-4" /> {actionText}
          </Button>
          {variant === 'list' && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="p-1.5 h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(course.backendId, e);
              }}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
