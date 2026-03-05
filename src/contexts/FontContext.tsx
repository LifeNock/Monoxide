'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type FontOption = 'barlow' | 'rajdhani' | 'space-grotesk' | 'ibm-plex-sans';

// Use the CSS variables that Next.js font loader creates
const fontFamilyMap: Record<FontOption, string> = {
  barlow: 'var(--font-barlow), sans-serif',
  rajdhani: 'var(--font-rajdhani), sans-serif',
  'space-grotesk': 'var(--font-space-grotesk), sans-serif',
  'ibm-plex-sans': 'var(--font-ibm-plex-sans), sans-serif',
};

interface FontContextType {
  font: FontOption;
  setFont: (font: FontOption) => void;
}

const FontContext = createContext<FontContextType>({
  font: 'barlow',
  setFont: () => {},
});

export function FontProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<FontOption>('barlow');

  useEffect(() => {
    const saved = localStorage.getItem('monoxide-font') as FontOption | null;
    if (saved && fontFamilyMap[saved]) setFontState(saved);
  }, []);

  const setFont = (f: FontOption) => {
    setFontState(f);
    localStorage.setItem('monoxide-font', f);
    document.documentElement.style.setProperty('--font-body', fontFamilyMap[f]);
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--font-body', fontFamilyMap[font]);
  }, [font]);

  return (
    <FontContext.Provider value={{ font, setFont }}>
      {children}
    </FontContext.Provider>
  );
}

export const useFont = () => useContext(FontContext);
