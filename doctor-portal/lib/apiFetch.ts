import Session from "supertokens-web-js/recipe/session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * fetch() wrapper that attaches the current SuperTokens access token and,
 * if the request comes back 401 (token expired — getAccessToken() alone
 * never refreshes it), attempts a session refresh and retries the request
 * once with the new token. Without this, every page that reads its own
 * access token via Session.getAccessToken() silently stops getting data
 * the moment the token expires, since a 401 looks just like "no data" to
 * the caller unless they specifically check for it.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const doFetch = async () => {
    const token = await Session.getAccessToken();
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await Session.attemptRefreshingSession().catch(() => false);
    if (refreshed) {
      res = await doFetch();
    }
  }

  return res;
}
