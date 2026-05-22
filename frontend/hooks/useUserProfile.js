import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient.js';


export const useUserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  
  const firstName = profile?.firstName ?? profile?.firstname ?? '';
  const lastName = profile?.lastName ?? profile?.lastname ?? '';
  const email = profile?.email ?? '';
  const profilePic =
    profile?.profilePic ??
    profile?.avatarUrl ??
    profile?.photoUrl ??
    profile?.imageUrl ??
    '';

  const userFullName = useMemo(() => {
    return `${firstName} ${lastName}`.trim();
  }, [firstName, lastName]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.get('/users/me');
      setProfile(data);
      return data;
    } catch (e) {
      setProfile(null);
      setError(e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  
  const updateProfile = useCallback(
    async (patch) => {
      setIsSaving(true);
      setError(null);

      try {
        
        const payload = { ...(profile ?? {}), ...(patch ?? {}) };
        const { data } = await apiClient.put('/users/me', payload);
        setProfile(data);
        return data;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setIsSaving(false);
      }
    },
    [profile]
  );

  
  const updateName = useCallback(
    ({ firstName: fn, lastName: ln }) => {
      const patch = {};
      if (typeof fn === 'string') patch.firstName = fn;
      if (typeof ln === 'string') patch.lastName = ln;
      return updateProfile(patch);
    },
    [updateProfile]
  );

  const updateEmail = useCallback(
    (nextEmail) => {
      if (typeof nextEmail !== 'string') return Promise.resolve(null);
      return updateProfile({ email: nextEmail });
    },
    [updateProfile]
  );

  const updateProfilePic = useCallback(
    (nextUrl) => {
      if (typeof nextUrl !== 'string') return Promise.resolve(null);
      
      return updateProfile({ profilePic: nextUrl, avatarUrl: nextUrl });
    },
    [updateProfile]
  );

  return {
    
    profile,

    
    firstName,
    lastName,
    email,
    profilePic,
    userFullName,

    
    isLoading,
    isSaving,
    error,

    
    refresh,
    updateProfile,
    updateName,
    updateEmail,
    updateProfilePic,
  };
};