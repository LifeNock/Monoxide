'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { fetchUserSettings } from '@/lib/settingsSync';

export type FontOption = 'barlow' | 'rajdhani' | 'space-grotesk' | 'ibm-plex-sans';

const fontFamilyMap: Record<FontOption, string> = {
  barlow: 'var(--font-barlow), sans-serif',
  rajdhani: 'var(--font-rajdhani), sans-serif',
  'space-grotesk': 'var(--font-space-grotesk), sans-serif',
  'ibm-plex-sans': 'var(--font-ibm-plex-sans), sans-serif',
};

const validFonts: FontOption[] = ['barlow', 'rajdhani', 'space-grotesk', 'ibm-plex-sans'];

interface FontContextType {
  font: FontOption;
  setFont: (font: FontOption) => void;
}

const FontContext = createContext<FontContextType>({
  font: 'barlow',
  setFont: () => {},
});

export function FontProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<FontOption>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('monoxide-font') as FontOption | null;
      if (saved && fontFamilyMap[saved]) return saved;
    }
    return 'barlow';
  });

  const applyFont = useCallback((f: FontOption) => {
    document.documentElement.style.setProperty('--font-body', fontFamilyMap[f]);
  }, []);

  useEffect(() => {
    applyFont(font);
  }, [font, applyFont]);

  useEffect(() => {
    fetchUserSettings().then(data => {
      if (data?.settings?.font && validFonts.includes(data.settings.font)) {
        const dbFont = data.settings.font as FontOption;
        setFontState(dbFont);
        localStorage.setItem('monoxide-font', dbFont);
      }
    });
  }, []);

  const setFont = (f: FontOption) => {
    setFontState(f);
    localStorage.setItem('monoxide-font', f);
  };

  return (
    <FontContext.Provider value={{ font, setFont }}>
      {children}
    </FontContext.Provider>
  );
}

export const useFont = () => useContext(FontContext);
