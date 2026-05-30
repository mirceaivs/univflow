import React, { useState, useEffect } from "react";
import { FileText, Loader2, AlertCircle } from "lucide-react";
import { apiClient } from "../../services/apiClient.js";

export const DocumentPanel = ({
  activeDocument,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activeDocument) {
      setPreviewUrl("");
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    apiClient.get(`/documents/${activeDocument.id}/preview`)
      .then(response => {
        if (active) {
          if (response.data && response.data.url) {
            setPreviewUrl(response.data.url);
          } else {
            setError("Răspunsul serverului nu conține URL-ul de previzualizare.");
            setIsLoading(false);
          }
        }
      })
      .catch(err => {
        if (active) {
          console.error("Failed to load document preview URL:", err);
          setError("Nu s-a putut obține link-ul securizat pentru previzualizarea documentului.");
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeDocument]);

  if (!activeDocument) {
    return (
      <div className="flex flex-col h-full h-[calc(100vh-140px)] items-center justify-center text-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Niciun document selectat
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Selectează un material din Studio pentru a-l previzualiza aici.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full h-[calc(100vh-140px)] relative bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Se încarcă documentul...
          </p>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center text-center p-6 h-full space-y-3 bg-white dark:bg-slate-900">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {error}
          </p>
        </div>
      ) : (
        previewUrl && (
          <iframe
            src={`${previewUrl}#toolbar=0`}
            className="w-full h-full border-0"
            title={activeDocument.name}
            onLoad={() => setIsLoading(false)}
          />
        )
      )}
    </div>
  );
};

