import React, { useMemo } from 'react';
import { FileText, Plus, MoreVertical, LayoutGrid, List, Sparkles } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui.jsx';
import { useDocuments } from '../hooks/useDocuments.js';
import { useCourses } from '../hooks/useCourses.js';

export const CourseMaterialsView = ({ setView, courseId, course }) => {
  const { courses } = useCourses();

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

          {loading && <div className="text-slate-500">Se încarcă materialele...</div>}
          {!loading && error && <div className="text-slate-500">Nu am putut încărca materialele.</div>}
          {uploading && uploadProgress > 0 && <div className="text-slate-500">Încărcare... {uploadProgress}%</div>}

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
              className="p-6 flex flex-col items-center justify-center text-center h-full border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-primary-400 cursor-pointer transition-all min-h-[220px]"
              onClick={() => document.getElementById('course-materials-file-upload')?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-primary-600 mb-4 shadow-sm">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">Încarcă Materiale</h3>
              <p className="text-xs text-slate-500">PDF, DOCX, PPTX (Max 50MB)</p>
            </Card>

            {(!loading && !error) && materials.map(mat => (
              <Card
                key={mat.id}
                className="p-5 flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setView('workspace')}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mat.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <button
                    className="text-slate-400 hover:text-slate-600 p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument(mat.id);
                    }}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 leading-tight mb-2 line-clamp-2">{mat.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{mat.date}{mat.size ? ` • ${mat.size}` : ''}</p>

                <div className="mt-auto flex flex-wrap gap-2">
                  {(mat.tags || []).map(tag => (
                    <Badge key={tag} variant="default" className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5">{tag}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};