import React, { useMemo } from 'react';
import { FileText, Plus, MoreVertical, LayoutGrid, List, Sparkles, ExternalLink, X, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui.jsx';
import { useDocuments } from '../hooks/useDocuments.js';
import { useCourses } from '../hooks/useCourses.js';
import { apiClient } from '../services/apiClient.js';

export const CourseMaterialsView = ({ setView, courseId, course }) => {
  const { courses } = useCourses();
  const [previewDocument, setPreviewDocument] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState(null);

  React.useEffect(() => {
    if (!previewDocument) {
      setPreviewUrl("");
      setIsPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    let active = true;
    setIsPreviewLoading(true);
    setPreviewError(null);

    apiClient.get(`/documents/${previewDocument.id}/preview`)
      .then(response => {
        if (active) {
          if (response.data && response.data.url) {
            setPreviewUrl(response.data.url);
          } else {
            setPreviewError("URL-ul de previzualizare lipsește.");
            setIsPreviewLoading(false);
          }
        }
      })
      .catch(err => {
        if (active) {
          console.error("Error loading preview URL:", err);
          setPreviewError("Nu s-a putut genera link-ul securizat de previzualizare.");
          setIsPreviewLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [previewDocument]);

  const selectedCourse = useMemo(() => {
    if (course && typeof course === 'object') return course;
    if (!courseId) return null;
    return (courses || []).find((c) => String(c.backendId) === String(courseId)) || null;
  }, [course, courseId, courses]);

  const { materials, loading, uploading, uploadProgress, error, uploadDocuments, deleteDocument } = useDocuments({ courseId });

  const headerSem = selectedCourse?.sem ?? null;
  const headerYear = selectedCourse?.year ?? null;
  const title = selectedCourse?.name ?? 'Curs';
  const description =
    selectedCourse?.description ?? 'Gestionarea materialelor de curs, notițelor de laborator și resurselor bibliografice.';
  const docsCount = Array.isArray(materials) ? materials.length : 0;

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-white">

      <div className="max-w-6xl mx-auto px-8 pb-8 space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex gap-2 mb-3">
              {headerSem ? <Badge variant="default" className="bg-slate-100 text-slate-600">{headerSem}</Badge> : null}
              {headerYear ? <Badge variant="default" className="bg-slate-100 text-slate-600">{headerYear}</Badge> : null}
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-3">{title}</h1>
            <p className="text-slate-500 text-lg max-w-2xl">{description}</p>
          </div>
          <Button variant="outline" className="gap-2 border-slate-200 shadow-sm" onClick={() => setView('workspace')}>
            <Sparkles className="w-4 h-4 text-primary-600" /> Generează Test
          </Button>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Materiale Încărcate{!loading && !error ? ` (${docsCount})` : ''}
            </h2>
            <div className="flex gap-2 text-slate-400">
              <button className="p-2 rounded-md bg-slate-100 text-slate-900"><LayoutGrid className="w-5 h-5" /></button>
              <button className="p-2 rounded-md hover:bg-slate-100 hover:text-slate-900"><List className="w-5 h-5" /></button>
            </div>
          </div>

          {uploading && (
            <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl flex items-center gap-3 text-primary-700 dark:text-primary-300 animate-pulse text-sm font-semibold">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              Se încarcă documentele... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Se încarcă materialele cursului...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-red-500 font-medium">Nu am putut încărca materialele cursului.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <input
                type="file"
                id="course-materials-file-upload"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={(e) => uploadDocuments(e.target.files)}
              />

              <Card
                className="p-6 flex flex-col items-center justify-center text-center h-full border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer transition-all min-h-[220px]"
                onClick={() => document.getElementById('course-materials-file-upload')?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4 shadow-sm">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Încarcă Materiale</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">PDF, DOCX, PPTX (Max 50MB)</p>
              </Card>

              {materials.map(mat => (
                <Card
                  key={mat.id}
                  className="p-5 flex flex-col h-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setPreviewDocument(mat);
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mat.type === 'pdf' ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400'}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex gap-1">
                      {mat.url && (
                        <button
                          className="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 p-1 transition-colors"
                          title="Deschide în Workspace"
                          onClick={(e) => {
                            e.stopPropagation();
                            setView('workspace');
                          }}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition-colors"
                        title="Șterge documentul"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocument(mat.id);
                        }}
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2 line-clamp-2">{mat.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{mat.date}{mat.size ? ` • ${mat.size}` : ''}</p>

                  <div className="mt-auto flex flex-wrap gap-2">
                    {(mat.tags || []).map(tag => (
                      <Badge key={tag} variant="default" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5">{tag}</Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>

      {previewDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm modal-overlay-anim" onClick={() => setPreviewDocument(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden modal-content-anim" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                {previewDocument.name}
              </h3>
              <button 
                onClick={() => setPreviewDocument(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 relative">
              {isPreviewLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Se încarcă previzualizarea securizată...
                  </p>
                </div>
              )}
              {previewError ? (
                <div className="flex flex-col items-center justify-center text-center p-6 h-full space-y-3 bg-white dark:bg-slate-900">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {previewError}
                  </p>
                </div>
              ) : (
                previewUrl && (
                  <iframe
                    src={`${previewUrl}#toolbar=0`}
                    className="w-full h-full border-0"
                    title={previewDocument.name}
                    onLoad={() => setIsPreviewLoading(false)}
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};