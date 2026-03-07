let promise: Promise<any> | null = null;

export function fetchUserSettings(): Promise<any> {
  if (promise) return promise;
  promise = fetch('/api/auth/me')
    .then(r => r.ok ? r.json() : null)
    .catch(() => null);
  return promise;
}

export function clearSettingsCache() {
  promise = null;
}
