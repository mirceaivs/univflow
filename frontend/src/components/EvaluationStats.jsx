import React, { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, CheckCircle } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { getEvaluationStats } from '../api';

export const EvaluationStats = () => {
  const [stats, setStats] = useState({ totalCompleted: '—', averageScore: '—', successRate: '—' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getEvaluationStats();
        setStats({
          totalCompleted: data.totalCompleted,
          averageScore: data.averageScore.toFixed(1),
          successRate: `${data.successRate.toFixed(1)}%`
        });
      } catch (e) {
        console.error('Failed to fetch stats', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const icons = {
    totalCompleted: BarChart2,
    averageScore: TrendingUp,
    successRate: CheckCircle
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatsCard icon={icons.totalCompleted} title="Teste Finalizate" value={loading ? '—' : stats.totalCompleted} />
      <StatsCard icon={icons.averageScore} title="Media Generală" value={loading ? '—' : stats.averageScore} />
      <StatsCard icon={icons.successRate} title="Rata de Succes" value={loading ? '—' : stats.successRate} />
    </div>
  );
};
