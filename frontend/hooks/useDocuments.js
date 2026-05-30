
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../services/apiClient.js';
import { useIngestion } from '../components/context/IngestionContext.jsx';

const normalizeDocsResponse = (data) => (Array.isArray(data) ? data : []);

const toUiMaterial = (dto) => {
  const name = dto?.name ?? dto?.fileName ?? dto?.originalFileName ?? 'Document';
  const sizeBytes = dto?.size ?? dto?.sizeBytes ?? dto?.fileSize ?? null;
  const mime = dto?.mimeType ?? dto?.contentType ?? '';

  const getType = (n, m) => {
    const lower = String(n || '').toLowerCase();
    if (m.includes('pdf') || lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'doc';
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'ppt';
    return 'file';
  };

  const formatSize = (bytes) => {
    if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${Math.max(1, Math.round(kb))} KB`;
  };

  return {
    id: dto?.id,
    backendId: dto?.id,
    jobId: dto?.jobId,
    name,
    type: getType(name, mime),
    size: dto?.sizeFormatted ?? formatSize(sizeBytes),
    date: dto?.uploadedAt ?? dto?.createdAt ?? dto?.date ?? '',
    tags: Array.isArray(dto?.tags) ? dto.tags : [],
    url: dto?.url ?? dto?.downloadUrl ?? null,
    courseId: dto?.courseId ?? null,
  };
};

export function useDocuments({ courseId } = {}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadedCourseId, setLoadedCourseId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const ingestionCtx = useIngestion();
  const addJob = ingestionCtx?.addJob;

  const lastCourseIdRef = useRef(courseId);
  const materials = useMemo(() => documents.map(toUiMaterial), [documents]);

  const fetchDocuments = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/courses', { params: { courseId } });
      const list = normalizeDocsResponse(res?.data);
      setDocuments(list);
      setHasLoaded(true);
      setLoadedCourseId(courseId);
    } catch (e) {
      setError(e);
      setDocuments([]);
      setHasLoaded(true);
      setLoadedCourseId(courseId);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;

    if (lastCourseIdRef.current !== courseId) {
      lastCourseIdRef.current = courseId;
      setDocuments([]);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);
      setHasLoaded(false);
      setLoadedCourseId(null);
    }

    fetchDocuments();
  }, [courseId, fetchDocuments]);

  const uploadDocuments = useCallback(
    async (files) => {
      if (!courseId) throw new Error('Missing courseId');
      const fileList = Array.from(files || []);
      if (fileList.length === 0) return;

      setUploading(true);
      setUploadProgress(0);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      
      for (const file of fileList) {
        formData.append('files', file);
      }

      try {
        const res = await apiClient.post(`/courses/${courseId}/documents`, formData, {
          
          onUploadProgress: (evt) => {
            if (!evt || !evt.total) return;
            const pct = Math.round((evt.loaded * 100) / evt.total);
            setUploadProgress(pct);
          },
        });

        
        const data = res.data;
        if (data && data.jobs && Array.isArray(data.jobs) && addJob) {
          data.jobs.forEach(job => {
            const jId = job.job_id || job.jobId || job.id;
            const fName = job.filename || job.fileName || "Document";
            if (jId) {
              addJob(jId, courseId, [{ name: fName }]);
            }
          });
        }

        setSuccess('Upload reușit');
        await fetchDocuments();
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setUploading(false);
        setTimeout(() => setUploadProgress(0), 800);
      }
    },
    [courseId, fetchDocuments, addJob]
  );

  const deleteDocument = useCallback(async (documentId) => {
    if (!documentId) return;
    setError(null);
    setSuccess(null);
    try {
      await apiClient.delete(`/documents/${documentId}`);
      setDocuments((prev) => prev.filter((d) => d?.id !== documentId));
      setSuccess('Șters');
    } catch (e) {
      setError(e);
      throw e;
    }
  }, []);

  return {
    documents,
    materials,

    loading,
    hasLoaded,
    loadedCourseId,
    uploading,
    uploadProgress,
    error,
    success,

    fetchDocuments,
    uploadDocuments,
    deleteDocument,
  };
}