
"use client";

import { useState } from "react";

export default function ProfileForm({ user }) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    // Periksa konfirmasi password
    if (newPassword && newPassword !== confirmPassword) {
      setMessage("Konfirmasi password baru tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Gagal memperbarui akun.");
        return;
      }

      setSuccess(true);
      setMessage(data.message);

      setUsername(data.user.username);
      setEmail(data.user.email);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

    } catch (error) {
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-[#0B1F3A] bg-white px-4 py-3 text-[#0B1F3A] outline-none focus:ring-2 focus:ring-[#0B1F3A]";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 text-[#0B1F3A] md:p-8"
    >

      {/* JENIS AKUN */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-semibold uppercase">
          Jenis Akun
        </p>

        <div className="rounded-lg border border-[#0B1F3A] px-4 py-3 font-bold capitalize">
          {user.role}
        </div>
      </div>

      {/* USERNAME */}
      <div className="mb-6">
        <label className="mb-2 block font-semibold">
          Username
        </label>

        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className={inputClass}
          minLength={3}
          maxLength={50}
          required
        />
      </div>

      {/* EMAIL */}
      <div className="mb-6">
        <label className="mb-2 block font-semibold">
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          required
        />
      </div>

      {/* GANTI PASSWORD */}
      <div className="mb-6 border-t border-gray-300 pt-6">
        <h2 className="mb-2 text-xl font-bold">
          Ganti Password
        </h2>

        <p className="mb-5 text-sm text-gray-600">
          Kosongkan password baru jika tidak ingin menggantinya.
        </p>

        <label className="mb-2 block font-semibold">
          Password Saat Ini
        </label>

        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={inputClass}
          autoComplete="current-password"
          required
        />
      </div>

      {/* PASSWORD BARU */}
      <div className="mb-6">
        <label className="mb-2 block font-semibold">
          Password Baru
        </label>

        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className={inputClass}
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      {/* KONFIRMASI PASSWORD */}
      <div className="mb-6">
        <label className="mb-2 block font-semibold">
          Konfirmasi Password Baru
        </label>

        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClass}
          autoComplete="new-password"
        />
      </div>

      {/* PESAN */}
      {message && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            success
              ? "border-green-700 bg-green-50 text-green-800"
              : "border-red-700 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* TOMBOL SIMPAN */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#0B1F3A] px-6 py-3 font-bold text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-2 hover:outline-[#0B1F3A] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Menyimpan..." : "Simpan Perubahan"}
      </button>

    </form>
  );
}
