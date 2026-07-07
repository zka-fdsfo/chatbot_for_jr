import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthContext from './authContext';
import authService from '../services/authService';
import { setAccessToken, clearAccessToken, setOnSessionExpired } from '../services/apiClient';

const STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(STATUS.LOADING);

  useEffect(() => {
    setOnSessionExpired(() => {
      setUser(null);
      setStatus(STATUS.UNAUTHENTICATED);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    authService
      .refresh()
      .then((data) => {
        if (!isMounted) return;
        setAccessToken(data.accessToken);
        setUser(data.user);
        setStatus(STATUS.AUTHENTICATED);
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus(STATUS.UNAUTHENTICATED);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus(STATUS.AUTHENTICATED);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearAccessToken();
      setUser(null);
      setStatus(STATUS.UNAUTHENTICATED);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: status === STATUS.AUTHENTICATED,
      isLoading: status === STATUS.LOADING,
      login,
      logout,
    }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
