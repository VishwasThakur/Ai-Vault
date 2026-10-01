import { createContext, useContext, useState, useEffect } from 'react';
import { getProfile } from '../services/api';

const TOKEN_KEY = 'vaultai_token';
const USER_KEY = 'vaultai_user';
const VAULT_TOKEN_KEY = 'vaultai_critical_token';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [vaultToken, setVaultToken] = useState(() => sessionStorage.getItem(VAULT_TOKEN_KEY) || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getProfile(token)
        .then((res) => {
          if (res.user) {
            setUser(res.user);
            localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          }
        })
        .catch((err) => {
          if (err.unauthorized) {
            logout();
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setVaultToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(VAULT_TOKEN_KEY);
  };

  const updateUser = (updated) => {
    setUser((prev) => {
      const merged = { ...prev, ...updated };
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  const unlockVault = (newVaultToken) => {
    setVaultToken(newVaultToken);
    sessionStorage.setItem(VAULT_TOKEN_KEY, newVaultToken);
  };

  const lockVault = () => {
    setVaultToken(null);
    sessionStorage.removeItem(VAULT_TOKEN_KEY);
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await getProfile(token);
      if (res.user) {
        setUser(res.user);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      }
    } catch (err) {
      if (err.unauthorized) {
        logout();
      }
    }
  };

  const value = {
    token,
    user,
    vaultToken,
    isAuthenticated: Boolean(token),
    isVaultUnlocked: Boolean(vaultToken),
    loading,
    login,
    logout,
    refreshProfile,
    updateUser,
    unlockVault,
    lockVault,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
