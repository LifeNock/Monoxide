'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { fetchUserSettings } from '@/lib/settingsSync';

export type Theme = 'carbon' | 'light' | 'midnight' | 'forest' | 'crimson' | 'christmas';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'carbon',
  setTheme: () => {},
});

const validThemes: Theme[] = ['carbon', 'light', 'midnight', 'forest', 'crimson', 'christmas'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('monoxide-theme') as Theme | null;
      if (saved && validThemes.includes(saved)) return saved;
    }
    return 'carbon';
  });

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  useEffect(() => {
    fetchUserSettings().then(data => {
      if (data?.settings?.theme && validThemes.includes(data.settings.theme)) {
        const dbTheme = data.settings.theme as Theme;
        setThemeState(dbTheme);
        localStorage.setItem('monoxide-theme', dbTheme);
      }
    });
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('monoxide-theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
