'use client';

import { useState, useEffect } from 'react';
import { getRandomFact } from '@/data/funFacts';

export default function FunFact() {
  const [fact, setFact] = useState('');

  useEffect(() => {
    setFact(getRandomFact());
  }, []);

  if (!fact) return null;

  return (
    <p style={{
      color: 'var(--text-muted)',
      fontSize: '0.75rem',
      textAlign: 'center',
      maxWidth: 380,
      margin: '0 auto',
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    }}>
      {fact}
    </p>
  );
}
