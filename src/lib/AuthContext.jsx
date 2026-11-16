import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session via /auth/refresh on initial mount
  useEffect(() => {
    let mounted = true;

    function formatUser(user) {
      if (!user) return null;
      const normalizedId = user._id || user.id;
      return {
        ...user,
        _id: normalizedId,
        id: normalizedId,
        username: user.name || user.collegeId || (user.email ? user.email.split('@')[0] : 'Campus Member'),
      };
    }

    async function restoreSession() {
      try {
        const refreshData = await authService.refreshToken();
        if (refreshData?.success) {
          const me = await authService.getMe();
          if (mounted) {
            setCurrentUser(formatUser(me));
            chatService.connectSocket();
          }
        }
      } catch {
        // No active refresh token or expired session
        if (mounted) {
          setCurrentUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    // Listen for unauthorized events emitted by Axios interceptor
    const handleUnauthorized = () => {
      setCurrentUser(null);
      chatService.disconnectSocket();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      mounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      isLoading,
      async requestOtp(email) {
        return authService.requestOtp(email);
      },
      async verifyOtp(email, otp, name = '') {
        const res = await authService.verifyOtp(email, otp, name);
        if (res.data?.user) {
          const formatted = {
            ...res.data.user,
            _id: res.data.user._id || res.data.user.id,
            id: res.data.user.id || res.data.user._id,
            username: res.data.user.name || res.data.user.collegeId || res.data.user.email.split('@')[0],
          };
          setCurrentUser(formatted);
          chatService.connectSocket();
        }
        return res;
      },
      async updateUsername(name) {
        if (!name || !name.trim()) return false;
        try {
          const updated = await authService.updateProfile({ name });
          const normalizedId = updated._id || updated.id;
          setCurrentUser((prev) => ({
            ...prev,
            ...updated,
            _id: normalizedId || prev?._id,
            id: normalizedId || prev?.id,
            username: updated.name || updated.collegeId || (updated.email ? updated.email.split('@')[0] : prev?.username),
          }));
          return true;
        } catch {
          return false;
        }
      },
      async logout() {
        try {
          await authService.logout();
        } finally {
          setCurrentUser(null);
          chatService.disconnectSocket();
        }
      },
    }),
    [currentUser, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
