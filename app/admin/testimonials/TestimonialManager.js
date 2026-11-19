
"use client";

import { useEffect, useState } from "react";

const initialForm = {
  student_name: "",
  course_title: "",
  content: "",
  rating: 5,
  is_published: false,
};

export default function TestimonialManager() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadTestimonials() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        search,
        status,
      });

      const response = await fetch(
        `/api/admin/testimonials?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gagal mengambil data testimoni.");
      }

      setTestimonials(data.testimonials);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTestimonials();
  }, [currentPage, search, status]);

  function openAddModal() {
    setEditMode(false);
    setSelectedId(null);
    setForm({ ...initialForm });
    setModalOpen(true);
  }

  function openEditModal(testimonial) {
    setEditMode(true);
    setSelectedId(testimonial.id);

    setForm({
      student_name: testimonial.student_name,
      course_title: testimonial.course_title,
      content: testimonial.content,
      rating: testimonial.rating,
      is_published: testimonial.is_published,
    });

    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedId(null);
    setForm({ ...initialForm });
  }

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/testimonials", {
        method: editMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          rating: Number(form.rating),
          ...(editMode ? { id: selectedId } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gagal menyimpan testimoni.");
      }

      closeModal();
      setMessage(data.message);

      if (!editMode) {
        setCurrentPage(1);
        if (currentPage === 1) {
          await loadTestimonials();
        }
      } else {
        await loadTestimonials();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(testimonial) {
    const confirmed = window.confirm(
      `Apakah kamu yakin ingin menghapus testimoni dari ${testimonial.student_name}?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/testimonials", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: testimonial.id }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gagal menghapus testimoni.");
      }

      setMessage(data.message);

      if (testimonials.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        await loadTestimonials();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function formatDate(date) {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const startIndex =
    pagination.total === 0
      ? 0
      : (pagination.currentPage - 1) * pagination.limit + 1;

  const endIndex = Math.min(
    pagination.currentPage * pagination.limit,
    pagination.total
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-[#0B1F3A] md:p-10">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Testimonials Management
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Kelola testimoni mahasiswa NadhiLearn.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#16375f]"
        >
          + Tambah Testimoni
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold">Daftar Testimoni</h2>
            <p className="mt-1 text-sm text-gray-500">
              Total {pagination.total} testimoni.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama atau kursus..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#0B1F3A] sm:w-64"
            />

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#0B1F3A]"
            >
              <option value="">Semua Status</option>
              <option value="published">Dipublikasikan</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-4">No.</th>
                <th className="px-5 py-4">Mahasiswa</th>
                <th className="px-5 py-4">Testimoni</th>
                <th className="px-5 py-4">Rating</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Tanggal</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-gray-500">
                    Memuat data testimoni...
                  </td>
                </tr>
              ) : testimonials.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-gray-500">
                    Belum ada testimoni ditemukan.
                  </td>
                </tr>
              ) : (
                testimonials.map((item, index) => (
                  <tr key={item.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4 text-gray-500">
                      {startIndex + index}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold">{item.student_name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.course_title}
                      </p>
                    </td>

                    <td className="max-w-xs px-5 py-4">
                      <p className="line-clamp-3 text-gray-600">
                        {item.content}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-yellow-500">
                      {"★".repeat(item.rating)}
                      <span className="text-gray-300">
                        {"★".repeat(5 - item.rating)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {item.is_published ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Dipublikasikan
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                          Draft
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold hover:bg-gray-100"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-4 border-t border-gray-200 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-center text-sm text-gray-500 sm:text-left">
            Menampilkan {startIndex}–{endIndex} dari {pagination.total} testimoni
          </p>

          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:w-auto sm:gap-2">
            <button
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="min-w-0 whitespace-nowrap rounded-lg border border-gray-300 px-1 py-2 text-[11px] font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
            >
              Sebelumnya
            </button>

            <span className="whitespace-nowrap px-1 text-center text-xs font-semibold sm:text-sm">
              {pagination.currentPage} / {pagination.totalPages}
            </span>

            <button
              disabled={currentPage >= pagination.totalPages || loading}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="min-w-0 whitespace-nowrap rounded-lg border border-gray-300 px-1 py-2 text-[11px] font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editMode ? "Edit Testimoni" : "Tambah Testimoni"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Nama Mahasiswa
                </label>
                <input
                  type="text"
                  name="student_name"
                  value={form.student_name}
                  onChange={handleFormChange}
                  maxLength={100}
                  required
                  placeholder="Masukkan nama mahasiswa"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Nama Kursus
                </label>
                <input
                  type="text"
                  name="course_title"
                  value={form.course_title}
                  onChange={handleFormChange}
                  maxLength={200}
                  required
                  placeholder="Masukkan nama kursus"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Isi Testimoni
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleFormChange}
                  required
                  rows={4}
                  placeholder="Tuliskan testimoni mahasiswa..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Rating
                </label>
                <select
                  name="rating"
                  value={form.rating}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0B1F3A]"
                >
                  <option value={5}>5 - Sangat Baik</option>
                  <option value={4}>4 - Baik</option>
                  <option value={3}>3 - Cukup</option>
                  <option value={2}>2 - Kurang</option>
                  <option value={1}>1 - Sangat Kurang</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  type="checkbox"
                  name="is_published"
                  checked={form.is_published}
                  onChange={handleFormChange}
                  className="h-4 w-4 accent-[#0B1F3A]"
                />
                <span className="text-sm font-medium">
                  Publikasikan testimoni di homepage
                </span>
              </label>

              <div className="flex flex-col-reverse justify-end gap-3 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold hover:bg-gray-100"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-[#0B1F3A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#16375f]"
                >
                  {editMode ? "Simpan Perubahan" : "Tambah Testimoni"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
