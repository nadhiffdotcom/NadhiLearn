
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelEnrollmentButton({ courseId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin membatalkan keikutsertaan pada course ini? Progress belajarmu akan tetap tersimpan dan bisa dilanjutkan jika kamu mengikuti course ini kembali."
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch("/api/home/courses", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Gagal membatalkan keikutsertaan course.");
        return;
      }

      alert(result.message || "Keikutsertaan course berhasil dibatalkan.");
      router.refresh();
    } catch (error) {
      console.error("Cancel enrollment error:", error);
      alert("Terjadi kesalahan saat membatalkan keikutsertaan course.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={loading}
      className="mt-3 block w-full rounded-lg border border-red-200 px-4 py-3 text-center text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Memproses..." : "Batalkan Keikutsertaan"}
    </button>
  );
}
