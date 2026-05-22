import React, { useEffect, useState } from 'react';
import { Clock, Play, AlertCircle } from 'lucide-react';
import { Card, Button, Badge } from './ui.jsx';
import { apiClient } from '../services/apiClient.js';

export const UnfinishedTests = ({ onResumeQuiz }) => {
  const [pendingQuizzes, setPendingQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await apiClient.get('/quizzes/pending');
        setPendingQuizzes(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error('Failed to fetch pending quizzes', e);
        setPendingQuizzes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  if (loading) {
    return (
      <div>
        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-4">Teste Nefinalizate</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Se încarcă...</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-4">Teste Nefinalizate</h3>
      {pendingQuizzes.length === 0 ? (
        <Card className="p-4 flex gap-3 items-center">
          <AlertCircle className="w-5 h-5 text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Nu ai teste nefinalizate. Bravo!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingQuizzes.slice(0, 5).map(quiz => (
            <Card key={quiz.id} className="p-4 flex gap-4 items-start hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-yellow-400 dark:border-l-yellow-500">
              <Clock className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{quiz.topic}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{quiz.difficulty}</Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString('ro-RO') : ''}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onResumeQuiz && onResumeQuiz(quiz);
                }}
              >
                <Play className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
