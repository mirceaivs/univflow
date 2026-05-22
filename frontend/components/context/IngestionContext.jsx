import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiClient } from "../../services/apiClient.js";
import { useAuthContext } from "./AuthContext.jsx";

const IngestionContext = createContext();

export const useIngestion = () => useContext(IngestionContext);

export const IngestionProvider = ({ children }) => {
  const { user } = useAuthContext();

  
  const [activeJobs, setActiveJobs] = useState(() => {
    try {
      const saved = localStorage.getItem("ingestion_jobs");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  
  useEffect(() => {
    localStorage.setItem("ingestion_jobs", JSON.stringify(activeJobs));
  }, [activeJobs]);

  
  useEffect(() => {
    if (!user) {
      setActiveJobs({});
    }
  }, [user]);

  const addJob = useCallback((jobId, courseId, files) => {
    setActiveJobs((prev) => ({
      ...prev,
      [jobId]: {
        jobId,
        courseId,
        status: "PENDING",
        progress: 0,
        fileNames: Array.from(files).map((f) => f.name),
        error: null,
      },
    }));
  }, []);

  const removeJob = useCallback((jobId) => {
    setActiveJobs((prev) => {
      const newJobs = { ...prev };
      delete newJobs[jobId];
      return newJobs;
    });
  }, []);

  const pendingJobIds = Object.values(activeJobs || {})
    .filter((job) => job.status !== "COMPLETED" && job.status !== "FAILED")
    .map((job) => job.jobId);
  const pendingJobsKey = pendingJobIds.join(",");

  useEffect(() => {
    if (!user || !pendingJobsKey) return;
    const jobIds = pendingJobsKey.split(",");

    const interval = setInterval(() => {
      jobIds.forEach(async (jobId) => {
        try {
          
          const res = await apiClient.get(`/courses/jobs/${jobId}/status`);
          const data = res.data;

          setActiveJobs((prev) => {
            const currentJob = prev[jobId];
            if (!currentJob) return prev;

            const backendStatus = data.status ?? currentJob.status;
            const backendProgress = data.progress ?? data.percent ?? data.percentage ?? 0;

            let nextProgress = currentJob.progress || 0;
            if (backendStatus === "COMPLETED" || backendStatus === "FAILED") {
              nextProgress = 100;
            } else {
              nextProgress = Math.max(nextProgress, backendProgress);
              nextProgress = Math.min(95, nextProgress); 
            }

            if (
              currentJob.status === backendStatus &&
              currentJob.progress === nextProgress
            )
              return prev;

            return {
              ...prev,
              [jobId]: {
                ...currentJob,
                status: backendStatus,
                progress: nextProgress,
                error: data.error_message ?? data.error ?? null,
              },
            };
          });
        } catch (err) {
          console.error(`Eroare la verificarea jobului ${jobId}:`, err);
          
          
          if (err.response?.status === 404) {
            setActiveJobs((prev) => {
              if (!prev[jobId]) return prev;
              return {
                ...prev,
                [jobId]: {
                  ...prev[jobId],
                  status: "FAILED",
                  error: "Jobul nu a fost găsit pe server.",
                },
              };
            });
          }
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [user, pendingJobsKey]);

  
  useEffect(() => {
    if (!user || !pendingJobsKey) return;

    const interval = setInterval(() => {
      setActiveJobs((prev) => {
        let changed = false;
        const nextJobs = { ...prev };

        Object.keys(nextJobs).forEach((jobId) => {
          const job = nextJobs[jobId];
          if (job.status !== "COMPLETED" && job.status !== "FAILED") {
            const currentProgress = job.progress || 0;
            if (currentProgress < 95) {
              let increment = 1;
              if (currentProgress < 30) {
                increment = Math.floor(Math.random() * 3) + 2; 
              } else if (currentProgress < 75) {
                increment = Math.floor(Math.random() * 2) + 1; 
              } else {
                increment = Math.random() > 0.6 ? 1 : 0; 
              }
              const newProgress = Math.min(95, currentProgress + increment);
              if (newProgress !== currentProgress) {
                nextJobs[jobId] = {
                  ...job,
                  progress: newProgress,
                };
                changed = true;
              }
            }
          }
        });

        return changed ? nextJobs : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [user, pendingJobsKey]);

  return (
    <IngestionContext.Provider value={{ activeJobs, addJob, removeJob }}>
      {children}
    </IngestionContext.Provider>
  );
};
