
export async function authFetch(url, options = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("nadhi_token")
      : null;

  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
