'use client';

import { useEffect } from 'react';
import { checkCloakOnLoad } from '@/lib/cloak';

export default function CloakGuard() {
  useEffect(() => {
    checkCloakOnLoad();
  }, []);
  return null;
}
