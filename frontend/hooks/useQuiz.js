import { useMemo, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function safeParseJson(input) {
  if (input == null) return null;
  if (typeof input !== 'string') return input;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch {}
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  const start = [firstBrace, firstBracket].filter((i) => i !== -1).sort((a, b) => a - b)[0];
  if (start === undefined) return null;
  const openChar = trimmed[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === openChar) depth++;
    if (ch === closeChar) depth--;
    if (depth === 0) {
      const possibleJson = trimmed.slice(start, i + 1);
      try { return JSON.parse(possibleJson); } catch { return null; }
    }
  }
  return null;
}

function extractQuestionsArray(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    if (parsed.some((x) => x && typeof x === 'object' && (x.question || x.text || x.prompt))) return parsed;
    for (const item of parsed) {
      const found = extractQuestionsArray(item);
      if (found.length) return found;
    }
    return [];
  }
  if (typeof parsed !== 'object') return [];
  const directCandidates = [parsed.questions, parsed.data, parsed.result, parsed.items, parsed.payload, parsed.response, parsed.output];
  for (const cand of directCandidates) { if (Array.isArray(cand)) return cand; }
  const nestedCandidates = [parsed.quiz, parsed.quizData, parsed.body, parsed.message, parsed.content];
  for (const nested of nestedCandidates) {
    if (nested && typeof nested === 'object') {
      if (Array.isArray(nested.questions)) return nested.questions;
      if (Array.isArray(nested.data)) return nested.data;
    }
  }
  for (const value of Object.values(parsed)) {
    if (Array.isArray(value)) {
      if (value.some((x) => x && typeof x === 'object' && (x.question || x.text || x.prompt))) return value;
    } else if (value && typeof value === 'object') {
      const found = extractQuestionsArray(value);
      if (found.length) return found;
    }
  }
  return [];
}

function ensureOptionIds(opts) {
  const arr = Array.isArray(opts) ? opts : [];
  return arr.map((o, idx) => {
    if (typeof o === 'string') return { id: LETTERS[idx] || String(idx + 1), text: o };
    if (o && typeof o === 'object') {
      return { id: o.id ?? o.key ?? o.label ?? LETTERS[idx] ?? String(idx + 1), text: o.text ?? o.value ?? o.content ?? '' };
    }
    return { id: LETTERS[idx] || String(idx + 1), text: String(o ?? '') };
  }).filter((o) => String(o.text || '').trim().length > 0);
}

function normalizeCorrectAnswer(rawCorrect, options) {
  if (!options?.length) return 'A';
  if (typeof rawCorrect === 'number' && Number.isFinite(rawCorrect)) return options[rawCorrect]?.id ?? options[0].id;
  const correctStr = rawCorrect == null ? '' : String(rawCorrect).trim();
  if (correctStr) {
    const byId = options.find((o) => String(o.id).trim() === correctStr);
    if (byId) return byId.id;
  }
  if (correctStr) {
    const byText = options.find((o) => String(o.text).trim() === correctStr);
    if (byText) return byText.id;
  }
  const letterMatch = correctStr.match(/\b([A-H])\b/i);
  if (letterMatch) {
    const letter = letterMatch[1].toUpperCase();
    const byLetter = options.find((o) => String(o.id).toUpperCase() === letter);
    if (byLetter) return byLetter.id;
  }
  return options[0].id;
}

function toFrontendQuestion(q) {
  const questionText = q?.question ?? q?.text ?? q?.prompt ?? q?.title ?? '';
  const rawOptions = q?.options ?? q?.answers ?? q?.choices ?? q?.variants ?? q?.responses ?? [];
  const options = ensureOptionIds(rawOptions);
  
  let correctRaw =
    q?.correctAnswer ??
    q?.correctAnswerId ??
    q?.correct ??
    q?.answer ??
    q?.correctOption ??
    q?.correctIndex ??
    q?.solution;

  let correctFeedbackStr = q?.explanation ?? '';
  let incorrectFeedbackStr = q?.explanation ?? '';

  
  if (!correctRaw && rawOptions.length > 0) {
    const correctIndex = rawOptions.findIndex(o => o.is_correct === true || o.isCorrect === true);
    if (correctIndex !== -1) {
      correctRaw = options[correctIndex].id; 
      correctFeedbackStr = rawOptions[correctIndex].feedback || correctFeedbackStr;
    }
    
    const wrongIndex = rawOptions.findIndex(o => o.is_correct === false || o.isCorrect === false);
    if (wrongIndex !== -1) {
      incorrectFeedbackStr = rawOptions[wrongIndex].feedback || incorrectFeedbackStr;
    }
  }

  const feedback =
    q?.feedback && typeof q.feedback === 'object'
      ? {
          correct: q.feedback.correct ?? q.feedback.ok ?? q.feedback.right ?? correctFeedbackStr,
          incorrect: q.feedback.incorrect ?? q.feedback.ko ?? q.feedback.wrong ?? incorrectFeedbackStr,
        }
      : {
          correct: q?.feedbackCorrect ?? q?.explanationCorrect ?? q?.explanation ?? correctFeedbackStr,
          incorrect: q?.feedbackIncorrect ?? q?.explanationIncorrect ?? q?.explanation ?? incorrectFeedbackStr,
        };

  return {
    question: String(questionText || ''),
    options,
    correctAnswer: normalizeCorrectAnswer(correctRaw, options),
    feedback,
  };
}

