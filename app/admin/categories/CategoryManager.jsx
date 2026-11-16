
"use client";

import { useState } from "react";
import Link from "next/link";

export default function CategoryManager({ initialCategories }) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setName("");
    setDescription("");
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name.trim()) {
      setMessage("Nama kategori wajib diisi.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/categories", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId,
          name,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Terjadi kesalahan.");
        return;
      }

      if (editingId) {
        setCategories((previous) =>
          previous.map((category) =>
            category.id === Number(editingId)
              ? { ...data.category, id: Number(data.category.id) }
              : category
          )
        );
      } else {
        setCategories((previous) => [
          ...previous,
          { ...data.category, id: Number(data.category.id) },
        ]);
      }

      setMessage(data.message);
      resetForm();
    } catch {
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(category) {
    setEditingId(category.id);
    setName(category.name);
    setDescription(category.description || "");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus kategori ini?"
    );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/categories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Gagal menghapus kategori.");
        return;
      }

      setCategories((previous) =>
        previous.filter((category) => category.id !== id)
      );

      setMessage(data.message);

      if (editingId === id) {
        resetForm();
      }
    } catch {
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#0B1F3A]">
      
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Manajemen Kategori
          </h1>
          <p className="mt-2 text-gray-600">
            Kelola kategori kursus NadhiLearn.
          </p>
        </div>

        <div className="mb-10 rounded-xl border border-gray-200 p-6">
          <h2 className="mb-5 text-xl font-bold">
            {editingId ? "Edit Kategori" : "Tambah Kategori"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block font-semibold">
                Nama Kategori
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Programming"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Deskripsi
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Masukkan deskripsi kategori"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0B1F3A]"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#0B1F3A] px-6 py-3 font-semibold text-white transition hover:bg-[#17385F] disabled:opacity-50"
              >
                {loading
                  ? "Memproses..."
                  : editingId
                    ? "Simpan Perubahan"
                    : "Tambah Kategori"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-300 px-6 py-3 font-semibold"
                >
                  Batal
                </button>
              )}
            </div>
          </form>

          {message && (
            <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm">
              {message}
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="text-xl font-bold">
              Daftar Kategori ({categories.length})
            </h2>
          </div>

          {categories.length === 0 ? (
            <p className="p-6 text-gray-500">
              Belum ada kategori.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Nama</th>
                    <th className="px-6 py-4">Deskripsi</th>
                    <th className="px-6 py-4">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-t border-gray-200"
                    >
                      <td className="px-6 py-4">
                        {category.id}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {category.description || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleEdit(category)}
                            disabled={loading}
                            className="font-semibold text-[#0B1F3A] hover:underline disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(category.id)}
                            disabled={loading}
                            className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
