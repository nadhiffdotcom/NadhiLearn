
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeacherApplicationActions({ userId }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [message, setMessage] = useState("");

  function openConfirmation(status) {
    setMessage("");
    setSelectedStatus(status);
  }

  function closeConfirmation() {
    if (loading) return;
    setSelectedStatus(null);
  }

  async function handleAction() {
    if (!selectedStatus || loading) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/teacher-applications/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: selectedStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Gagal memproses pengajuan.");
        return;
      }

      setSelectedStatus(null);
      window.alert(data.message);
      router.refresh();
    } catch (error) {
      console.error("Teacher application error:", error);
      setMessage("Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  }

  const buttonStyle =
    "rounded-lg border-2 border-[#0B1F3A] bg-white px-6 py-2.5 font-bold text-[#0B1F3A] transition-all duration-200 hover:bg-[#0B1F3A] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => openConfirmation("approved")}
          disabled={loading}
          className={buttonStyle}
        >
          Setujui
        </button>

        <button
          type="button"
          onClick={() => openConfirmation("rejected")}
          disabled={loading}
          className={buttonStyle}
        >
          Tolak
        </button>
      </div>

      {selectedStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1F3A]/80 p-5">
          <div className="w-full max-w-md rounded-2xl border-2 border-[#0B1F3A] bg-white p-7 text-[#0B1F3A] shadow-2xl">

            <h2 className="mb-3 text-2xl font-bold">
              Konfirmasi Pengajuan
            </h2>

            <p className="mb-6">
              {selectedStatus === "approved"
                ? "Apakah kamu yakin ingin menyetujui pengajuan Teacher ini? Pengguna akan mendapatkan akses sebagai Teacher."
                : "Apakah kamu yakin ingin menolak pengajuan Teacher ini?"}
            </p>

            {message && (
              <p className="mb-4 rounded-lg border-2 border-[#0B1F3A] p-3 font-semibold">
                {message}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={loading}
                className="rounded-lg border-2 border-[#0B1F3A] bg-white px-5 py-2 font-bold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-white"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleAction}
                disabled={loading}
                className="rounded-lg border-2 border-[#0B1F3A] bg-[#0B1F3A] px-5 py-2 font-bold text-white transition hover:bg-white hover:text-[#0B1F3A]"
              >
                {loading
                  ? "Memproses..."
                  : selectedStatus === "approved"
                    ? "Ya, Setujui"
                    : "Ya, Tolak"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
