import { useSidebar } from './useSidebar.js';
import { useTheme } from './useTheme.js';
import { useUserProfile } from './useUserProfile.js';

export const useSettings = () => {
  const theme = useTheme();
  const sidebar = useSidebar();
  const profile = useUserProfile();

  return {
    ...theme,
    ...sidebar,
    ...profile,
  };
};
