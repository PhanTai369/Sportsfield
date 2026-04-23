import React, { createContext, useContext, useState, useEffect } from 'react';
import { showToast } from '../utils/toast';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
}

interface SettingsContextType {
  settings: Settings;
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateNotificationSettings: (type: 'email' | 'sms' | 'inApp', value: boolean) => Promise<void>;
}

const defaultSettings: Settings = {
  theme: 'system',
  notifications: {
    email: true,
    sms: false,
    inApp: true
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = localStorage.getItem('userSettings');
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    
    // Apply theme
    if (settings.theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    }
  }, [settings]);

  const updateTheme = (theme: 'light' | 'dark' | 'system') => {
    setSettings(prev => ({ ...prev, theme }));
    showToast.success('Cập nhật giao diện thành công');
  };

  const updateNotificationSettings = async (type: 'email' | 'sms' | 'inApp', value: boolean) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast.auth.sessionExpired();
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/settings/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          enabled: value
        })
      });

      if (response.ok) {
        setSettings(prev => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            [type]: value
          }
        }));
        showToast.success('Cập nhật cài đặt thông báo thành công');
      } else {
        throw new Error('Failed to update notification settings');
      }
    } catch (error) {
      showToast.error('Không thể cập nhật cài đặt thông báo');
      // Revert the change in UI
      setSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [type]: !value
        }
      }));
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateTheme, updateNotificationSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}; 