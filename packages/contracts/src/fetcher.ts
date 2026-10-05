/**
 * Fetch wrapper used by every generated API hook.
 *
 * Adds the Clerk session token (Authorization: Bearer) and the browser's time zone.
 * Using a bearer header instead of cookies means a third-party site can never make
 * authenticated requests on the user's behalf (no CSRF surface).
 */

type TokenGetter = () => Promise<string | null>;

let getToken: TokenGetter = async () => null;

export function setAuthTokenGetter(getter: TokenGetter) {
  getToken = getter;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export async function customFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = await getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const timeZone = browserTimeZone();
  if (timeZone) headers.set('X-Timezone', timeZone);

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Non-JSON error body.
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
