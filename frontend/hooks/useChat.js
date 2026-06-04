import { useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient.js';

export function useChat({ courseId } = {}) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [citations, setCitations] = useState([]);
  const [loadingText, setLoadingText] = useState('Răspund...');
  const [chatInput, setChatInput] = useState('');
  const [isReasoningEnabled, setIsReasoningEnabled] = useState(false);

  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(!!courseId);

  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);
  const activeRequestRef = useRef(null);
  const isAbortedRef = useRef(false);
  const activeUserMsgIdRef = useRef(null);
  const activeAiMsgIdRef = useRef(null);

  
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
        })).reverse();

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
    } else {
      setIsLoadingHistory(false);
    }
  }, [courseId, loadHistory]);

  const loadMoreHistory = useCallback(() => {
    if (!isLoadingHistory && hasMore && courseId) {
      loadHistory(courseId, page + 1);
    }
  }, [isLoadingHistory, hasMore, courseId, page, loadHistory]);

  const fetchRawTextAnswer = useCallback(async ({ question, ctxCourseId, isReasoningEnabled }) => {
    const aiMsgId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    activeAiMsgIdRef.current = aiMsgId;
    setMessages(prev => [...prev, { id: aiMsgId, role: 'ai', text: '', isStreaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;
    activeRequestRef.current = { question, courseId: ctxCourseId, reasoningEnabled: isReasoningEnabled };

    try {
      const response = await apiClient.post('/rag/ask', {
        question,
        courseId: ctxCourseId,
        reasoning_enabled: isReasoningEnabled
      }, {
        signal: controller.signal
      });

      const data = response.data;
      
      if (data && data.error) {
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: data.error } : m));
      } else if (data) {
        const incomingCitations = data.citations || [];
        setCitations(incomingCitations);
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: data.text || '', citations: incomingCitations } : m));
      }
      scrollToBottom();
    } catch (error) {
      if (isAbortedRef.current) return;
      const isAbort = error.name === 'AbortError' || error.name === 'CanceledError' || error.code === 'ERR_CANCELED';
      if (isAbort) {
        setMessages(prev =>
          prev.map(m => m.id === aiMsgId ? { ...m, text: "Generare oprită de utilizator." } : m)
        );
      } else {
        console.error("Eroare în timpul preluării răspunsului:", error);
        setMessages((prev) => 
          prev.map((m) => (m.id === aiMsgId ? { ...m, text: m.text + "\n\n[Eroare de conexiune la server]" } : m))
        );
      }
    } finally {
      if (!isAbortedRef.current) {
        setMessages((prev) => prev.map((m) => {
          if (m.id === aiMsgId) {
            const finalText = (!m.text || m.text.trim() === '') 
              ? 'Nu am putut genera un răspuns. Verificați că există documente încărcate pentru acest curs și încercați din nou.' 
              : m.text;
            return { ...m, text: finalText, isStreaming: false };
          }
          return m;
        }));
      }
    }
  }, [scrollToBottom]);

  
  const handleSendMessage = async (explicitText) => {
    const question = typeof explicitText === 'string' ? explicitText.trim() : chatInput.trim();
    if (!question || isTyping) return;
    if (!courseId) return;

    isAbortedRef.current = false;
    const userMsgId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    activeUserMsgIdRef.current = userMsgId;
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', text: question }]);
    setChatInput('');
    setIsTyping(true);
    setLoadingText('Răspund...');
    
    setTimeout(scrollToBottom, 50);

    try {
      await fetchRawTextAnswer({ question, ctxCourseId: courseId, isReasoningEnabled });
    } catch {
      if (!isAbortedRef.current) {
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'ai', text: 'Eroare la generare.', isStreaming: false }]);
      }
    } finally {
      if (!isAbortedRef.current) {
        setIsTyping(false);
      }
    }
  };

  const stopGeneration = useCallback(() => {
    isAbortedRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;

    setIsTyping(false);

    // Put original prompt back into the chat text input
    if (activeRequestRef.current && activeRequestRef.current.question) {
      setChatInput(activeRequestRef.current.question);
    }

    // Filter out the active user and AI messages from the message history
    const userMsgId = activeUserMsgIdRef.current;
    const aiMsgId = activeAiMsgIdRef.current;
    setMessages((prev) => prev.filter(
      m => m.id !== userMsgId && m.id !== aiMsgId
    ));

    if (courseId) {
      const payload = { courseId };
      if (activeRequestRef.current) {
        payload.question = activeRequestRef.current.question;
        payload.reasoning_enabled = activeRequestRef.current.reasoningEnabled;
        payload.originalBody = JSON.stringify({
          question: activeRequestRef.current.question,
          courseId: activeRequestRef.current.courseId,
          reasoning_enabled: activeRequestRef.current.reasoningEnabled
        });
      }
      apiClient.post('/rag/stop', payload).catch((err) => {
        console.error("[useChat] Eroare la apelarea /rag/stop în background:", err);
      });
    }

    activeRequestRef.current = null;
    activeUserMsgIdRef.current = null;
    activeAiMsgIdRef.current = null;
  }, [courseId, setChatInput]);

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
    citations,
    isReasoningEnabled,
    setIsReasoningEnabled
  };
}