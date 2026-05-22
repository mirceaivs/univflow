import { useCallback, useState } from 'react';

export const useSidebar = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const toggleSidebar = useCallback(() => setIsSidebarExpanded((v) => !v), []);

  return { isSidebarExpanded, setIsSidebarExpanded, toggleSidebar };
};