import React, { useMemo, useRef } from 'react';
import { MessageSquare, FolderOpen, Sparkles, Upload, FileText } from 'lucide-react';
import { Button, Card } from '../ui.jsx';
import { useDocuments } from '../../hooks/useDocuments.js';
import { useNotification } from '../context/NotificationContext.jsx';

export const StudioPanel = ({ mainContent, setMainContent, navigateToGenerateTest, courseId, docsHook, openDocumentPanel }) => {
  const { showNotification } = useNotification();
  const fileInputRef = useRef(null);
  const { materials, uploadDocuments, uploading, uploadProgress, loading } = docsHook || useDocuments({ courseId });

  const canUseCourse = Boolean(courseId);

  const getCardClasses = (isActive) => {
    const base =
      'cursor-pointer transition-all duration-200 border rounded-xl p-4 flex items-center gap-4 shadow-sm';
    const active =
      'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800';
    const inactive =
      'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50';
    return `${base} ${isActive ? active : inactive}`;
  };

  const getIconContainerClasses = (isActive) => {
    const base = 'w-10 h-10 rounded-lg flex items-center justify-center shrink-0';
    const active = 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400';
    const inactive = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
    return `${base} ${isActive ? active : inactive}`;
  };

  const handleFileChange = async (e) => {
    const files = e?.target?.files;
    if (!files || files.length === 0) return;
    try {
      await uploadDocuments(files);
    } finally {
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const savedTitle = useMemo(() => {
    return uploading ? `Se încarcă… ${uploadProgress}%` : 'Resurse Salvate';
  }, [uploadProgress, uploading]);

  return (
    <div className="flex flex-col h-full space-y-8">
      {}
      <div className="space-y-3">
        <Card
          className={getCardClasses(mainContent === 'chat')}
          onClick={() => {
            if (!materials || materials.length === 0) {
              showNotification({
                type: "warning",
                message: "Acest curs nu are materiale. Încarcă documente în secțiunea 'Materiale' înainte de a discuta cu AI.",
              });
            } else {
              setMainContent('chat');
            }
          }}
          role="button"
        >
          <div className={getIconContainerClasses(mainContent === 'chat')}>
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 dark:text-slate-100">Conversație AI</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Pune întrebări și primești răspunsuri din materiale
            </div>
          </div>
        </Card>

        <Card
          className={getCardClasses(mainContent === 'materials')}
          onClick={() => setMainContent('materials')}
          role="button"
        >
          <div className={getIconContainerClasses(mainContent === 'materials')}>
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 dark:text-slate-100">Materiale</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Încarcă / șterge / gestionează documentele cursului
            </div>
          </div>
        </Card>

        <Card
          className={getCardClasses(mainContent === 'quiz')}
          onClick={navigateToGenerateTest}
          role="button"
        >
          <div className={getIconContainerClasses(mainContent === 'quiz')}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 dark:text-slate-100">Generează Test</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Creează un test din curs și începe evaluarea
            </div>
          </div>
        </Card>
      </div>

      {}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          {savedTitle}
        </h3>

        <div className="space-y-1">
          {loading ? (
            <div className="flex items-center gap-2 py-3 px-1 text-slate-400 dark:text-slate-500">
              <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Se încarcă resursele...</span>
            </div>
          ) : (
            <>
              {(!materials || materials.length === 0) && !uploading && (
                <p className="text-xs text-slate-400 italic">Nu există documente încă.</p>
              )}

              {(materials || []).map((mat) => (
                <div
                  key={mat.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 group transition-colors cursor-pointer"
                  title={mat.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    openDocumentPanel && openDocumentPanel({ id: mat.id, url: mat.url, name: mat.name });
                  }}
                >
                  <FileText className={`w-4 h-4 ${mat.type === 'pdf' ? 'text-red-500 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'}`} />
                  <span className="text-sm text-left text-slate-700 dark:text-slate-300 truncate flex-1 group-hover:text-slate-900 dark:group-hover:text-slate-100 font-medium group-hover:underline">
                    {mat.name}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx"
          onChange={handleFileChange}
        />

        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !canUseCourse}
          className="w-full mt-4 gap-2 border-dashed border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30"
        >
          <Upload className={`w-4 h-4 ${uploading ? 'animate-bounce' : ''}`} />
          {uploading ? `Se încarcă... ${uploadProgress}%` : 'Încarcă Material Nou'}
        </Button>

        {!canUseCourse && (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Selectează un curs ca să poți încărca materiale.
          </div>
        )}
      </div>
    </div>
  );
};