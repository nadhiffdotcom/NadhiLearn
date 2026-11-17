"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";

const initialForm = {
  course_id: "",
  title: "",
  description: "",
  content: "",
  order_index: "1",
};

export default function ContentManager() {
  const [contents, setContents] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [message, setMessage] = useState("");

  // =====================================
  // FETCH CONTENTS
  // =====================================

  async function fetchContents(signal) {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        search: search.trim(),
      });

      if (selectedCourse) {
        params.set("course_id", selectedCourse);
      }

         const response = await authFetch(
        `/api/contents?${params.toString()}`,
        { signal }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengambil data materi."
        );
      }

      setContents(data.contents || []);
      setCourses(data.courses || []);

      setPagination(
        data.pagination || {
          page: 1,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (error) {
      if (error.name === "AbortError") return;

      setMessage(
        error.message || "Gagal menghubungi server."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      fetchContents(controller.signal);
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [page, search, selectedCourse]);

  // =====================================
  // FORM HANDLING
  // =====================================

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "course_id" && !editingId) {
      const selected = courses.find(
        (course) => String(course.id) === value
      );

      setForm((previous) => ({
        ...previous,
        course_id: value,
        order_index: selected
          ? String(selected.next_order_index || 1)
          : "1",
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openAddForm() {
    setEditingId(null);

    const courseId = selectedCourse || "";
    const selected = courses.find(
      (course) => String(course.id) === String(courseId)
    );

    setForm({
      ...initialForm,
      course_id: courseId,
      order_index: selected
        ? String(selected.next_order_index || 1)
        : "1",
    });

    setMessage("");
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);

    setForm({
      course_id: String(item.course_id),
      title: item.title || "",
      description: item.description || "",
      content: item.content || "",
      order_index: String(item.order_index),
    });

    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  }

  // =====================================
  // ADD / UPDATE CONTENT
  // =====================================

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      if (!form.course_id) {
        throw new Error("Silakan pilih kursus terlebih dahulu.");
      }

      const response = await authFetch("/api/contents", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          id: editingId,
          course_id: Number(form.course_id),
          order_index: Number(form.order_index),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal menyimpan materi."
        );
      }

      closeForm();
      setMessage(data.message);

      await fetchContents();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  // =====================================
  // DELETE CONTENT
  // =====================================

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus materi ini?"
    );

    if (!confirmed) return;

    try {
      const response = await authFetch(
        `/api/contents?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal menghapus materi."
        );
      }

      setMessage(data.message);

      if (contents.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchContents();
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  // =====================================
  // PAGINATION
  // =====================================

  const firstNumber =
    pagination.total === 0
      ? 0
      : (page - 1) * 10 + 1;

  const lastNumber = Math.min(
    page * 10,
    pagination.total || 0
  );

  // =====================================
  // RENDER
  // =====================================

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">

      {/* HEADER */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0B1F3A]">
            Content Management
          </h1>

          <p className="mt-2 text-gray-600">
            Kelola materi pembelajaran dari kursus yang kamu ajar.
          </p>
        </div>

        <button
          onClick={openAddForm}
          disabled={courses.length === 0}
          className="rounded-lg bg-[#0B1F3A] px-5 py-3 font-semibold text-white transition hover:bg-[#16365D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Tambah Materi
        </button>
      </div>

      {/* MESSAGE */}
      {message && (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-[#0B1F3A]">
          <p>{message}</p>

          <button
            onClick={() => setMessage("")}
            className="font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* FILTER */}
      <div className="mb-6 grid gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-2">

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
            Pilih Kursus
          </label>

          <select
            value={selectedCourse}
            onChange={(event) => {
              setSelectedCourse(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
          >
            <option value="">Semua Kursus</option>

            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
            Cari Materi
          </label>

          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cari judul, deskripsi, atau isi materi..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
          />
        </div>
      </div>

      {/* CONTENT TABLE */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-lg font-bold text-[#0B1F3A]">
            Daftar Materi
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Total {pagination.total || 0} materi
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">

            <thead className="bg-gray-50 text-[#0B1F3A]">
              <tr>
                <th className="px-5 py-4">No.</th>
                <th className="px-5 py-4">Urutan</th>
                <th className="px-5 py-4">Judul Materi</th>
                <th className="px-5 py-4">Nama Kursus</th>
                <th className="px-5 py-4">Deskripsi</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">

              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-gray-500">
                    Memuat data materi...
                  </td>
                </tr>
              ) : contents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-gray-500">
                    Belum ada materi yang tersedia.
                  </td>
                </tr>
              ) : (
                contents.map((item, index) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      {(page - 1) * 10 + index + 1}
                    </td>

                    <td className="px-5 py-4 font-semibold text-[#0B1F3A]">
                      {item.order_index}
                    </td>

                    <td className="max-w-[220px] px-5 py-4">
                      <p className="font-semibold text-[#0B1F3A]">
                        {item.title}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {item.course_title}
                    </td>

                    <td className="max-w-[220px] px-5 py-4">
                      <p className="line-clamp-2 text-gray-500">
                        {item.description || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditForm(item)}
                          className="rounded-md border border-[#0B1F3A] px-3 py-2 font-semibold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-white"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-md border border-red-600 px-3 py-2 font-semibold text-red-600 transition hover:bg-red-600 hover:text-white"
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

        {/* PAGINATION */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 px-6 py-5">

          <p className="text-sm text-gray-600">
            Menampilkan {firstNumber}-{lastNumber} dari{" "}
            {pagination.total || 0} materi
          </p>

          <div className="flex items-center gap-3">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((previous) => previous - 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-[#0B1F3A] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sebelumnya
            </button>

            <span className="text-sm font-semibold text-[#0B1F3A]">
              {page} / {Math.max(1, pagination.totalPages || 0)}
            </span>

            <button
              disabled={
                page >= (pagination.totalPages || 1) || loading
              }
              onClick={() => setPage((previous) => previous + 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-[#0B1F3A] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4">

          <div className="my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#0B1F3A]">
                {editingId ? "Edit Materi" : "Tambah Materi"}
              </h2>

              <button
                onClick={closeForm}
                className="text-2xl text-gray-500 hover:text-black"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* COURSE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                  Kursus *
                </label>

                <select
                  name="course_id"
                  value={form.course_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                >
                  <option value="">Pilih Kursus</option>

                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* TITLE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                  Judul Materi *
                </label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={200}
                  required
                  placeholder="Masukkan judul materi"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                  Deskripsi Materi
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Masukkan deskripsi singkat materi"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                />
              </div>

              {/* CONTENT */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                  Isi Materi *
                </label>

                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  rows={8}
                  required
                  placeholder="Tuliskan isi materi pembelajaran di sini..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Isi materi dapat berupa teks pembelajaran atau tautan sumber belajar.
                </p>
              </div>

              {/* ORDER */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                  Urutan Materi *
                </label>

                <input
                  type="number"
                  name="order_index"
                  value={form.order_index}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  required
                  readOnly={!editingId}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none read-only:bg-gray-100 focus:border-[#0B1F3A]"
                />

                {!editingId && (
                  <p className="mt-2 text-xs text-gray-500">
                    Nomor urut berikutnya dihitung otomatis berdasarkan kursus yang dipilih.
                  </p>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving || courses.length === 0}
                  className="rounded-lg bg-[#0B1F3A] px-6 py-3 font-semibold text-white hover:bg-[#16365D] disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingId
                      ? "Simpan Perubahan"
                      : "Tambah Materi"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {!loading && courses.length === 0 && (
        <div className="mt-5 rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
          Kamu belum memiliki kursus. Tambahkan kursus terlebih dahulu sebelum membuat materi.
        </div>
      )}
    </div>
  );
}
