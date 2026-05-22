import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';

export const StatsCard = ({ icon: Icon, title, value }) => (
  <div className="p-6 flex items-center gap-4 bg-white/5 backdrop-blur-lg rounded-xl shadow-sm border border-white/10 hover:shadow-md transition-shadow">
    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-100 dark:text-slate-50">{value}</p>
    </div>
  </div>
);
