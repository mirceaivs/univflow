import React, { useMemo, useState } from "react";
import {
  LayoutGrid,
  List,
  Plus,
  Sparkles,
  MessageSquare,
  Book,
  BookOpen,
  Bookmark,
  Briefcase,
  Compass,
  FileText,
  Folder,
  GraduationCap,
  Library,
  Microscope,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { Card, Badge, Button } from "../ui.jsx";
import { MaterialCard } from "../MaterialCard.jsx";
import { useDocuments } from "../../hooks/useDocuments.js";
import { apiClient } from "../../services/apiClient.js";
import { useIngestion } from "../context/IngestionContext.jsx"; 

const genericIcons = [
  Book,
  BookOpen,
  Bookmark,
  Briefcase,
  Compass,
  FileText,
  Folder,
  GraduationCap,
  Library,
  Microscope,
];

export const MaterialsArea = ({
  navigateToGenerateTest,
  navigateToChat,
  courseId,
  course,
  docsHook,
}) => {
  const [viewMode, setViewMode] = useState("grid");
  const [previewDocument, setPreviewDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

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

  const { materials, loading, error, deleteDocument } = docsHook || useDocuments({
    courseId,
  });

  const { activeJobs, addJob } = useIngestion(); 
  const [localUploading, setLocalUploading] = useState(false);

  
  const isProcessing = Object.values(activeJobs || {}).some(
    (job) =>
      String(job.courseId) === String(courseId) &&
      job.status !== "COMPLETED" &&
      job.status !== "FAILED"
  );

  const prevProcessingRef = React.useRef(isProcessing);
  React.useEffect(() => {
    if (prevProcessingRef.current && !isProcessing) {
      if (docsHook?.fetchDocuments) {
        docsHook.fetchDocuments();
      }
    }
    prevProcessingRef.current = isProcessing;
  }, [isProcessing, docsHook]);

  
  const isUploadDisabled = localUploading || isProcessing;

  const IconComponent = useMemo(() => {
    const numericId = Number(course?.id);
    if (!Number.isFinite(numericId)) return null;
    return genericIcons[numericId % genericIcons.length];
  }, [course]);

  const headerSem = course?.sem ?? null;
  const headerYear = course?.year ?? null;
  const title = course?.name ?? "Curs";
  const description =
    course?.description ??
    "Aici poți gestiona toate fișierele și resursele asociate cu acest curs.";

  const handleUpload = async (files) => {
    setLocalUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const response = await apiClient.post(
        `/courses/${courseId}/documents`,
        formData
      );
      const data = response.data;

      
      if (data && data.jobs && Array.isArray(data.jobs)) {
        data.jobs.forEach((job) => {
          const jId = job.job_id || job.jobId || job.id;
          const fName = job.filename || job.fileName || "Document";
          if (jId) {
            addJob(jId, courseId, [{ name: fName }]);
          }
        });
      } else {
        
        const fallbackId = data?.job_id || data?.jobId;
        if (fallbackId) {
          addJob(
            fallbackId,
            courseId,
            Array.from(files).map((f) => ({ name: f.name }))
          );
        }
      }
    } catch (err) {
      console.error("Eroare la upload:", err);
    } finally {
      setLocalUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 h-full overflow-hidden relative">
      <header className="px-8 py-8 shrink-0 relative overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] dark:opacity-[0.02] pointer-events-none">
          <Folder className="w-64 h-64 text-primary-900" />
        </div>
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl flex items-center justify-center shadow-sm">
                {IconComponent ? (
                  <IconComponent className="w-7 h-7" />
                ) : (
                  <BookOpen className="w-7 h-7" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {title}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge
                    variant="outline"
                    className="text-slate-500 font-medium"
                  >
                    Anul {headerYear || "N/A"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-slate-500 font-medium"
                  >
                    Semestrul {headerSem || "N/A"}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              className="gap-2 bg-white dark:bg-slate-900 border-slate-200 shadow-sm"
              onClick={navigateToChat}
            >
              <MessageSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />{" "}
              Către Chat AI
            </Button>
            <Button
              className="gap-2 shadow-md shadow-primary-500/20"
              onClick={navigateToGenerateTest}
            >
              <Sparkles className="w-4 h-4" /> Generare Test
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" /> Toate Documentele
              <span className="text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full ml-2">
                {materials?.length || 0}
              </span>
            </h2>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "flex flex-col gap-4"
            }
          >
            {}
            <Card
              className={`p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer transition-all ${
                viewMode === "grid"
                  ? "h-full min-h-[220px]"
                  : "py-6 flex-row gap-6"
              } ${
                isUploadDisabled
                  ? "opacity-40 pointer-events-none select-none bg-slate-100 dark:bg-slate-950"
                  : ""
              }`}
              onClick={() => {
                if (!isUploadDisabled)
                  document.getElementById("materials-file-upload")?.click();
              }}
            >
              <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4 shadow-sm shrink-0">
                {isUploadDisabled ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                ) : (
                  <Plus className="w-6 h-6" />
                )}
              </div>
              <div className={viewMode === "list" ? "text-left" : ""}>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {isProcessing
                    ? "Sistem Blocat (Procesare...)"
                    : localUploading
                    ? "Trimitere..."
                    : "Încarcă Materiale"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isProcessing
                    ? "AI-ul analizează fișierele anterioare"
                    : "PDF, DOCX, PPTX (Max 50MB)"}
                </p>
              </div>
            </Card>

            {!loading &&
              !error &&
              materials.map((mat) => (
                <MaterialCard
                  key={mat.id}
                  material={mat}
                  viewMode={viewMode}
                  onDelete={deleteDocument}
                  onClick={() => setPreviewDocument(mat)}
                />
              ))}
          </div>

          <input
            type="file"
            id="materials-file-upload"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            disabled={isUploadDisabled}
            onChange={(e) => {
              if (e.target.files?.length) {
                handleUpload(e.target.files);
                e.target.value = null; 
              }
            }}
          />
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
