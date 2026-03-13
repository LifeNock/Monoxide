export function enableAboutBlankCloak() {
  // Instead of window.open (which triggers popup blockers),
  // we replace the current document with an about:blank-style iframe approach.
  // This uses history.replaceState + document.write to transform the current tab.
  const currentUrl = window.location.href;

  // Create a blob URL that contains an iframe back to our site
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>My Drive - Google Drive</title>
  <link rel="icon" href="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png">
  <style>
    * { margin: 0; padding: 0; }
    body { overflow: hidden; }
    iframe { width: 100vw; height: 100vh; border: none; }
  </style>
</head>
<body>
  <iframe src="${currentUrl}#cloaked" allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope" allowfullscreen></iframe>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);

  // Replace current tab's location with the blob URL (acts like about:blank, no popup needed)
  window.location.replace(blobUrl);

  return true;
}

export function checkCloakOnLoad() {
  if (typeof window === 'undefined') return;

  // Don't cloak if already inside an iframe (we ARE the cloaked version)
  if (window.self !== window.top) return;
  if (window.location.hash === '#cloaked') return;

  // Already on a blob URL means cloak is active
  if (window.location.protocol === 'blob:') return;

  // Always cloak — no opt-in needed
  enableAboutBlankCloak();
}
