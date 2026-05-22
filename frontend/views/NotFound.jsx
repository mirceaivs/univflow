import React from 'react';
import { GraduationCap, Home, FileQuestion, Moon, Sun } from 'lucide-react';
import { Button } from '../components/ui.jsx';

export const NotFoundView = ({ setView, isDarkMode, toggleTheme }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      {}
      <header className="px-8 py-4 flex justify-between items-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => setView('landing')}
          title="Înapoi la pagina principală"
        >
          <div className="bg-primary-50 dark:bg-primary-900/30 p-1.5 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
            <GraduationCap className="w-6 h-6 text-primary-600 dark:text-primary-500" />
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-slate-100 tracking-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            UnivFlow
          </span>
        </div>
        <button 
          onClick={toggleTheme} 
          className="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          title={isDarkMode ? "Comută la modul luminos" : "Comută la modul întunecat"}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500 ease-out">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary-200 dark:bg-primary-900/50 blur-3xl rounded-full opacity-50 animate-pulse"></div>
          <div className="relative w-28 h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-primary-600 dark:text-primary-400 rounded-[2rem] flex items-center justify-center shadow-xl rotate-3 hover:rotate-0 transition-transform duration-300">
            <FileQuestion className="w-14 h-14" />
          </div>
        </div>
        
        <h1 className="text-7xl md:text-9xl font-extrabold text-slate-900 dark:text-slate-100 mb-4 tracking-tighter">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">
          Pagina nu a fost găsită
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-10 text-lg leading-relaxed">
          Ne pare rău, dar pagina pe care o cauți nu există, a fost mutată sau a apărut o eroare neașteptată în sistem.
        </p>
        
        <Button 
          size="lg" 
          className="gap-3 h-14 px-8 text-lg shadow-lg shadow-primary-500/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300" 
          onClick={() => setView('landing')}
        >
          <Home className="w-5 h-5" /> Înapoi la Acasă
        </Button>
      </main>
    </div>
  );
};
