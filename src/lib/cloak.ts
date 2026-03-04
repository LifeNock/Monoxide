export function enableAboutBlankCloak() {
  const currentUrl = window.location.href;
  const panicUrl = localStorage.getItem('monoxide-panic-url') || 'https://www.google.com';

  // Open about:blank window
  const win = window.open('about:blank', '_blank');
  if (!win) return;

  // Write iframe into about:blank
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Google Docs</title>
      <link rel="icon" href="https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico">
      <style>
        body { margin: 0; overflow: hidden; }
        iframe { width: 100vw; height: 100vh; border: none; }
      </style>
    </head>
    <body>
      <iframe src="${currentUrl}"></iframe>
    </body>
    </html>
  `);
  win.document.close();

  // Redirect original tab
  window.location.href = panicUrl;
}

export function checkCloakOnLoad() {
  if (typeof window === 'undefined') return;
  const enabled = localStorage.getItem('monoxide-cloak') === 'true';
  if (enabled && window.self === window.top) {
    // Only cloak if we're the top-level window (not already in iframe)
    enableAboutBlankCloak();
  }
}
