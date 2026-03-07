export function enableAboutBlankCloak() {
  const currentUrl = window.location.href;

  const win = window.open('about:blank', '_blank');
  if (!win) return false;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Google Docs</title>
  <link rel="icon" href="https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico">
  <style>
    * { margin: 0; padding: 0; }
    body { overflow: hidden; }
    iframe { width: 100vw; height: 100vh; border: none; }
  </style>
</head>
<body>
  <iframe src="${currentUrl}#cloaked" allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope" allowfullscreen></iframe>
</body>
</html>`);
  win.document.close();

  window.close();
  const panicUrl = localStorage.getItem('monoxide-panic-url') || 'https://docs.google.com';
  setTimeout(() => {
    window.location.replace(panicUrl);
  }, 100);

  return true;
}

export function checkCloakOnLoad() {
  if (typeof window === 'undefined') return;

  // Don't cloak if already inside an iframe (we ARE the cloaked version)
  if (window.self !== window.top) return;
  if (window.location.hash === '#cloaked') return;

  // Always cloak — no opt-in needed
  enableAboutBlankCloak();
}
