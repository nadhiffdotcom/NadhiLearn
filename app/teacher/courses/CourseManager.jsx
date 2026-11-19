
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-client";

export default function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    title: "",
    description: "",
    category_id: "",
    thumbnail: "",
    start_date: "",
    end_date: "",
  };

  const [form, setForm] = useState(emptyForm);

  // ========================================
  // LOAD COURSES
  // ========================================
  async function loadCourses() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        search,
      });

      const response = await authFetch(`/api/courses?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengambil data kursus."
        );
      }

      setCourses(data.courses || []);
      setCategories(data.categories || []);

      setPagination(
        data.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, [page, search]);

  // ========================================
  // OPEN ADD FORM
  // ========================================
  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  // ========================================
  // OPEN EDIT FORM
  // ========================================
  function openEditForm(course) {
    setEditingId(course.id);

    setForm({
      title: course.title || "",
      description: course.description || "",
      category_id: course.category_id
        ? String(course.category_id)
        : "",
      thumbnail: course.thumbnail || "",
      start_date: course.start_date
        ? String(course.start_date).slice(0, 10)
        : "",
      end_date: course.end_date
        ? String(course.end_date).slice(0, 10)
        : "",
    });

    setShowForm(true);
  }

  // ========================================
  // HANDLE FORM CHANGE
  // ========================================
  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // ========================================
  // ADD / UPDATE COURSE
  // ========================================
  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        title: form.title,
        description: form.description,
        category_id: form.category_id,
        thumbnail: form.thumbnail,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      const response = await authFetch("/api/courses", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? { ...payload, id: editingId }
            : payload
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal menyimpan kursus."
        );
      }

      alert(
        editingId
          ? "Kursus berhasil diperbarui."
          : "Kursus berhasil ditambahkan."
      );

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);

      await loadCourses();
    } catch (err) {
      setError(err.message);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // DELETE COURSE
  // ========================================
  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus kursus ini?"
    );

    if (!confirmed) return;

    try {
      const response = await authFetch(
        `/api/courses?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal menghapus kursus."
        );
      }

      alert("Kursus berhasil dihapus.");

      if (courses.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await loadCourses();
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A]">
              My Courses
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Kelola kursus yang kamu buat.
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#16385f]"
          >
            + Tambah Kursus
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SEARCH */}
        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari kursus..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0B1F3A]"
          />
        </div>

        {/* COURSE TABLE */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">

              <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-5 py-4">No.</th>
                  <th className="px-5 py-4">Nama Kursus</th>
                  <th className="px-5 py-4">Thumbnail</th>
                  <th className="px-5 py-4">Kategori</th>
                  <th className="px-5 py-4">Tanggal Mulai</th>
                  <th className="px-5 py-4">Tanggal Selesai</th>
                  <th className="px-5 py-4 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Memuat data kursus...
                    </td>
                  </tr>
                ) : courses.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Belum ada kursus.
                    </td>
                  </tr>
                ) : (
                  courses.map((course, index) => (
                    <tr
                      key={course.id}
                      className="hover:bg-gray-50"
                    >

                      <td className="px-5 py-4 text-gray-600">
                        {(page - 1) * 10 + index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#0B1F3A]">
                          {course.title}
                        </p>

                        <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                          {course.description || "-"}
                        </p>
                      </td>

                      {/* THUMBNAIL */}
                      <td className="px-5 py-4">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="h-14 w-24 rounded-md object-cover"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">
                            Tidak ada gambar
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {course.category_name || "-"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {course.start_date
                          ? String(course.start_date).slice(0, 10)
                          : "-"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {course.end_date
                          ? String(course.end_date).slice(0, 10)
                          : "-"}
                      </td>

                      {/* ACTION BUTTONS */}
                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">

                          <Link
                            href={`/teacher/courses/${course.id}/contents`}
                            className="rounded-md bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            Kelola Materi
                          </Link>

                          <button
                            onClick={() => openEditForm(course)}
                            className="rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(course.id)}
                            className="rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
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
            <div className="flex flex-col gap-4 border-t border-gray-200 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">

              <p className="text-center text-sm text-gray-500 sm:text-left">
                Total {pagination.total || 0} kursus
              </p>

              <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:w-auto sm:gap-2">

                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                  className="min-w-0 whitespace-nowrap rounded-lg border border-gray-300 px-1 py-2 text-[11px] font-semibold text-[#0B1F3A] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4 sm:text-sm"
                >
                  Sebelumnya
                </button>

                <span className="whitespace-nowrap px-0.5 text-center text-xs font-semibold text-gray-600 sm:px-2 sm:text-sm">
                  {page} / {pagination.totalPages || 1}
                </span>

                <button
                  disabled={
                    page >= (pagination.totalPages || 1) || loading
                  }
                  onClick={() => setPage((p) => p + 1)}
                  className="min-w-0 whitespace-nowrap rounded-lg border border-gray-300 px-1 py-2 text-[11px] font-semibold text-[#0B1F3A] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4 sm:text-sm"
                >
                  Berikutnya
                </button>

              </div>
            </div>
        </div>

        {/* ADD / EDIT MODAL */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">

            <div className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">

              <div className="mb-6 flex items-center justify-between">

                <h2 className="text-xl font-bold text-[#0B1F3A]">
                  {editingId ? "Edit Kursus" : "Tambah Kursus"}
                </h2>

                <button
                  onClick={() => setShowForm(false)}
                  className="text-2xl text-gray-400 hover:text-gray-700"
                >
                  &times;
                </button>

              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >

                {/* COURSE TITLE */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Nama Kursus *
                  </label>

                  <input
                    required
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                    placeholder="Masukkan nama kursus"
                  />
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Deskripsi
                  </label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="4"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                    placeholder="Masukkan deskripsi kursus"
                  />
                </div>

                {/* CATEGORY */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Kategori *
                  </label>

                  <select
                    required
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#0B1F3A]"
                  >
                    <option value="">
                      Pilih kategori
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* THUMBNAIL */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    URL Thumbnail
                  </label>

                  <input
                    name="thumbnail"
                    value={form.thumbnail}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                    placeholder="https://..."
                  />
                </div>

                {/* COURSE DATES */}
                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Tanggal Mulai
                    </label>

                    <input
                      type="date"
                      name="start_date"
                      value={form.start_date}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Tanggal Selesai
                    </label>

                    <input
                      type="date"
                      name="end_date"
                      value={form.end_date}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3"
                    />
                  </div>

                </div>

                {/* FORM ACTIONS */}
                <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">

                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-600"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#16385f] disabled:opacity-50"
                  >
                    {saving
                      ? "Menyimpan..."
                      : editingId
                      ? "Simpan Perubahan"
                      : "Tambah Kursus"}
                  </button>

                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
