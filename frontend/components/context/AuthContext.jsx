import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth as useAuthInternal } from '../../hooks/useAuth.js';

const AuthContext = createContext(null);


export const AuthProvider = ({ children, onLogin }) => {
  const auth = useAuthInternal({ onLogin });

  
  useEffect(() => {
    const handler = () => {
      
      
      
      auth.logout?.();
    };

    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [auth]);

  
  const value = useMemo(() => auth, [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>.');
  return ctx;
};