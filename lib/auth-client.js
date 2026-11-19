
"use client";

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

// ---------------------------------------------------------------
// Cache profil per tab agar halaman Settings bisa langsung tampil.
// Data ini hanya untuk tampilan awal; selalu disegarkan dari server.
// ---------------------------------------------------------------
const PROFILE_CACHE_KEY = "nadhi_profile";

export function getCachedProfile() {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && parsed.user ? parsed : null;
  } catch {
    return null;
  }
}

export function setCachedProfile(profile) {
  try {
    // Jangan menyimpan jika pengguna sudah logout.
    if (!sessionStorage.getItem("nadhi_token")) return;
    sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Cache bersifat opsional.
  }
}

export function clearProfileCache() {
  try {
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Cache bersifat opsional.
  }
}

// Ambil data akun dan data course/progress SECARA BERSAMAAN.
export async function fetchProfileSnapshot() {
  const [meResponse, overviewResponse] = await Promise.all([
    authFetch("/api/auth/me"),
    authFetch("/api/account/profile/overview"),
  ]);

  if (meResponse.status === 401) {
    return { unauthorized: true };
  }

  const meData = await meResponse.json().catch(() => ({}));

  if (!meResponse.ok || !meData.user) {
    throw new Error(meData.message || "Gagal mengambil data akun.");
  }

  let overview = null;
  let overviewError = "";

  try {
    const overviewData = await overviewResponse.json();

    if (overviewResponse.ok) {
      overview = overviewData.overview || {};
    } else {
      overviewError =
        overviewData.message ||
        "Gagal mengambil informasi course dan progress.";
    }
  } catch {
    overviewError = "Gagal mengambil informasi course dan progress.";
  }

  return { user: meData.user, overview, overviewError };
}

let warmingPromise = null;

// Siapkan cache di latar belakang (dipanggil saat login dan saat sidebar muncul).
export function warmProfileCache({ force = false } = {}) {
  if (typeof window === "undefined") return null;
  if (!sessionStorage.getItem("nadhi_token")) return null;
  if (!force && getCachedProfile()) return null;
  if (warmingPromise) return warmingPromise;

  warmingPromise = fetchProfileSnapshot()
    .then((snapshot) => {
      if (snapshot.user && snapshot.overview) {
        setCachedProfile({
          user: snapshot.user,
          overview: snapshot.overview,
        });
      }
    })
    .catch(() => {})
    .finally(() => {
      warmingPromise = null;
    });

  return warmingPromise;
}
