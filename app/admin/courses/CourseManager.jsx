
"use client";

import { useEffect, useState, useRef } from "react";

const initialForm = {
  title: "",
  description: "",
  category_id: "",
  teacher_id: "",
  thumbnail: "",
  start_date: "",
  end_date: "",
};

export default function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  const [message, setMessage] = useState("");

  // REF INPUT FILE
  const fileInputRef = useRef(null);

  // =====================================
  // FETCH COURSES
  // =====================================

  async function fetchCourses(signal) {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        search: search.trim(),
      });

      const response = await fetch(
        `/api/courses?${params.toString()}`,
        { signal }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal mengambil data kursus."
        );
      }

      setCourses(data.courses || []);
      setCategories(data.categories || []);
      setTeachers(data.teachers || []);
      setPagination(data.pagination);
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
      fetchCourses(controller.signal);
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [page, search]);

  // =====================================
  // FORM HANDLING
  // =====================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // UPLOAD IMAGE
  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        "Format gambar harus JPG, PNG, atau WEBP."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage("Ukuran gambar maksimal 5 MB.");

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
    setMessage("");
  }

  // REMOVE IMAGE
  function handleRemoveImage() {
    setSelectedFile(null);
    setPreviewImage("");

    setForm((previous) => ({
      ...previous,
      thumbnail: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setMessage("");
  }

  // OPEN ADD FORM
  function openAddForm() {
    setEditingId(null);
    setForm(initialForm);
    setSelectedFile(null);
    setPreviewImage("");
    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowForm(true);
  }

  // OPEN EDIT FORM
  function openEditForm(course) {
    setEditingId(course.id);

    setForm({
      title: course.title || "",
      description: course.description || "",
      category_id: String(course.category_id),
      teacher_id: String(course.teacher_id),
      thumbnail: course.thumbnail || "",
      start_date: course.start_date
        ? String(course.start_date).slice(0, 10)
        : "",
      end_date: course.end_date
        ? String(course.end_date).slice(0, 10)
        : "",
    });

    setSelectedFile(null);
    setPreviewImage(course.thumbnail || "");
    setMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowForm(true);
  }

  // CLOSE FORM
  function closeForm() {
    setShowForm(false);
    setSelectedFile(null);
    setPreviewImage("");
    setForm(initialForm);
    setEditingId(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // =====================================
  // ADD / UPDATE COURSE
  // =====================================

  async function handleSubmit(event) {
    event.preventDefault();

    // VALIDASI TANGGAL
    if (
      form.start_date &&
      form.end_date &&
      form.end_date < form.start_date
    ) {
      setMessage(
        "Tanggal selesai tidak boleh lebih awal dari tanggal mulai."
 
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let thumbnailUrl = form.thumbnail;

      // UPLOAD GAMBAR BARU
      if (selectedFile) {
        const uploadData = new FormData();

        uploadData.append("file", selectedFile);

        const uploadResponse = await fetch(
          "/api/upload/course-thumbnail",
          {
            method: "POST",
            body: uploadData,
          }
        );

        const uploaded = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            uploaded.message || "Gagal mengunggah gambar."
          );
        }

        thumbnailUrl = uploaded.url;
      }

      // SIMPAN DATA KURSUS
      const response = await fetch("/api/courses", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          thumbnail: thumbnailUrl,
          id: editingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Gagal menyimpan kursus."
        );
      }

      closeForm();
      setMessage(data.message);

      await fetchCourses();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  // =====================================
  // DELETE COURSE
  // =====================================

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus kursus ini?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
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

      setMessage(data.message);

      if (courses.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchCourses();
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
            Course Management
          </h1>

          <p className="mt-2 text-gray-600">
            Kelola seluruh kursus yang tersedia di NadhiLearn.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="rounded-lg bg-[#0B1F3A] px-5 py-3 font-semibold text-white transition hover:bg-[#16365D]"
        >
          + Tambah Kursus
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

      {/* SEARCH */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
          Cari Kursus
        </label>

        <input
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Cari judul, deskripsi, kategori, atau pengajar..."
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
        />
      </div>

      {/* COURSE TABLE */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-lg font-bold text-[#0B1F3A]">
            Daftar Kursus
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Total {pagination.total || 0} kursus
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">

            <thead className="bg-gray-50 text-[#0B1F3A]">
              <tr>
                <th className="px-5 py-4">No.</th>
                <th className="px-5 py-4">Thumbnail</th>
                <th className="px-5 py-4">Nama Kursus</th>
                <th className="px-5 py-4">Kategori</th>
                <th className="px-5 py-4">Pengajar</th>
                <th className="px-5 py-4">Tanggal Mulai</th>
                <th className="px-5 py-4">Tanggal Selesai</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">

              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    Memuat data kursus...
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    Belum ada kursus yang tersedia.
                  </td>
                </tr>
              ) : (
                courses.map((course, index) => (
                  <tr
                    key={course.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      {(page - 1) * 10 + index + 1}
                    </td>

                    {/* THUMBNAIL */}
                    <td className="px-5 py-4">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={`Sampul ${course.title}`}
                          className="h-14 w-24 rounded-md border border-gray-200 object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">
                          Belum ada gambar
                        </span>
                      )}
                    </td>

                    {/* COURSE NAME */}
                    <td className="max-w-[220px] px-5 py-4">
                      <p className="font-semibold text-[#0B1F3A]">
                        {course.title}
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {course.description}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {course.category_name}
                    </td>

                    <td className="px-5 py-4">
                      {course.teacher_name}
                    </td>

                    <td className="px-5 py-4">
                      {course.start_date
                        ? new Date(
                            String(course.start_date).slice(0, 10) +
                              "T00:00:00"
                          ).toLocaleDateString("id-ID")
                        : "-"}
                    </td>

                    <td className="px-5 py-4">
                      {course.end_date
                        ? new Date(
                            String(course.end_date).slice(0, 10) +
                              "T00:00:00"
                          ).toLocaleDateString("id-ID")
                        : "-"}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditForm(course)}
                          className="rounded-md border border-[#0B1F3A] px-3 py-2 font-semibold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-white"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(course.id)}
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
            {pagination.total || 0} kursus
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
                {editingId ? "Edit Kursus" : "Tambah Kursus"}
              </h2>

              <button
                onClick={closeForm}
                className="text-2xl text-gray-500 hover:text-black"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* TITLE */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                  Nama Kursus *
                </label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={200}
                  required
                  placeholder="Masukkan nama kursus"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                  Deskripsi *
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder="Masukkan deskripsi kursus"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                />
              </div>

              {/* CATEGORY */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                  Kategori *
                </label>

                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                >
                  <option value="">Pilih Kategori</option>

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

              {/* TEACHER */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                  Pengajar *
                </label>

                <select
                  name="teacher_id"
                  value={form.teacher_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                >
                  <option value="">Pilih Teacher</option>

                  {teachers.map((teacher) => (
                    <option
                      key={teacher.id}
                      value={teacher.id}
                    >
                      {teacher.username} ({teacher.email})
                    </option>
                  ))}
                </select>

                {teachers.length === 0 && (
                  <p className="mt-2 text-xs text-red-600">
                    Belum ada Teacher yang disetujui.
                  </p>
                )}
              </div>

              {/* THUMBNAIL UPLOAD */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                  Gambar Sampul Kursus
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Format JPG, PNG, atau WEBP. Maksimal 5 MB.
                </p>

                {/* PREVIEW IMAGE */}
                {previewImage && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold text-[#0B1F3A]">
                      Preview Gambar
                    </p>

                    <img
                      src={previewImage}
                      alt="Preview sampul kursus"
                      className="h-48 w-full rounded-lg border border-gray-200 object-cover"
                    />

                    {/* REMOVE IMAGE BUTTON */}
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="mt-3 rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white"
                    >
                      Hapus Gambar
                    </button>
                  </div>
                )}
              </div>

              {/* DATES */}
              <div className="grid gap-5 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                    Tanggal Mulai
                  </label>

                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#0B1F3A]">
                    Tanggal Selesai
                  </label>

                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    min={form.start_date || undefined}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                  />
                </div>

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
                  disabled={saving || teachers.length === 0}
                  className="rounded-lg bg-[#0B1F3A] px-6 py-3 font-semibold text-white hover:bg-[#16365D] disabled:opacity-50"
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
  );
}
