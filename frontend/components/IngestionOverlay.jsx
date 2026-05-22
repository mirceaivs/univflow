import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { useIngestion } from "./context/IngestionContext.jsx";

const JobNotification = ({ job, onDismiss }) => {
  const { status, jobId } = job;

  useEffect(() => {
    if (status !== "COMPLETED" && status !== "FAILED") {
      return;
    }
    const timer = setTimeout(() => {
      onDismiss(job);
    }, 20000); 
    return () => clearTimeout(timer);
  }, [status, jobId, onDismiss]);

  const isCompleted = status === "COMPLETED";
  const isFailed = status === "FAILED";
  const isProcessing = !isCompleted && !isFailed;
  const progress = typeof job.progress === "number" ? job.progress : 0;

  return (
    <div
      className={`bg-white dark:bg-slate-900 border shadow-xl rounded-2xl p-4 relative overflow-hidden transition-all ${
        isCompleted
          ? "border-green-200 dark:border-green-800"
          : isFailed
          ? "border-red-200 dark:border-red-800"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <button
        onClick={() => onDismiss(job)}
        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md transition-colors z-10"
        title={
          isProcessing
            ? "Ascunde notificarea (procesarea continuă în fundal)"
            : "Închide"
        }
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 mb-3 pr-6">
        <div className="shrink-0 mt-0.5">
          {isProcessing && (
            <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
          )}
          {isCompleted && (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          )}
          {isFailed && <XCircle className="w-5 h-5 text-red-500" />}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
            {isProcessing
              ? "Procesare Documente..."
              : isCompleted
              ? "Procesare Finalizată"
              : "Eroare la procesare"}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
            {job.fileNames?.join(", ") || "Documente necunoscute"}
          </p>
          {isFailed && job.error && (
            <p className="text-xs text-red-500 mt-1 line-clamp-2">
              {job.error}
            </p>
          )}
        </div>
      </div>

      {}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isCompleted
              ? "bg-green-500"
              : isFailed
              ? "bg-red-500"
              : "bg-primary-500"
          }`}
          style={{
            width: `${isCompleted ? 100 : isFailed ? 100 : progress}%`,
          }}
        />
      </div>

      <div className="flex justify-between items-center mt-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {status}
        </span>
        <span className="text-[10px] font-bold text-slate-500">
          {isCompleted ? 100 : progress}%
        </span>
      </div>
    </div>
  );
};

export const IngestionOverlay = () => {
  const { activeJobs, removeJob } = useIngestion();
  const jobs = Object.values(activeJobs || {});

  
  const [dismissedIds, setDismissedIds] = useState(new Set());

  
  useEffect(() => {
    jobs.forEach((job) => {
      const isFinished = job.status === "COMPLETED" || job.status === "FAILED";
      const wasDismissed = dismissedIds.has(job.jobId);
      if (isFinished && wasDismissed) {
        removeJob(job.jobId);
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(job.jobId);
          return next;
        });
      }
    });
  }, [jobs, dismissedIds, removeJob]);

  
  const visibleJobs = jobs.filter((job) => {
    const wasDismissed = dismissedIds.has(job.jobId);
    return !wasDismissed;
  });

  if (visibleJobs.length === 0) return null;

  const handleDismiss = (job) => {
    const isFinished =
      job.status === "COMPLETED" || job.status === "FAILED";

    if (isFinished) {
      
      removeJob(job.jobId);
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.jobId);
        return next;
      });
    } else {
      
      setDismissedIds((prev) => new Set(prev).add(job.jobId));
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 md:w-96 animate-in slide-in-from-bottom-5">
      {visibleJobs.map((job) => (
        <JobNotification
          key={job.jobId}
          job={job}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
};