export function useQuiz({ quiz, questions = null, quizResetKey = 0, courseId, quizId } = {}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState([]); 

  const [backendQuiz, setBackendQuiz] = useState(quiz ?? null);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!courseId) return; 
      setLoading(true);
      try {
        const res = await apiClient.get(`/quizzes/course/${courseId}`);
        const list = Array.isArray(res?.data) ? res.data : [];
        
        let found = quizId ? list.find((q) => q?.id === quizId) : (quiz || list[0]);
        if (mounted) {
          setBackendQuiz(found || null);
          setIsSessionLoaded(false); 
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [quizId, courseId, quizResetKey]);

  
  const parsedQuestions = useMemo(() => {
    if (Array.isArray(questions) && questions.length) return questions.map(toFrontendQuestion);
    const contentJson = backendQuiz?.contentJson;
    if (!contentJson) return [];
    return extractQuestionsArray(safeParseJson(contentJson)).map(toFrontendQuestion).filter((qq) => qq.question && qq.options?.length);
  }, [backendQuiz?.contentJson, questions]);

  const totalQuestions = parsedQuestions.length;
  const currentQuestion = parsedQuestions[currentIndex];
  const progressPercentage = totalQuestions ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const scorePercentage = totalQuestions ? Math.round((score / totalQuestions) * 100) : 0;

  
  useEffect(() => {
    setIsSessionLoaded(false);
  }, [quizResetKey]);

  
  useEffect(() => {
    if (!backendQuiz?.id || isSessionLoaded) return;
    const storageKey = `quiz_session_${backendQuiz.id}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCurrentIndex(data.currentIndex ?? 0);
        setScore(data.score ?? 0);
        setIsFinished(data.isFinished ?? false);
        setAttempts(data.attempts ?? []);
        setIsQuizSubmitted(data.isQuizSubmitted ?? false);
        setSelectedOption(data.selectedOption ?? null);
      } catch (e) {
        console.error("Eroare sesiune locală", e);
      }
    } else if (backendQuiz.sessionStateJson) {
      try {
        const data = JSON.parse(backendQuiz.sessionStateJson);
        setCurrentIndex(data.currentIndex ?? 0);
        setScore(data.score ?? 0);
        setIsFinished(data.isFinished ?? false);
        setAttempts(data.attempts ?? []);
        setIsQuizSubmitted(data.isQuizSubmitted ?? false);
        setSelectedOption(data.selectedOption ?? null);
        
        
        localStorage.setItem(storageKey, backendQuiz.sessionStateJson);
      } catch (e) {
        console.error("Eroare sesiune din backend", e);
      }
    } else {
      setCurrentIndex(0);
      setScore(0);
      setIsFinished(false);
      setAttempts([]);
      setIsQuizSubmitted(false);
      setSelectedOption(null);
    }
    setIsSessionLoaded(true);
  }, [backendQuiz?.id, isSessionLoaded, quizResetKey]);

  
  useEffect(() => {
    if (!backendQuiz?.id || !isSessionLoaded) return;
    const stateObj = {
      currentIndex,
      score,
      isFinished,
      attempts,
      isQuizSubmitted,
      selectedOption
    };
    const stateStr = JSON.stringify(stateObj);
    const storageKey = `quiz_session_${backendQuiz.id}`;
    localStorage.setItem(storageKey, stateStr);
    
    
    const saveToDb = async () => {
      try {
        await apiClient.post(`/quizzes/${backendQuiz.id}/session`, {
          sessionStateJson: stateStr
        });
      } catch (err) {
        console.error("Eroare la salvarea sesiunii în DB:", err);
      }
    };
    saveToDb();
  }, [currentIndex, score, isFinished, attempts, isQuizSubmitted, selectedOption, backendQuiz?.id, isSessionLoaded]);

  
  const handleVerify = useCallback(() => {
    if (!currentQuestion) return;
    setIsQuizSubmitted(true);
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    if (isCorrect) setScore((prev) => prev + 1);

    
    const aiRecommendation = isCorrect 
      ? (currentQuestion.feedback?.correct || "Excelent!") 
      : (currentQuestion.feedback?.incorrect || "Mai studiază acest capitol.");

    const attemptRecord = {
      questionText: currentQuestion.question,
      isCorrect: isCorrect,
      recommendation: aiRecommendation, 
      options: currentQuestion.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        isSelected: opt.id === selectedOption,
        isCorrect: opt.id === currentQuestion.correctAnswer
      }))
    };
    
    setAttempts(prev => [...prev, attemptRecord]);
  }, [currentQuestion, selectedOption]);

  const submitScoreToBackend = useCallback(async () => {
    const qId = backendQuiz?.id ?? quiz?.id;
    if (!qId) return;
    setSubmitLoading(true);
    try {
      await apiClient.post(`/quizzes/${qId}/submit`, { score: scorePercentage });
    } finally {
      setSubmitLoading(false);
    }
  }, [backendQuiz?.id, quiz?.id, scorePercentage]);

  const handleNextQuestion = useCallback(async () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsQuizSubmitted(false);
    } else {
      setIsFinished(true);
      await submitScoreToBackend();
    }
  }, [currentIndex, totalQuestions, submitScoreToBackend]);

  const handleRestart = useCallback(() => {
    if (backendQuiz?.id) localStorage.removeItem(`quiz_session_${backendQuiz.id}`);
    setCurrentIndex(0); setSelectedOption(null); setIsQuizSubmitted(false); setIsFinished(false); setScore(0); setAttempts([]);
  }, [backendQuiz?.id]);

  return {
    loading, submitLoading,
    topic: backendQuiz?.topic, difficulty: backendQuiz?.difficulty,
    currentIndex, currentQuestion, totalQuestions, progressPercentage,
    selectedOption, isQuizSubmitted, isFinished, score, scorePercentage, attempts,
    handleVerify, handleNextQuestion, handleRestart, setSelectedOption,
  };
}