
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth-client";

export default function TeacherApplicationActions({ userId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleAction(status) {
    const actionText = status === "approved" ? "menyetujui" : "menolak";

    if (!confirm(`Yakin ingin ${actionText} pengajuan Teacher ini?`)) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await authFetch(
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
        setMessage(data.message || "Gagal memproses pengajuan.");
        return;
      }

      setMessage(data.message || "Pengajuan berhasil diproses.");
      router.refresh();
    } catch (error) {
      console.error("Teacher application error:", error);
      setMessage("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleAction("approved")}
          disabled={loading}
          style={{ fontWeight: 600 }}
          className="rounded-lg bg-[#0B1F3A] px-5 py-2 text-base text-white transition-colors duration-200 hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A] disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Approve"}
        </button>

        <button
          type="button"
          onClick={() => handleAction("rejected")}
          disabled={loading}
          style={{ fontWeight: 600 }}
          className="rounded-lg bg-[#0B1F3A] px-5 py-2 text-base text-white transition-colors duration-200 hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A] disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Reject"}
        </button>
      </div>

      {message && (
        <p className="text-xs text-gray-600">{message}</p>
      )}
    </div>
  );
}
