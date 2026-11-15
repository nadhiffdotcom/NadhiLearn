"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherApplicationActions({ userId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(status) {
    const action = status === "approved" ? "menyetujui" : "menolak";

    if (!confirm(`Apakah kamu yakin ingin ${action} pengajuan ini?`)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/teacher-applications/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Gagal memproses pengajuan.");
        return;
      }

      alert(data.message);
      router.refresh();
    } catch (error) {
      alert("Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3 mt-4">
      <button
        onClick={() => handleAction("approved")}
        disabled={loading}
        className="bg-white text-[#0B1F3A] border border-white px-5 py-2 rounded-lg font-bold hover:bg-[#0B1F3A] hover:text-white disabled:opacity-50"
      >
        {loading ? "Memproses..." : "Setujui"}
      </button>

      <button
        onClick={() => handleAction("rejected")}
        disabled={loading}
        className="bg-[#fcfcfc] text-[#0B1F3A] border border-white px-5 py-2 rounded-lg font-bold hover:bg-[#0B1F3A]   hover:text-[#ffffff] disabled:opacity-50"
      >
        {loading ? "Memproses..." : "Tolak"}
      </button>
    </div>
  );
}
