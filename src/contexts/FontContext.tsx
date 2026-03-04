'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type FontOption = 'barlow' | 'rajdhani' | 'space-grotesk' | 'ibm-plex-sans';

const fontFamilyMap: Record<FontOption, string> = {
  barlow: "'Barlow', sans-serif",
  rajdhani: "'Rajdhani', sans-serif",
  'space-grotesk': "'Space Grotesk', sans-serif",
  'ibm-plex-sans': "'IBM Plex Sans', sans-serif",
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
    if (saved) setFontState(saved);
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
