
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  // 1. Periksa sesi login
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);

  if (!payload?.id) {
    redirect("/login");
  }

  // 2. Ambil data pengguna dari database
  const result = await pool.query(
    `SELECT id, username, email, role
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [payload.id]
  );

  if (result.rows.length === 0) {
    redirect("/login");
  }

  const user = result.rows[0];

  // 3. Tentukan halaman dashboard berdasarkan role
  const dashboardPath =
    user.role === "admin"
      ? "/admin/dashboard"
      : user.role === "teacher"
        ? "/teacher/dashboard"
        : "/student/dashboard";

  return (
    <main className="min-h-screen bg-[#0B1F3A] px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">

        {/* KEMBALI KE DASHBOARD */}
        <a
          href={dashboardPath}
          className="mb-8 inline-block font-semibold text-white underline underline-offset-4 transition hover:text-gray-300"
        >
          ← Kembali ke Dashboard
        </a>

        {/* JUDUL */}
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

        {/* FORM */}
        <ProfileForm user={user} />

      </div>
    </main>
  );
}
