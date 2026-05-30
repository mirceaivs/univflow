import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Card, Badge } from './ui.jsx';

export const MaterialCard = ({ material, viewMode = 'grid', onClick, onDelete }) => {
  return (
    <Card className={`p-5 flex hover:shadow-md transition-shadow cursor-pointer ${viewMode === 'grid' ? 'flex-col h-full' : 'flex-row items-center gap-6'}`} onClick={onClick}>
      <div className={`flex justify-between items-start ${viewMode === 'grid' ? 'mb-4' : 'shrink-0'}`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${material.type === 'pdf' ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400'}`}>
          <FileText className="w-5 h-5" />
        </div>
        {viewMode === 'grid' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(material.id); }} 
            className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-2 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" 
            title="Șterge material"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className={viewMode === 'list' ? 'flex-1 flex flex-col justify-center' : ''}>
        <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2 line-clamp-2">{material.name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{material.date} • {material.size}</p>
      </div>
      
      <div className={`mt-auto flex flex-wrap gap-2 ${viewMode === 'list' ? 'shrink-0 items-center' : ''}`}>
        {material.tags.map(tag => (
          <Badge key={tag} variant="default" className="text-[10px] px-2 py-0.5">{tag}</Badge>
        ))}
        {viewMode === 'list' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(material.id); }} 
            className="ml-4 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-2 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" 
            title="Șterge material"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </Card>
  );
};
