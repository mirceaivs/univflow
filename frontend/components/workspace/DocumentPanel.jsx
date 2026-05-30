import React, { useState } from "react";
import { FileText, Loader2 } from "lucide-react";

export const DocumentPanel = ({
  activeDocument,
}) => {
  const [isLoading, setIsLoading] = useState(true);

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
      <iframe
        src={`${activeDocument.url}?t=${new Date().getTime()}#toolbar=0`}
        className="w-full h-full border-0"
        title={activeDocument.name}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};
