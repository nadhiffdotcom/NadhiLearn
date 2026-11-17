
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
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
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Logout gagal.");
        setLoading(false);
        return;
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
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
      className="rounded-lg bg-[#0B1F3A] px-5 py-2 text-base text-white transition-colors duration-200 hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A] disabled:opacity-60"
    >
      {loading ? "Memproses..." : "Logout"}
    </button>
  );
}
