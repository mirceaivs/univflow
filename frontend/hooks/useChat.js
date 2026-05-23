import { useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient.js';

export function useChat({ courseId } = {}) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [citations, setCitations] = useState([]);
  const [loadingText, setLoadingText] = useState('Răspund...');
  const [chatInput, setChatInput] = useState('');

  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadHistory = useCallback(async (currentCourseId, pageNum) => {
    if (!currentCourseId) return;
    
    setIsLoadingHistory(true);
    
    try {
      const res = await apiClient.get(`/rag/history/${currentCourseId}`, {
        params: { page: pageNum, size: 20 }
      });
      
      let data = res.data;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      if (data && Array.isArray(data.messages)) {
        const formattedHistory = data.messages.map(msg => ({
          id: msg.id || `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: msg.role === 'human' ? 'user' : 'ai',
          text: msg.content,
          citations: msg.citations || msg.message?.citations || [], 
          isStreaming: false
        }));

        setMessages(prev => {
          if (pageNum === 0) return formattedHistory;
          return [...formattedHistory, ...prev]; 
        });

        setHasMore(data.messages.length === 20);
        setPage(pageNum);

        if (pageNum === 0) {
          setTimeout(scrollToBottom, 100);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("[useChat] Eroare la încărcarea istoricului:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    setMessages([]);
    setPage(0);
    setHasMore(true);
    setChatInput('');
    if (courseId) {
      loadHistory(courseId, 0);
    }
  }, [courseId, loadHistory]);

  const loadMoreHistory = useCallback(() => {
    if (!isLoadingHistory && hasMore && courseId) {
      loadHistory(courseId, page + 1);
    }
  }, [isLoadingHistory, hasMore, courseId, page, loadHistory]);

  const streamRawTextAnswer = useCallback(async ({ question, ctxCourseId }) => {
    const aiMsgId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: '', isStreaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const getHeaders = () => {
        const csrfCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('XSRF-TOKEN='));
        const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.split('=')[1]) : '';
        const headers = { 'Content-Type': 'application/json' };
        if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;
        return headers;
      };

      const makeStreamRequest = () => fetch('/api/rag/ask/stream', {
        method: 'POST',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ question, courseId: ctxCourseId }),
        signal: controller.signal
      });

      let response = await makeStreamRequest();

      
      if (response.status === 401 || response.status === 403) {
        try {
          await apiClient.post('/auth/refresh');
          response = await makeStreamRequest();
        } catch (refreshErr) {
          window.dispatchEvent(new CustomEvent('auth:logout'));
          throw new Error('Sesiune expirată.');
        }
      }

      if (!response.ok) {
        throw new Error(`Eroare backend: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop(); 

          for (const part of parts) {
            let eventType = 'message';
            let dataStr = '';

            const lines = part.split('\n');
            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                dataStr = line.substring(5).trim();
              }
            }

            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                
                if (eventType === 'citation' || parsed.citations) {
                  const incomingCitations = parsed.citations || [];
                  
                  setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, citations: incomingCitations } : m));
                  setCitations(incomingCitations);
                } else if (eventType === 'error') {
                  // Backend sent an explicit error event during streaming
                  const errMsg = parsed.error || 'Eroare necunoscută de la server.';
                  setMessages((prev) =>
                    prev.map((m) => (m.id === aiMsgId ? { ...m, text: m.text + `\n\n⚠️ ${errMsg}` } : m))
                  );
                } else if (eventType === 'message' || !eventType) {
                  if (parsed.text) {
                    setMessages((prev) => 
                      prev.map((m) => (m.id === aiMsgId ? { ...m, text: m.text + parsed.text } : m))
                    );
                  }
                }
              } catch (e) {
                console.error("Eroare la parsarea chunk-ului JSON:", e);
              }
            }
          }
          scrollToBottom();
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Eroare în timpul stream-ului:", error);
        setMessages((prev) => 
          prev.map((m) => (m.id === aiMsgId ? { ...m, text: m.text + "\n\n[Eroare de conexiune la server]" } : m))
        );
      }
    } finally {
      setMessages((prev) => prev.map((m) => {
        if (m.id === aiMsgId) {
          const finalText = (!m.text || m.text.trim() === '') 
            ? '⚠️ Nu am putut genera un răspuns. Verificați că există documente încărcate pentru acest curs și încercați din nou.' 
            : m.text;
          return { ...m, text: finalText, isStreaming: false };
        }
        return m;
      }));
    }
  }, [scrollToBottom]);

  
  const handleSendMessage = async (explicitText) => {
    const question = typeof explicitText === 'string' ? explicitText.trim() : chatInput.trim();
    if (!question || isTyping) return;
    if (!courseId) return;

    const userMsgId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text: question }]);
    setChatInput('');
    setIsTyping(true);
    setLoadingText('Răspund...');
    
    setTimeout(scrollToBottom, 50);

    try {
      await streamRawTextAnswer({ question, ctxCourseId: courseId });
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'ai', text: 'Eroare la generare.', isStreaming: false }]);
    } finally {
      setIsTyping(false);
    }
  };

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.isStreaming) {
         return prev.map(m => m.id === lastMsg.id ? { ...m, isStreaming: false } : m);
      }
      return prev;
    });
    setIsTyping(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return {
    messages,
    isTyping,
    loadingText,
    chatInput,
    setChatInput,
    messagesEndRef,
    handleSendMessage,
    stopGeneration,
    handleKeyDown,
    loadMoreHistory,
    hasMore,
    isLoadingHistory,
    citations
  };
}