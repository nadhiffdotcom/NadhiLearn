
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { authFetch } from "@/lib/auth-client";

export default function ContentManager() {
  const params = useParams();
  const courseId = params.id;

  const [contents, setContents] = useState([]);
  const [courseTitle, setCourseTitle] = useState("");
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
    content: "",
    order_index: "1",
  };

  const [form, setForm] = useState(emptyForm);

  // ========================================
  // LOAD CONTENTS
  // ========================================
  async function loadContents() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        search,
        course_id: String(courseId),
      });

      const response = await authFetch(`/api/contents?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengambil data materi."
        );
      }

      setContents(data.contents || []);

      const selectedCourse = (data.courses || []).find(
        (course) => String(course.id) === String(courseId)
      );

      setCourseTitle(selectedCourse?.title || "Kursus");

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
    if (courseId) {
      loadContents();
    }
  }, [courseId, page, search]);

  // ========================================
  // OPEN ADD FORM
  // ========================================
  function openAddForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      order_index: "1",
    });

    setShowForm(true);
  }

  // ========================================
  // OPEN EDIT FORM
  // ========================================
  function openEditForm(item) {
    setEditingId(item.id);

    setForm({
      title: item.title || "",
      description: item.description || "",
      content: item.content || "",
      order_index: String(item.order_index || 1),
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
  // ADD / UPDATE CONTENT
  // ========================================
  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        course_id: Number(courseId),
        title: form.title,
        description: form.description,
        content: form.content,
      };

      // ORDER INDEX DIPAKAI SAAT EDIT
      if (editingId) {
        payload.id = editingId;
        payload.order_index = Number(form.order_index);
      }

      const response = await authFetch("/api/contents", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal menyimpan materi."
        );
      }

      alert(
        editingId
          ? "Materi berhasil diperbarui."
          : "Materi berhasil ditambahkan."
      );

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);

      await loadContents();
    } catch (err) {
      setError(err.message);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // DELETE CONTENT
  // ========================================
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

      alert("Materi berhasil dihapus.");

      if (contents.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await loadContents();
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
            <Link
              href="/teacher/courses"
              className="mb-3 inline-block text-sm font-semibold text-gray-500 hover:text-[#0B1F3A]"
            >
              &larr; Kembali ke My Courses
            </Link>

            <h1 className="text-2xl font-bold text-[#0B1F3A]">
              Kelola Materi
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Kursus: {courseTitle || "Memuat kursus..."}
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#16385f]"
          >
            + Tambah Materi
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
            placeholder="Cari materi..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0B1F3A]"
          />
        </div>

        {/* CONTENT TABLE */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">

              <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-5 py-4">No.</th>
                  <th className="px-5 py-4">Urutan</th>
                  <th className="px-5 py-4">Judul Materi</th>
                  <th className="px-5 py-4">Deskripsi</th>
                  <th className="px-5 py-4">Tanggal Dibuat</th>
                  <th className="px-5 py-4 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Memuat data materi...
                    </td>
                  </tr>
                ) : contents.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Belum ada materi pada kursus ini.
                    </td>
                  </tr>
                ) : (
                  contents.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50"
                    >

                      <td className="px-5 py-4 text-gray-600">
                        {(page - 1) * 10 + index + 1}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {item.order_index}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#0B1F3A]">
                          {item.title}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        <p className="max-w-xs truncate">
                          {item.description || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString("id-ID")
                          : "-"}
                      </td>

                      {/* ACTION BUTTONS */}
                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">

                          <button
                            onClick={() => openEditForm(item)}
                            className="rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
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
          <div className="flex flex-col justify-between gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center">

            <p className="text-sm text-gray-500">
              Total {pagination.total || 0} materi
            </p>

            <div className="flex items-center gap-3">

              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sebelumnya
              </button>

              <span className="text-sm text-gray-600">
                {page} / {pagination.totalPages || 1}
              </span>

              <button
                disabled={
                  page >= (pagination.totalPages || 1) || loading
                }
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
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
                  {editingId ? "Edit Materi" : "Tambah Materi"}
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

                {/* CONTENT TITLE */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Judul Materi *
                  </label>

                  <input
                    required
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                    placeholder="Masukkan judul materi"
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
                    rows="3"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                    placeholder="Masukkan deskripsi materi"
                  />
                </div>

                {/* CONTENT */}
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Isi Materi *
                  </label>

                  <textarea
                    required
                    name="content"
                    value={form.content}
                    onChange={handleChange}
                    rows="8"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                    placeholder="Masukkan isi materi"
                  />
                </div>

                {/* ORDER INDEX */}
                {editingId && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Urutan Materi *
                    </label>

                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      name="order_index"
                      value={form.order_index}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                    />
                  </div>
                )}

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
                      : "Tambah Materi"}
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
