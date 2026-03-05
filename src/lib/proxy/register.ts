export type ProxyEngine = 'ultraviolet' | 'scramjet';

export async function registerServiceWorker(engine: ProxyEngine): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported in this browser');
  }

  const swPath = engine === 'ultraviolet' ? '/sw-uv.js' : '/sw-scram.js';
  const scope = engine === 'ultraviolet' ? '/uv/service/' : '/scram/service/';

  const reg = await navigator.serviceWorker.register(swPath, { scope });

  // Wait for SW to activate
  if (reg.installing) {
    await new Promise<void>((resolve, reject) => {
      const sw = reg.installing!;
      const timeout = setTimeout(() => reject(new Error('Service worker install timed out')), 10000);
      sw.addEventListener('statechange', function handler() {
        if (sw.state === 'activated' || (sw.state as string) === 'active') {
          clearTimeout(timeout);
          sw.removeEventListener('statechange', handler);
          resolve();
        } else if (sw.state === 'redundant') {
          clearTimeout(timeout);
          sw.removeEventListener('statechange', handler);
          reject(new Error('Service worker became redundant'));
        }
      });
    });
  }

  await navigator.serviceWorker.ready;
}
