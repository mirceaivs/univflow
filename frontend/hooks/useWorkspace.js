import { useCallback, useEffect, useState } from 'react';
import { useCourses } from './useCourses.js';

const isValidTab = (t) => t === 'chat' || t === 'materials' || t === 'quiz';
const isValidPanel = (p) => p === 'studio' || p === 'sources' || p === 'closed' || p === 'document';

export function useWorkspace({
  setView,
  workspaceAction,
  clearWorkspaceAction,
  setNavParams,
  workspaceState,
  setWorkspaceState,
}) {
  const [mainContent, setMainContent] = useState('chat');
  const [rightPanelState, setRightPanelState] = useState('studio'); 
  const [quizKey, setQuizKey] = useState(0);
  const [activeSources, setActiveSources] = useState([]);
  const [focusedSourceId, setFocusedSourceId] = useState(null);
  const [focusedMessageId, setFocusedMessageId] = useState(null); 
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);

  const { courses, loading } = useCourses();
  const [course, setCourse] = useState(null);

  const persist = useCallback(
    (patch) => {
      if (typeof setWorkspaceState !== 'function') return;
      setWorkspaceState((prev) => ({ ...(prev || {}), ...patch }));
    },
    [setWorkspaceState]
  );

  useEffect(() => {
    if (!workspaceState) return;
    if (workspaceState.tab && isValidTab(workspaceState.tab)) setMainContent(workspaceState.tab);
    if (workspaceState.rightPanelState && isValidPanel(workspaceState.rightPanelState)) setRightPanelState(workspaceState.rightPanelState);
    else setRightPanelState('studio');
    if (workspaceState.activeQuizId !== undefined) setActiveQuizId(workspaceState.activeQuizId);
  }, [workspaceState]);

  useEffect(() => {
    if (!currentViewMatchesWorkspace()) return; 
    if (!Array.isArray(courses) || courses.length === 0) return;
    const persistedId = workspaceState?.courseBackendId;
    if (!course && persistedId) {
      const found = courses.find((c) => String(c.backendId) === String(persistedId));
      if (found) { setCourse(found); return; }
    }
    if (!course) setCourse(courses[0]);
  }, [courses, course, workspaceState]);

  function currentViewMatchesWorkspace() {
    return true; 
  }

  useEffect(() => {
    if (!workspaceAction?.type) return;

    if (workspaceAction.type === 'START_QUIZ') {
      setMainContent('quiz');
      setRightPanelState('studio'); 
      setQuizKey((k) => k + 1);

      if (workspaceAction.course) {
        setCourse(workspaceAction.course);
      }

      const targetQuizId = workspaceAction.quizId || null;
      const fromWhere = workspaceAction.from || 'chat';
      setActiveQuizId(targetQuizId);

      const currentBackendId = workspaceAction.course?.backendId ?? workspaceAction.course?.id ?? course?.backendId ?? workspaceState?.courseBackendId ?? '';
      
      persist({
        tab: 'quiz',
        rightPanelState: 'studio',
        courseBackendId: String(currentBackendId),
        activeQuizId: targetQuizId, 
        returnTo: fromWhere,
      });

      clearWorkspaceAction?.();
      return;
    }

    if (workspaceAction.type === 'SET_COURSE') {
      if (workspaceAction.course) {
        setCourse(workspaceAction.course);
      }
      const targetTab = workspaceAction.tab && isValidTab(workspaceAction.tab) ? workspaceAction.tab : 'chat';
      setMainContent(targetTab);
      
      
      setActiveSources([]);
      setFocusedSourceId(null);
      setFocusedMessageId(null);

      let nextRightPanelState = rightPanelState;
      if (rightPanelState === 'sources') {
        nextRightPanelState = 'studio';
        setRightPanelState('studio');
      }

      persist({
        tab: targetTab,
        rightPanelState: nextRightPanelState,
        courseBackendId: String(workspaceAction.course?.backendId ?? workspaceAction.course?.id ?? ''),
      });
      clearWorkspaceAction?.();
      return;
    }

    if (workspaceAction.type === 'SET_TAB') {
      const targetTab = workspaceAction.tab && isValidTab(workspaceAction.tab) ? workspaceAction.tab : 'chat';
      setMainContent(targetTab);
      persist({ tab: targetTab });
      clearWorkspaceAction?.();
      return;
    }
  }, [workspaceAction, clearWorkspaceAction, persist, course, workspaceState, rightPanelState]);

  const backToChat = useCallback(() => {
    setMainContent('chat');
    setRightPanelState('studio');
    persist({ tab: 'chat', rightPanelState: 'studio', courseBackendId: String(course?.backendId ?? workspaceState?.courseBackendId ?? '') });
  }, [course, persist, workspaceState]);

  const handleBackFromQuiz = useCallback(() => {
    const dest = workspaceState?.returnTo;
    const currentBackendId = course?.backendId ?? workspaceState?.courseBackendId;
    
    if (dest === 'evaluare') {
      setNavParams?.({ courseId: currentBackendId });
      setView?.('evaluare');
    } else if (dest === 'generate-test') {
      setNavParams?.({ step: 2, course: course, from: 'workspace' });
      setView?.('generate-test');
    } else {
      setMainContent('chat');
      setRightPanelState('studio');
      persist({ tab: 'chat', rightPanelState: 'studio', courseBackendId: String(currentBackendId ?? '') });
    }
  }, [setView, workspaceState, persist, course, setNavParams]);

  const navigateToGenerateTest = useCallback(() => {
    const currentCourse = course || (Array.isArray(courses) ? courses[0] : null);
    if (!currentCourse) return;
    setNavParams?.({ step: 2, course: currentCourse, from: 'workspace' });
    persist({ tab: 'chat', rightPanelState: 'studio', courseBackendId: String(currentCourse.backendId ?? currentCourse.id ?? '') });
    setView?.('generate-test');
  }, [course, courses, persist, setNavParams, setView]);

  
  const openSources = useCallback((sourcesArray, clickedSourceId, messageId) => {
    if (rightPanelState === 'sources' && focusedSourceId === clickedSourceId && focusedMessageId === messageId) {
      setRightPanelState('closed'); 
      setFocusedSourceId(null);
      setFocusedMessageId(null);
      persist({ rightPanelState: 'closed', tab: mainContent, courseBackendId: String(course?.backendId ?? workspaceState?.courseBackendId ?? '') });
    } else {
      setActiveSources(sourcesArray || []); 
      setRightPanelState('sources'); 
      setFocusedSourceId(clickedSourceId);
      setFocusedMessageId(messageId);
      persist({ rightPanelState: 'sources', tab: mainContent, courseBackendId: String(course?.backendId ?? workspaceState?.courseBackendId ?? '') });
    }
  }, [course, mainContent, persist, workspaceState, rightPanelState, focusedSourceId, focusedMessageId]);

  const openMaterials = useCallback(() => {
    setMainContent('materials'); 
    setRightPanelState('studio');
    persist({ tab: 'materials', rightPanelState: 'studio', courseBackendId: String(course?.backendId ?? workspaceState?.courseBackendId ?? '') });
  }, [course, persist, workspaceState]);

  const openDocumentPanel = useCallback((doc) => {
    if (rightPanelState === 'document' && activeDocument?.url === doc.url) {
      setRightPanelState('studio'); 
      setActiveDocument(null);
      persist({ rightPanelState: 'studio', tab: mainContent, courseBackendId: String(course?.backendId ?? workspaceState?.courseBackendId ?? '') });
    } else {
      setActiveDocument(doc); 
      setRightPanelState('document'); 
      persist({ rightPanelState: 'document', tab: mainContent, courseBackendId: String(course?.backendId ?? workspaceState?.courseBackendId ?? '') });
    }
  }, [course, mainContent, persist, workspaceState, rightPanelState, activeDocument]);

  return {
    course, setCourse, mainContent, setMainContent, rightPanelState, setRightPanelState,
    quizKey, backToChat, navigateToGenerateTest, openSources, openMaterials, openDocumentPanel,
    activeSources, focusedSourceId, focusedMessageId, activeQuizId, activeDocument,
    handleBackFromQuiz, loadingCourses: loading
  };
}