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
      color: 'var(--text-secondary)',
      fontSize: '0.8rem',
      fontStyle: 'italic',
      textAlign: 'center',
      maxWidth: 400,
      margin: '0 auto',
    }}>
      {fact}
    </p>
  );
}
