import React from 'react';
import { MessageSquare, FileQuestion, Layout } from 'lucide-react';
import { FolderIcon } from '../ui.jsx';

export const CollapsedPanel = ({ setRightPanelState, backToChat, openMaterials, navigateToGenerateTest, mainContent }) => {
  return (
    <>
      <button onClick={() => setRightPanelState('studio')} className="p-2 text-slate-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Deschide Studio">
        <Layout className="w-5 h-5" />
      </button>
      
      <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
      
      <button onClick={backToChat} className={`p-2 rounded-md transition-colors ${mainContent === 'chat' ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`} title="Sesiune Chat">
        <MessageSquare className="w-5 h-5" />
      </button>
      <button onClick={navigateToGenerateTest} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" title="Generează Test">
        <FileQuestion className="w-5 h-5" />
      </button>
      <button onClick={openMaterials} className={`p-2 rounded-md transition-colors ${mainContent === 'materials' ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`} title="Gestionare Materiale">
        <FolderIcon className="w-5 h-5" />
      </button>
    </>
  );
};
