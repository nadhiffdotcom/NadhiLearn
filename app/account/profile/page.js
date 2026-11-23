
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearProfileCache,
  fetchProfileSnapshot,
  getCachedProfile,
  setCachedProfile,
} from "@/lib/auth-client";
import ProfileForm from "./ProfileForm";

function isSameUser(a, b) {
  const keys = [
    "id",
    "username",
    "display_name",
    "email",
    "role",
    "teacherStatus",
    "approvedAt",
    "showTeacherWelcome",
  ];

  return keys.every((key) => (a?.[key] ?? null) === (b?.[key] ?? null));
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-44 animate-pulse rounded-3xl bg-[#dce3ef] md:h-36" />
      <div className="h-11 w-64 animate-pulse rounded-full bg-[#dce3ef]" />
      <div className="h-72 animate-pulse rounded-3xl bg-[#e7edf7]" />
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState({});
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const token = sessionStorage.getItem("nadhi_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    // 1) Tampilkan data tersimpan lebih dulu supaya halaman langsung terbuka.
    const cached = getCachedProfile();

    if (cached) {
      setUser(cached.user);
      setOverview(cached.overview || {});
      setOverviewLoading(false);
    }

    // 2) Segarkan data dari server di latar belakang (dua permintaan bersamaan).
    async function refresh() {
      try {
        const snapshot = await fetchProfileSnapshot();

        if (!active) return;

        if (snapshot.unauthorized) {
          clearProfileCache();
          router.replace("/login");
          return;
        }

        const currentUser = snapshot.user;

        if (
          !["admin", "teacher", "student"].includes(currentUser.role) ||
          (currentUser.role === "teacher" &&
            currentUser.teacherStatus !== "approved")
        ) {
          clearProfileCache();
          router.replace("/login");
          return;
        }

        // Jika data di server berbeda dari cache, isi ulang form.
        if (cached && !isSameUser(cached.user, currentUser)) {
          setFormKey((key) => key + 1);
        }

        setUser(currentUser);

        if (snapshot.overview) {
          setOverview(snapshot.overview);
          setOverviewError("");
          setCachedProfile({
            user: currentUser,
            overview: snapshot.overview,
          });
        } else if (!cached) {
          setOverviewError(snapshot.overviewError);
        }

        setOverviewLoading(false);
      } catch (error) {
        console.error("Profile loading error:", error);

        if (active && !cached) {
          setError(
            error.message ||
              "Terjadi kesalahan saat mengambil data akun."
          );
        }
      }
    }

    refresh();

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

  if (error && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f7fc] px-6 text-[#101b36]">
        <div className="max-w-lg rounded-3xl border border-[#dce3ef] bg-white p-8 text-center">
          <p className="mb-5 font-semibold">{error}</p>

          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-[#0a1f4a] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#1b3a7a]"
          >
            Coba lagi
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fc] px-4 py-6 text-[#101b36] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo-n-navy.png" alt="" className="h-9 w-9" />
            <span className="text-lg font-extrabold">NadhiLearn</span>
          </a>

          <a
            href={user ? dashboardPath : "#"}
            onClick={
              user
                ? undefined
                : (event) => {
                    event.preventDefault();
                    router.back();
                  }
            }
            className="inline-flex items-center gap-2 rounded-full border border-[#ced7e8] bg-white px-5 py-2.5 text-sm font-bold text-[#101b36] transition hover:border-[#0a1f4a] hover:text-[#0a1f4a]"
          >
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4l-6 6 6 6" />
            </svg>
            <span className="hidden sm:inline">Kembali ke dashboard</span>
            <span className="sm:hidden">Kembali</span>
          </a>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold md:text-4xl">
            Pengaturan akun
          </h1>

          <p className="mt-2 text-[#56627c]">
            Atur profil dan keamanan akun NadhiLearn milikmu.
          </p>
        </div>

        {user ? (
          <ProfileForm
            key={formKey}
            user={user}
            overview={overview}
            overviewLoading={overviewLoading}
            overviewError={overviewError}
          />
        ) : (
          <ProfileSkeleton />
        )}
      </div>
    </main>
  );
}
