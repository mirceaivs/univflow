import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AlertCircle, CheckCircle2, XCircle, Info, X } from "lucide-react";

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

const NotificationItem = ({ id, type, title, message, duration, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getStyles = () => {
    switch (type) {
      case "success":
        return {
          border: "border-green-200 dark:border-green-800",
          icon: <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />,
          titleColor: "text-green-800 dark:text-green-200",
          bgColor: "bg-white dark:bg-slate-900",
        };
      case "error":
        return {
          border: "border-red-200 dark:border-red-800",
          icon: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
          titleColor: "text-red-800 dark:text-red-200",
          bgColor: "bg-white dark:bg-slate-900",
        };
      case "warning":
        return {
          border: "border-amber-200 dark:border-amber-800",
          icon: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />,
          titleColor: "text-amber-800 dark:text-amber-200",
          bgColor: "bg-white dark:bg-slate-900",
        };
      default:
        return {
          border: "border-blue-200 dark:border-blue-800",
          icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
          titleColor: "text-blue-800 dark:text-blue-200",
          bgColor: "bg-white dark:bg-slate-900",
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`flex items-start gap-3 p-4 shadow-xl rounded-2xl border w-80 md:w-96 transition-all duration-300 animate-in slide-in-from-top-5 relative overflow-hidden ${styles.bgColor} ${styles.border}`}
    >
      <div className="shrink-0 mt-0.5">{styles.icon}</div>
      <div className="flex-1 min-w-0 pr-4">
        {title && (
          <h4 className={`text-sm font-bold truncate ${styles.titleColor}`}>
            {title}
          </h4>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed break-words">
          {message}
        </p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback(({ type = "info", title, message, duration }) => {
    const id = String(Date.now() + Math.random());
    
    const finalDuration = duration ?? (type === "error" || type === "warning" ? 20000 : 5000);
    
    
    let finalTitle = title;
    if (!finalTitle) {
      if (type === "error") finalTitle = "Eroare";
      else if (type === "warning") finalTitle = "Atenție";
      else if (type === "success") finalTitle = "Succes";
      else finalTitle = "Informație";
    }

    setNotifications((prev) => [...prev, { id, type, title: finalTitle, message, duration: finalDuration }]);
  }, []);

  const closeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  
  useEffect(() => {
    const handleGlobalError = (e) => {
      const msg = e.detail?.message || "A apărut o eroare neașteptată.";
      showNotification({
        type: "error",
        message: msg,
      });
    };
    window.addEventListener("app:error", handleGlobalError);
    return () => window.removeEventListener("app:error", handleGlobalError);
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-h-[85vh] overflow-y-auto no-scrollbar pointer-events-none">
        {notifications.map((n) => (
          <div key={n.id} className="pointer-events-auto">
            <NotificationItem {...n} onClose={closeNotification} />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
