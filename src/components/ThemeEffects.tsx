'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const SnowEffect = dynamic(() => import('./SnowEffect'), { ssr: false });

export default function ThemeEffects() {
  const { theme } = useTheme();
  const [snowEnabled, setSnowEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('monoxide-snow');
    if (saved !== null) setSnowEnabled(saved === 'true');
  }, []);

  // Listen for toggle changes from settings page
  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem('monoxide-snow');
      setSnowEnabled(saved !== 'false');
    };
    window.addEventListener('snow-toggle', handler);
    return () => window.removeEventListener('snow-toggle', handler);
  }, []);

  if (theme === 'christmas' && snowEnabled) return <SnowEffect />;
  return null;
}
