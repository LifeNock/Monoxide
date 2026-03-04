export type ProxyEngine = 'ultraviolet' | 'scramjet';

export async function registerServiceWorker(engine: ProxyEngine): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }

  const swPath = engine === 'ultraviolet' ? '/sw-uv.js' : '/sw-scram.js';
  const scope = engine === 'ultraviolet' ? '/uv/service/' : '/scram/service/';

  const registration = await navigator.serviceWorker.register(swPath, { scope });
  await navigator.serviceWorker.ready;

  // Set up bare-mux transport via dynamic script
  // BareMux is loaded as a global from the static files served at /baremux/
  if (typeof window !== 'undefined' && (window as any).BareMux) {
    const connection = new (window as any).BareMux.BareMuxConnection('/baremux/worker.js');
    await connection.setTransport('/epoxy/index.mjs', [{ wisp: `wss://${location.host}/wisp/` }]);
  }

  return registration;
}
