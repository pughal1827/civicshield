export function getStoredWorkerUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('civicshield_worker_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredWorkerToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('civicshield_worker_token') || null;
  } catch {
    return null;
  }
}

export function setStoredWorker(user: any, token?: string) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem('civicshield_worker_user', JSON.stringify(user));
    }
    if (token) {
      localStorage.setItem('civicshield_worker_token', token);
    }
  } catch {}
}

export function clearStoredWorker() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('civicshield_worker_user');
    localStorage.removeItem('civicshield_worker_token');
  } catch {}
}

export function getWorkerAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders || {}),
  };

  const user = getStoredWorkerUser();
  const token = getStoredWorkerToken();

  if (user?.email) {
    headers['x-worker-email'] = user.email;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}
