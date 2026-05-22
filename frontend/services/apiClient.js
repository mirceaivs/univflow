import axios from 'axios';


export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let refreshPromise = null;

const emitAuthLogout = () => {
  try {
    window.dispatchEvent(new CustomEvent('auth:logout'));
  } catch {
    
  }
};

const dispatchError = (err) => {
  const originalReq = err?.config;
  const status = err?.response?.status;
  const url = String(originalReq?.url || '');
  const isRefreshCall = url.includes('/auth/refresh');
  const isLoginCall = url.includes('/auth/login');
  const isAuthError = (status === 401 || status === 403) && !isLoginCall;

  if (!isRefreshCall && !isAuthError) {
    const errorData = err?.response?.data;
    if (errorData && errorData.error === 'EMAIL_NOT_VERIFIED') {
      return;
    }
    const message = errorData?.message || errorData?.error || err?.message || 'A apărut o eroare de rețea. Te rugăm să încerci din nou.';
    try {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message } }));
    } catch {}
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    
    if (!originalRequest) {
      dispatchError(error);
      return Promise.reject(error);
    }

    
    if (originalRequest.__isRetryRequest) {
      dispatchError(error);
      return Promise.reject(error);
    }

    const status = error?.response?.status;

    
    
    
    const shouldAttemptRefresh = status === 401 || status === 403;

    
    const url = String(originalRequest?.url || '');
    const isRefreshCall = url.includes('/auth/refresh');
    const isLogoutCall = url.includes('/auth/logout');
    if (!shouldAttemptRefresh || isRefreshCall || isLogoutCall) {
      dispatchError(error);
      return Promise.reject(error);
    }

    
    try {
      if (!refreshPromise) {
        refreshPromise = apiClient
          .post('/auth/refresh')
          .then(() => true)
          .catch((e) => {
            
            emitAuthLogout();
            throw e;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;

      
      originalRequest.__isRetryRequest = true;
      return apiClient(originalRequest);
    } catch (e) {
      dispatchError(e);
      return Promise.reject(e);
    }
  }
);