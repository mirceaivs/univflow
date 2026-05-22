import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Plus, Upload, Loader2, CheckCircle2, FileText, X } from 'lucide-react';
import { Card, Button, Input } from '../components/ui.jsx';
import { apiClient } from '../services/apiClient.js';
import { useIngestion } from '../components/context/IngestionContext.jsx';
import { useNotification } from '../components/context/NotificationContext.jsx';

export const CreateCourseView = ({ setView, isDarkMode, toggleTheme }) => {
  const [courseName, setCourseName] = useState('');
  const [selectedYear, setSelectedYear] = useState('Anul 1');
  const [selectedSem, setSelectedSem] = useState('Semestrul 1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const years = ['Anul 1', 'Anul 2', 'Anul 3', 'Anul 4', 'Anul 5', 'Anul 6'];
  const semesters = ['Semestrul 1', 'Semestrul 2'];

  const { addJob } = useIngestion();
  const { showNotification } = useNotification();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => ({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        fileObj: file
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    setIsSubmitting(true);
    setIsUploading(false);
    setUploadProgress(0);

    try {
      const studyYear = parseInt(selectedYear.replace(/\D/g, '')) || 1;
      const semester = parseInt(selectedSem.replace(/\D/g, '')) || 1;
      
      const courseResponse = await apiClient.post('/courses/create', {
        name: courseName.trim(),
        studyYear: studyYear,
        semester: semester,
        description: ""
      });
      
      const newCourse = courseResponse.data;
      const backendId = newCourse?.id || newCourse?.backendId;

      if (files.length > 0 && backendId) {
        setIsUploading(true);
        const formData = new FormData();
        files.forEach(f => {
          if(f.fileObj) formData.append("files", f.fileObj);
        });
        
        try {
          const uploadResponse = await apiClient.post(`/courses/${backendId}/documents`, formData, {
            onUploadProgress: (evt) => {
              if (!evt || !evt.total) return;
              const pct = Math.round((evt.loaded * 100) / evt.total);
              setUploadProgress(pct);
            }
          });
          const data = uploadResponse.data;
          
          if (data && data.jobs && Array.isArray(data.jobs) && addJob) {
            data.jobs.forEach(job => {
              const jId = job.job_id || job.jobId || job.id;
              const fName = job.filename || job.fileName || "Document";
              if (jId) {
                addJob(jId, backendId, [{ name: fName }]);
              }
            });
          }
        } catch (uploadErr) {
          console.error("Eroare la încărcarea documentelor:", uploadErr);
          showNotification({
            type: "warning",
            message: "Cursul a fost creat cu succes, dar documentele nu au putut fi încărcate. Le poți adăuga ulterior.",
          });
        }
      }

      setIsSuccess(true);
      window.dispatchEvent(new CustomEvent('courses-updated'));
      setTimeout(() => {
        setView('courses');
      }, 1500);

    } catch (err) {
      console.error("Eroare la crearea cursului:", err);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200 flex flex-col">
      
      <div className="flex-1 flex flex-col items-center py-12 px-4 sm:px-8">
        <div className="w-full max-w-3xl">
          
          {}
          <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mb-6 shadow-sm">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
              Creează un Curs Nou
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400">
              Adaugă detaliile cursului și încarcă materialele inițiale pentru a începe.
            </p>
          </div>

          {}
          <div className="relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
            
            <button 
              onClick={() => setView('courses')} 
              className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mb-6"
              disabled={isSubmitting || isSuccess}
            >
              <ArrowLeft className="w-4 h-4" /> Înapoi la cursuri
            </button>

            <Card className="p-6 sm:p-10 shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative overflow-hidden">
              
              {isSuccess ? (
                <div className="py-16 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">Curs Creat cu Succes!</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-lg">Te redirecționăm către lista de cursuri...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  
                  {}
                  <div className="space-y-3">
                    <label className="text-base font-bold text-slate-900 dark:text-slate-100">Numele Cursului <span className="text-red-500">*</span></label>
                    <Input 
                      placeholder="Ex: Arhitecturi Hardware, Analiză Matematică..." 
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      className="h-14 text-lg bg-slate-50 dark:bg-slate-950"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-base font-bold text-slate-900 dark:text-slate-100">Anul de Studiu</label>
                      <div className="grid grid-cols-3 gap-2">
                        {years.map(year => (
                          <button 
                            key={year}
                            type="button"
                            disabled={isSubmitting}
                            className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                              selectedYear === year 
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 ring-1 ring-primary-600 dark:ring-primary-500 shadow-sm' 
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            onClick={() => setSelectedYear(year)}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-base font-bold text-slate-900 dark:text-slate-100">Semestrul</label>
                      <div className="grid grid-cols-2 gap-2">
                        {semesters.map(sem => (
                          <button 
                            key={sem}
                            type="button"
                            disabled={isSubmitting}
                            className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                              selectedSem === sem 
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 ring-1 ring-primary-600 dark:ring-primary-500 shadow-sm' 
                                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            onClick={() => setSelectedSem(sem)}
                          >
                            {sem}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {}
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-end">
                      <label className="text-base font-bold text-slate-900 dark:text-slate-100">Materiale Inițiale <span className="text-slate-400 dark:text-slate-500 font-normal text-sm">(Opțional)</span></label>
                    </div>
                    
                    <div 
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-primary-400 dark:hover:border-primary-500 transition-all cursor-pointer group"
                      onClick={() => !isSubmitting && document.getElementById('course-file-upload')?.click()}
                    >
                      <input 
                        type="file" 
                        id="course-file-upload" 
                        className="hidden" 
                        multiple 
                        accept=".pdf,.doc,.docx,.ppt,.pptx" 
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                      />
                      <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Apasă pentru a încărca fișiere</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Suportă PDF, DOCX, PPTX (Max 50MB per fișier)</p>
                    </div>

                    {}
                    {files.length > 0 && (
                      <div className="mt-4 space-y-2 animate-in fade-in duration-300">
                        {files.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
                              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{file.size}</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                              disabled={isSubmitting}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {}
                  <div className="pt-6">
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full gap-3 text-xl h-16 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:-translate-y-1 transition-all disabled:hover:translate-y-0"
                      disabled={isSubmitting || !courseName.trim()}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          {isUploading 
                            ? `Se încarcă documentele... ${uploadProgress}%` 
                            : 'Se creează cursul...'}
                        </>
                      ) : (
                        <><Plus className="w-6 h-6"/> Creează Cursul</>
                      )}
                    </Button>
                  </div>

                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};