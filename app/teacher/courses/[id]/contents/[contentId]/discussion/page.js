
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/auth-client";

export default function TeacherDiscussionPage() {
  const params = useParams();

  const courseId = params.id;
  const contentId = params.contentId;

  const [content, setContent] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  // ========================================
  // LOAD DISCUSSION
  // ========================================
  async function loadDiscussion() {
    try {
      setLoading(true);
      setError("");

      const response = await authFetch(
        `/api/teacher/comments?content_id=${contentId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil diskusi.");
      }

      setContent(data.content);
      setComments(data.comments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (contentId) {
      loadDiscussion();
    }
  }, [contentId]);

  // ========================================
  // SEND COMMENT
  // ========================================
  async function handleSubmit(e) {
    e.preventDefault();

    if (!comment.trim()) {
      alert("Komentar tidak boleh kosong.");
      return;
    }

    try {
      setSending(true);
      setError("");

      const response = await authFetch(
        "/api/teacher/comments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content_id: Number(contentId),
            comment: comment.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengirim komentar.");
      }

      setComments((previous) => [
        ...previous,
        data.comment,
      ]);

      setComment("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // ========================================
  // DELETE COMMENT
  // ========================================
  async function handleDeleteComment(commentId) {
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin menghapus komentar ini?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(commentId);
      setError("");

      const response = await authFetch(
        `/api/teacher/comments?id=${commentId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal menghapus komentar."
        );
      }

      setComments((previous) =>
        previous.filter(
          (item) => Number(item.id) !== Number(commentId)
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // ========================================
  // FORMAT DATE
  // ========================================
  function formatDate(date) {
    return new Date(date).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="min-h-screen bg-[#f4f7fc] p-6 md:p-8">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="mb-8">
          <Link
            href={`/teacher/courses/${courseId}/contents`}
            className="mb-3 inline-block text-sm font-semibold text-gray-500 hover:text-[#101b36]"
          >
            &larr; Kembali ke Content Management
          </Link>

          <h1 className="text-2xl font-bold text-[#101b36]">
            Diskusi Materi
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Lihat dan tanggapi diskusi Student pada materi kursus.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CONTENT INFORMATION */}
        {loading ? (
          <div className="rounded-xl border border-[#dce3ef] bg-white p-8 text-center text-gray-500">
            Memuat diskusi...
          </div>
        ) : content ? (
          <>
            <div className="mb-6 rounded-xl border border-[#dce3ef] bg-white p-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {content.course_title}
              </p>

              <h2 className="text-xl font-bold text-[#101b36]">
                {content.title}
              </h2>

              {content.description && (
                <p className="mt-2 text-sm text-gray-600">
                  {content.description}
                </p>
              )}
            </div>

            {/* DISCUSSION LIST */}
            <div className="mb-6 rounded-xl border border-[#dce3ef] bg-white p-6">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#101b36]">
                  Diskusi
                </h2>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {comments.length} Komentar
                </span>
              </div>

              {comments.length === 0 ? (
                <div className="rounded-lg bg-[#f4f7fc] px-5 py-10 text-center">
                  <p className="text-sm font-semibold text-gray-600">
                    Belum ada diskusi.
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Komentar Student akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-gray-100 bg-[#f4f7fc] p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a1f4a] text-sm font-bold text-white">
                            {(item.display_name || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-[#101b36]">
                              {item.display_name || "Nama belum diatur"}
                            </p>

                            <p className="text-xs text-gray-400">
                              {item.email}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.role === "teacher"
                              ? "bg-blue-50 text-blue-700"
                              : item.role === "admin"
                              ? "bg-[#e7edf7] text-[#0a1f4a]"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {item.role}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                        {item.comment}
                      </p>

                      <p className="mt-3 text-xs text-gray-400">
                        {formatDate(item.created_at)}
                      </p>

                      {/* DELETE COMMENT */}
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteComment(item.id)
                          }
                          disabled={deletingId === item.id}
                          className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === item.id
                            ? "Menghapus..."
                            : "Hapus Komentar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEND COMMENT */}
            <div className="rounded-xl border border-[#dce3ef] bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-[#101b36]">
                Tambahkan Komentar
              </h2>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="5"
                  maxLength={2000}
                  placeholder="Tulis komentar atau tanggapan untuk Student..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#c2cce0]"
                />

                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="text-xs text-gray-400">
                    {comment.length}/2000 karakter
                  </p>

                  <button
                    type="submit"
                    disabled={sending || !comment.trim()}
                    className="rounded-lg bg-[#0a1f4a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1b3a7a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? "Mengirim..." : "Kirim Komentar"}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-[#dce3ef] bg-white p-8 text-center">
            <p className="text-sm text-gray-600">
              Materi tidak ditemukan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
