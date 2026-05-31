import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient.js';

export const useAuth = ({ onLogin } = {}) => {
  
  const [authMode, setAuthMode] = useState('login');
  const [resetSent, setResetSent] = useState(false);
  const [isRegisterSuccess, setIsRegisterSuccess] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [highlightAuth, setHighlightAuth] = useState(false);

  
  const [resetToken, setResetToken] = useState('');

  
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  
  const [isAuthLoading, setIsAuthLoading] = useState(true); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [error, setError] = useState(null);

  
  const checkAuth = useCallback(async () => {
    setIsAuthLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.get('/users/me');
      setUser(data);
      setIsAuthenticated(true);
      return data;
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const { data } = await apiClient.post('/auth/login', { email, password });
        await checkAuth();
        return data;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [checkAuth]
  );

  const register = useCallback(async ({ email, password, firstName, lastName }) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data } = await apiClient.post('/auth/register', {
        email,
        password,
        firstName,
        lastName,
      });
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  
  const logout = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    const hadSession = user !== null || isAuthenticated;

    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsSubmitting(false);

      
      try {
        const preservedTheme = localStorage.getItem('theme');
        localStorage.clear();
        if (preservedTheme === 'dark' || preservedTheme === 'light') {
          localStorage.setItem('theme', preservedTheme);
        }
      } catch {
        
      }

      
      
      if (hadSession) {
        try {
          window.location.replace('/');
        } catch {
          window.location.href = '/';
        }
      }
    }
  }, [user, isAuthenticated]);

  
  const resendCode = useCallback(async (email) => {
    const { data } = await apiClient.post('/auth/resend-verification', null, { params: { email } });
    return data;
  }, []);

  const verifyEmail = useCallback(async (token) => {
    const { data } = await apiClient.get('/auth/verify', { params: { token } });
    return data;
  }, []);

  const verifyEmailChange = useCallback(async (token) => {
    const { data } = await apiClient.get('/auth/verify-email-change', { params: { token } });
    return data;
  }, []);

  
  const requestPasswordReset = useCallback(async (email) => {
    const { data } = await apiClient.post('/auth/forgot-password', null, { params: { email } });
    return data;
  }, []);

  const confirmPasswordReset = useCallback(async ({ token, newPassword }) => {
    const { data } = await apiClient.post('/auth/reset-password', null, {
      params: { token, newPassword },
    });
    return data;
  }, []);

  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const token = params.get('token');

    if (!mode || !token) return;

    const clearUrl = () => {
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, document.title, url.toString());
    };

    const run = async () => {
      try {
        if (mode === 'verify') {
          setIsSubmitting(true);
          await verifyEmail(token);
          await checkAuth();
          clearUrl();
          onLogin?.();
          return;
        }

        if (mode === 'reset') {
          setAuthMode('forgot-password');
          setResetToken(token);
          clearUrl();
          return;
        }

        if (mode === 'verify-email-change') {
          setIsSubmitting(true);
          await verifyEmailChange(token);
          clearUrl();
          
          logout();
          return;
        }
      } catch (e) {
        clearUrl();
        setError(e);
      } finally {
        setIsSubmitting(false);
      }
    };

    void run();
    
  }, []);

  
  const handleSubmit = useCallback(
    async (e, payload) => {
      e.preventDefault();

      try {
        if (authMode === 'register') {
          await register(payload);
          setVerificationEmail(payload.email);
          setIsRegisterSuccess(true);
        } else {
          await login(payload);
          onLogin?.();
        }
      } catch (err) {
        if (err?.response?.data?.error === 'EMAIL_NOT_VERIFIED') {
          setVerificationEmail(payload.email);
          setIsRegisterSuccess(true);
        }
      }
    },
    [authMode, login, onLogin, register]
  );

  const handleResetPassword = useCallback(
    async (e, email) => {
      e.preventDefault();
      setResetSent(true);
      try {
        await requestPasswordReset(email);
      } catch {
        setResetSent(false);
      }
    },
    [requestPasswordReset]
  );

  const backToLogin = useCallback(() => {
    setAuthMode('login');
    setResetToken('');
    setTimeout(() => {
      setResetSent(false);
      setIsRegisterSuccess(false);
      setVerificationEmail('');
    }, 300);
  }, []);

  const handleStartNow = useCallback(() => {
    setAuthMode('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setHighlightAuth(false);
    setTimeout(() => {
      setHighlightAuth(true);
      setTimeout(() => setHighlightAuth(false), 1200);
    }, 150);
  }, []);

  
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return {
    
    user,
    isAuthenticated,
    isAuthLoading,

    
    authMode,
    setAuthMode,
    resetSent,
    isRegisterSuccess,
    verificationEmail,
    highlightAuth,

    
    resetToken,

    
    isSubmitting,
    error,

    
    handleSubmit,
    handleResetPassword,
    backToLogin,
    handleStartNow,

    
    checkAuth,
    login,
    register,
    logout,
    resendCode,
    verifyEmail,
    verifyEmailChange,
    requestPasswordReset,
    confirmPasswordReset,
  };
};