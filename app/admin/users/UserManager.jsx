
"use client";

import { useEffect, useState } from "react";

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
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

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "student",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        search,
        role,
      });

      const response = await fetch(
        `/api/admin/users?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gagal mengambil data pengguna.");
      }

      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [currentPage, search, role]);

  function openAddModal() {
    setEditMode(false);
    setSelectedId(null);

    setForm({
      username: "",
      email: "",
      password: "",
      role: "student",
    });

    setModalOpen(true);
  }

  function openEditModal(user) {
    setEditMode(true);
    setSelectedId(user.id);

    setForm({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
    });

    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedId(null);
  }

  function handleFormChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const url = "/api/admin/users";
      const method = editMode ? "PUT" : "POST";

      const body = {
        ...form,
      };

      if (editMode) {
        body.id = selectedId;

        if (!body.password.trim()) {
          delete body.password;
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gagal menyimpan pengguna.");
      }

      closeModal();
      setMessage(data.message);

      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(user) {
    const confirmed = window.confirm(
      `Apakah kamu yakin ingin menghapus pengguna ${user.username}?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gagal menghapus pengguna.");
      }

      setMessage(data.message);

      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        await loadUsers();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTeacherApproval(user, status) {
    const action = status === "approved" ? "menyetujui" : "menolak";

    const confirmed = window.confirm(
      `Apakah kamu yakin ingin ${action} pengajuan Teacher dari ${user.username}?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/admin/teacher-applications/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gagal memproses pengajuan Teacher.");
      }

      setMessage(data.message);
      await loadUsers();
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
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 text-[#0B1F3A]">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Manajemen Pengguna
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Kelola seluruh pengguna yang terdaftar di NadhiLearn.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#16375f]"
        >
          + Tambah Pengguna
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

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Search and Filter */}
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold">
              Daftar Pengguna
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Total {pagination.total} pengguna terdaftar.
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
              placeholder="Cari username atau email..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#0B1F3A] sm:w-64"
            />

            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#0B1F3A]"
            >
              <option value="">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-4">No.</th>
                <th className="px-5 py-4">Pengguna</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Status Teacher</th>
                <th className="px-5 py-4">Tanggal Daftar</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4 text-gray-500">
                      {startIndex + index}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#0B1F3A]">
                        {user.username}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {user.email}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : user.role === "teacher"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {user.teacher_status === "pending" ? (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                          Pending
                        </span>
                      ) : user.teacher_status === "approved" ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Approved
                        </span>
                      ) : user.teacher_status === "rejected" ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          Rejected
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {formatDate(user.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {user.teacher_status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleTeacherApproval(user, "approved")
                              }
                              className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              Approve
                            </button>

                            <button
                              onClick={() =>
                                handleTeacherApproval(user, "rejected")
                              }
                              className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                            >
                              Tolak
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-[#0B1F3A] hover:bg-gray-100"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(user)}
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
            Menampilkan {startIndex}–{endIndex} dari {pagination.total} pengguna
          </p>

          <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:w-auto sm:gap-2">
            <button
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="min-w-0 whitespace-nowrap rounded-lg border border-gray-300 px-1 py-2 text-[11px] font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4 sm:text-sm"
            >
              Sebelumnya
            </button>

            <span className="whitespace-nowrap px-0.5 text-center text-xs font-semibold sm:px-2 sm:text-sm">
              {pagination.currentPage} / {pagination.totalPages}
            </span>

            <button
              disabled={
                currentPage >= pagination.totalPages || loading
              }
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="min-w-0 whitespace-nowrap rounded-lg border border-gray-300 px-1 py-2 text-[11px] font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-4 sm:text-sm"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editMode ? "Edit Pengguna" : "Tambah Pengguna"}
              </h2>

              <button
                onClick={closeModal}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Username
                </label>

                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0B1F3A]"
                  placeholder="Masukkan username"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0B1F3A]"
                  placeholder="Masukkan email"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Password {editMode && "(Kosongkan jika tidak diubah)"}
                </label>

                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleFormChange}
                  required={!editMode}
                  minLength={editMode ? undefined : 8}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0B1F3A]"
                  placeholder={
                    editMode
                      ? "Masukkan password baru (opsional)"
                      : "Masukkan password"
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Role
                </label>

                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#0B1F3A]"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
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
                  {editMode ? "Simpan Perubahan" : "Tambah Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
