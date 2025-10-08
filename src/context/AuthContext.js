import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  loginWithGoogleCredential: async () => {},
  requestPasswordReset: async () => {},
  confirmPasswordReset: async () => {},
  logout: () => {},
  refreshUser: async () => {}
});

const STORAGE_KEY = 'reflora_auth_token';

function getStoredToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('Não foi possível acessar o armazenamento local.', error);
    return null;
  }
}

function setStoredToken(token) {
  if (typeof window === 'undefined') {
    return;
  }
  if (!token) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, token);
}

async function requestJson(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
  } catch (networkError) {
    const error = new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    error.cause = networkError;
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const message = data.message || data.errors?.[0]?.msg || 'Não foi possível processar a solicitação.';
    const error = new Error(message);
    error.status = response.status;
    error.details = data.errors;
    throw error;
  }

  return data;
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const enhanceUser = useCallback((rawUser) => {
    if (!rawUser) {
      return null;
    }

    return {
      ...rawUser,
      isAdmin: rawUser.role === 'admin'
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      if (!token) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const data = await requestJson('/api/auth/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (isMounted) {
          setUser(enhanceUser(data.user || null));
        }
      } catch (error) {
        console.warn('Token inválido, restaurando sessão limpa.', error);
        setStoredToken(null);
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const persistAuth = useCallback((authData) => {
    if (!authData?.token) {
      throw new Error('Resposta de autenticação inválida.');
    }
    setStoredToken(authData.token);
    setToken(authData.token);
    setUser(enhanceUser(authData.user || null));
  }, [enhanceUser]);

  const register = useCallback(async ({ name, email, password, captchaToken }) => {
    const payload = { name, email, password };
    if (typeof captchaToken === 'string' && captchaToken.trim().length > 0) {
      payload.captchaToken = captchaToken;
    }

    const data = await requestJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    persistAuth(data);
    return data.user;
  }, [persistAuth]);

  const login = useCallback(async ({ email, password }) => {
    const data = await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    persistAuth(data);
    return data.user;
  }, [persistAuth]);

  const loginWithGoogleCredential = useCallback(async (credential) => {
    const data = await requestJson('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
    persistAuth(data);
    return data.user;
  }, [persistAuth]);

  const requestPasswordReset = useCallback(async ({ email, captchaToken }) => {
    const payload = { email };
    if (typeof captchaToken === 'string' && captchaToken.trim().length > 0) {
      payload.captchaToken = captchaToken;
    }

    return requestJson('/api/auth/reset-password/request', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }, []);

  const confirmPasswordReset = useCallback(async ({ email, code, newPassword, captchaToken }) => {
    const payload = { email, code, newPassword };
    if (typeof captchaToken === 'string' && captchaToken.trim().length > 0) {
      payload.captchaToken = captchaToken;
    }

    return requestJson('/api/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const data = await requestJson('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const enhanced = enhanceUser(data.user || null);
      setUser(enhanced);
      return enhanced;
    } catch (error) {
      console.error('Não foi possível atualizar os dados do usuário.', error);
      logout();
      return null;
    }
  }, [enhanceUser, logout, token]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAdmin: Boolean(user?.isAdmin),
    register,
    login,
    loginWithGoogleCredential,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    refreshUser
  }), [
    confirmPasswordReset,
    loading,
    login,
    loginWithGoogleCredential,
    logout,
    refreshUser,
    register,
    requestPasswordReset,
    token,
    user
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
