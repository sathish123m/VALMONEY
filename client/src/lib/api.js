/**
 * Thin API client.
 *
 * Responsibilities kept deliberately narrow: resolve the base URL, attach the
 * bearer token, normalise errors into `ApiError`, and notify the app when the
 * session dies so it can bounce the user to sign-in.
 */

const RAW_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5001';

export const API_BASE = RAW_BASE.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { status = 0, details = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.cause = cause;
  }

  /** Field-level messages, shaped for form errors. */
  get fieldErrors() {
    if (!Array.isArray(this.details)) return {};
    return this.details.reduce((acc, item) => {
      if (item?.field) acc[item.field] = item.message;
      return acc;
    }, {});
  }
}

let getToken = () => null;
let onUnauthorized = () => {};

/** The auth context owns the token; this keeps the client decoupled from it. */
export function configureApi({ tokenProvider, unauthorizedHandler } = {}) {
  if (tokenProvider) getToken = tokenProvider;
  if (unauthorizedHandler) onUnauthorized = unauthorizedHandler;
}

async function request(path, { method = 'GET', body, signal, headers = {}, isForm = false } = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const token = getToken();

  const finalHeaders = {
    Accept: 'application/json',
    ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      signal,
      ...(body === undefined ? {} : { body: isForm ? body : JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(
      `Cannot reach the VALMONEY API at ${API_BASE}. Is the server running?`,
      { status: 0, cause: error },
    );
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    if (response.status === 401) onUnauthorized();

    const message =
      (isJson && (payload?.error || payload?.message)) ||
      (typeof payload === 'string' && payload) ||
      `Request failed with status ${response.status}`;

    throw new ApiError(message, {
      status: response.status,
      details: isJson ? payload?.details ?? null : null,
    });
  }

  return payload;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, body, options) => request(path, { ...options, method: 'DELETE', body }),
  upload: (path, formData, options) => request(path, { ...options, method: 'POST', body: formData, isForm: true }),
};

/** Build a query string, dropping empty values. */
export function query(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const asString = search.toString();
  return asString ? `?${asString}` : '';
}

/**
 * Trigger a browser download for an authenticated endpoint.
 * A plain <a href> cannot carry the Authorization header, so the file is
 * fetched as a blob and handed to a temporary object URL.
 */
export async function downloadFile(path, fallbackName = 'download') {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new ApiError('That export could not be generated.', { status: response.status });
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const filename = match?.[1] ? decodeURIComponent(match[1]) : fallbackName;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
