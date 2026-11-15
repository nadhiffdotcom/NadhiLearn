
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [accountType, setAccountType] = useState("student");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teacherBackground, setTeacherBackground] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (accountType === "teacher" && !teacherBackground.trim()) {
      setMessage("Mohon isi latar belakang atau pengalaman mengajar.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
          accountType,
          teacherBackground,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Registrasi gagal.");
        return;
      }

      alert("Registrasi berhasil! Silakan login.");
      router.push("/login");
    } catch (error) {
      setMessage("Terjadi kesalahan koneksi ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B1F3A] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-[#0B1F3A]">
        <h1 className="mb-2 text-center text-3xl font-bold">
          Daftar NadhiLearn
        </h1>

        <p className="mb-8 text-center">
          Buat akun untuk mulai belajar bersama NadhiLearn.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block font-semibold">
              Daftar sebagai
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("student")}
                className={`rounded-lg border-2 p-3 font-semibold ${
                  accountType === "student"
                    ? "border-[#0B1F3A] bg-[#0B1F3A] text-white"
                    : "border-[#0B1F3A] bg-white text-[#0B1F3A]"
                }`}
              >
                Student
              </button>

              <button
                type="button"
                onClick={() => setAccountType("teacher")}
                className={`rounded-lg border-2 p-3 font-semibold ${
                  accountType === "teacher"
                    ? "border-[#0B1F3A] bg-[#0B1F3A] text-white"
                    : "border-[#0B1F3A] bg-white text-[#0B1F3A]"
                }`}
              >
                Teacher
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="w-full rounded-lg border border-[#0B1F3A] px-4 py-3 outline-none"
              placeholder="Masukkan username"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[#0B1F3A] px-4 py-3 outline-none"
              placeholder="Masukkan email"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-[#0B1F3A] px-4 py-3 outline-none"
              placeholder="Minimal 8 karakter"
            />
          </div>

          {accountType === "teacher" && (
            <div>
              <label className="mb-2 block font-semibold">
                Latar Belakang / Pengalaman Mengajar
              </label>
              <textarea
                value={teacherBackground}
                onChange={(e) => setTeacherBackground(e.target.value)}
                required
                rows={4}
                className="w-full rounded-lg border border-[#0B1F3A] px-4 py-3 outline-none"
                placeholder="Ceritakan pengalaman atau keahlian Anda..."
              />
              <p className="mt-2 text-sm">
                Pendaftaran Teacher akan menunggu persetujuan Admin.
              </p>
            </div>
          )}

          {message && (
            <p className="rounded-lg border border-[#0B1F3A] p-3 text-sm">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0B1F3A] py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Daftar Sekarang"}
          </button>
        </form>

        <p className="mt-6 text-center">
          Sudah punya akun?{" "}
          <a href="/login" className="font-bold underline">
            Login
          </a>
        </p>

        <p className="mt-4 text-center">
          <a href="/" className="font-semibold underline">
            Kembali ke Beranda
          </a>
        </p>
      </div>
    </main>
  );
}
