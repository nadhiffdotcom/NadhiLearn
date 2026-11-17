
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth-client";
import ProfileForm from "./ProfileForm";

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const token = sessionStorage.getItem("nadhi_token");

        if (!token) {
          router.replace("/login");
          return;
        }

        const response = await authFetch("/api/auth/me");
        const data = await response.json();

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok || !data.user) {
          throw new Error(
            data.message || "Gagal mengambil data akun."
          );
        }

        if (!active) return;

        const currentUser = data.user;

        if (
          !["admin", "teacher", "student"].includes(currentUser.role)
        ) {
          router.replace("/login");
          return;
        }

        if (
          currentUser.role === "teacher" &&
          currentUser.teacherStatus !== "approved"
        ) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error("Profile loading error:", error);

        if (active) {
          setError(
            error.message || "Terjadi kesalahan saat mengambil data akun."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  const dashboardPath =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "teacher"
        ? "/teacher/dashboard"
        : "/student/dashboard";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B1F3A] text-white">
        Memuat pengaturan akun...
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0B1F3A] px-6 text-white">
        <div className="max-w-lg text-center">
          <p className="mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-white px-5 py-2 font-semibold text-[#0B1F3A]"
          >
            Coba Lagi
          </button>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#0B1F3A] px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <a
          href={dashboardPath}
          className="mb-8 inline-block font-semibold text-white underline underline-offset-4 transition hover:text-gray-300"
        >
          ← Kembali ke Dashboard
        </a>

        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider">
            NADHILEARN ACCOUNT
          </p>

          <h1 className="mb-3 text-3xl font-bold md:text-4xl">
            Pengaturan Akun
          </h1>

          <p className="text-gray-200">
            Perbarui informasi akun NadhiLearn milikmu.
          </p>
        </div>

        <ProfileForm user={user} />
      </div>
    </main>
  );
}
