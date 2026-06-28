import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Notification } from '../types';
import { translations } from '../translations';

export type Language = 'en' | 'hi';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

interface AppContextType {
  user: User | null;
  token: string | null;
  notifications: Notification[];
  unreadNotifCount: number;
  toasts: ToastMessage[];
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUserProfile: (updatedUser: User) => void;
  showToast: (text: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
  removeToast: (id: string) => void;
  refreshNotifications: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('civic_token'));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem('civic_lang') as Language) || 'en'
  );

  const setLanguage = (lang: Language) => {
    localStorage.setItem('civic_lang', lang);
    setLanguageState(lang);
  };

  const t = (text: string): string => {
    if (language === 'hi') {
      const trimmed = text.trim();
      if (translations[trimmed]) return translations[trimmed];
      
      // Case-insensitive match check
      const lowercase = trimmed.toLowerCase();
      for (const [key, val] of Object.entries(translations)) {
        if (key.toLowerCase() === lowercase) {
          return val;
        }
      }
    }
    return text;
  };

  // Prevent duplicate operations on load
  const isFetchedRef = useRef(false);

  // Show Toast Function
  const showToast = (text: string, type: 'success' | 'warning' | 'danger' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    
    // Auto remove after 3.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch Current Profile
  const refreshProfile = async () => {
    const savedToken = localStorage.getItem('civic_token');
    if (!savedToken) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else if (res.status === 401) {
        // Token expired
        logout();
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  // Fetch Notifications
  const refreshNotifications = async () => {
    const savedToken = localStorage.getItem('civic_token');
    if (!savedToken) return;

    try {
      const res = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        
        // Count unread
        const unread = data.filter((n: Notification) => !n.isRead).length;
        setUnreadNotifCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Log in
  const login = (newToken: string, userData: User) => {
    localStorage.setItem('civic_token', newToken);
    setToken(newToken);
    setUser(userData);
    showToast(`Welcome back, ${userData.name}! 🏛️`, 'success');
  };

  // Log out
  const logout = () => {
    localStorage.removeItem('civic_token');
    setToken(null);
    setUser(null);
    setNotifications([]);
    setUnreadNotifCount(0);
    showToast('Logged out successfully.', 'info');
  };

  const updateUserProfile = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // Initial load
  useEffect(() => {
    if (token && !isFetchedRef.current) {
      isFetchedRef.current = true;
      refreshProfile();
      refreshNotifications();
    }
  }, [token]);

  // Notifications Poll (every 30 seconds if logged in)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        notifications,
        unreadNotifCount,
        toasts,
        language,
        setLanguage,
        t,
        login,
        logout,
        updateUserProfile,
        showToast,
        removeToast,
        refreshNotifications,
        refreshProfile
      }}
    >
      {children}
      
      {/* Toast Overlay Portal in Bottom Right */}
      <div id="toast-portal" className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full px-4">
        {toasts.map(toast => {
          let bgClass = 'bg-slate-900 text-white';
          let borderClass = 'border-slate-800';
          let icon = 'ℹ️';

          if (toast.type === 'success') {
            bgClass = 'bg-white text-emerald-900';
            borderClass = 'border-emerald-200 shadow-emerald-100/50';
            icon = '✅';
          } else if (toast.type === 'warning') {
            bgClass = 'bg-white text-amber-900';
            borderClass = 'border-amber-200 shadow-amber-100/50';
            icon = '⚠️';
          } else if (toast.type === 'danger') {
            bgClass = 'bg-white text-rose-900';
            borderClass = 'border-rose-200 shadow-rose-100/50';
            icon = '❌';
          } else if (toast.type === 'info') {
            bgClass = 'bg-white text-blue-900';
            borderClass = 'border-blue-200 shadow-blue-100/50';
            icon = '💡';
          }

          return (
            <div
              key={toast.id}
              className={`animate-toast pointer-events-auto flex items-center justify-between gap-4 p-4 rounded-xl border ${borderClass} shadow-lg ${bgClass}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl leading-none">{icon}</span>
                <p className="text-sm font-medium">{toast.text}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs p-1"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
