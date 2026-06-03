import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
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
    let message = errorData?.message || errorData?.error || err?.message || 'A apărut o eroare de rețea. Te rugăm să încerci din nou.';
    if (message === 'Bad credentials' || message === 'bad credentials') {
      message = 'Email sau parolă incorectă.';
    }
    try {
      window.dispatchEvent(new CustomEvent('app:error', { detail: { message } }));
    } catch {}
  }
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    
    const isIapError = error?.response?.headers?.['x-goog-iap-generated-response'] === 'true' ||
                       error?.response?.headers?.['x-goog-iap-generated-response'] === true;

    if (isIapError) {
      try {
        window.location.replace('/');
      } catch {
        window.location.reload();
      }
      return Promise.reject(error);
    }

    const originalRequest = error?.config;

    if (!originalRequest) {
      dispatchError(error);
      return Promise.reject(error);
    }

    const status = error?.response?.status;
    const isNetworkError = !error.response;
    const is5xx = status >= 500 && status <= 599;
    const is409 = status === 409;
    const isRetryable = isNetworkError || is5xx || is409;

    const url = String(originalRequest?.url || '');
    const isRefreshCall = url.includes('/auth/refresh');
    const isLogoutCall = url.includes('/auth/logout');

    if (isRetryable && !isRefreshCall && !isLogoutCall) {
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount += 1;
        const delay = is409 ? 2000 : 1500 * originalRequest._retryCount;
        console.warn(`Request failed (${status || 'Network Error'}). Retrying ${originalRequest._retryCount}/3 in ${delay}ms...`, originalRequest.url);
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiClient(originalRequest);
      }
    }

    if (originalRequest.__isRetryRequest) {
      dispatchError(error);
      return Promise.reject(error);
    }

    const shouldAttemptRefresh = status === 401 || status === 403;

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