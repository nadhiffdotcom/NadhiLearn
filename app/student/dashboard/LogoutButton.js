"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin logout?"
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Logout gagal.");
        setLoading(false);
        return;
      }

      // Hapus token autentikasi dari sessionStorage
      sessionStorage.removeItem("nadhi_token");
      sessionStorage.removeItem("nadhi_profile");

      // Bersihkan token dari kemungkinan cookie lain
      // Penghapusan cookie tetap ditangani API logout.

      // Kembali ke homepage sebagai Guest
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Terjadi kesalahan saat logout.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      style={{ fontWeight: 600 }}
      className="rounded-lg bg-[#0a1f4a] px-5 py-2 text-base text-white transition-colors duration-200 hover:bg-white hover:text-[#101b36] hover:outline hover:outline-1 hover:outline-[#0a1f4a] disabled:opacity-60"
    >
      {loading ? "Memproses..." : "Logout"}
    </button>
  );
}