
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import HomeClient from "./HomeClient";

export default async function Home() {
  let initialUser = null;

  try {
    const cookieStore = await cookies();

    // Ambil cookie sesuai role
    const adminToken = cookieStore.get("nadhi_admin_token")?.value;
    const teacherToken = cookieStore.get("nadhi_teacher_token")?.value;
    const studentToken = cookieStore.get("nadhi_student_token")?.value;

    // Tentukan token yang digunakan
    let token = null;

    if (adminToken) {
      token = adminToken;
    } else if (teacherToken) {
      token = teacherToken;
    } else if (studentToken) {
      token = studentToken;
    }

    if (token) {
      const decoded = await verifyToken(token);

      if (decoded?.id && decoded?.role) {
        const result = await pool.query(
          `SELECT id, username, email, role
           FROM users
           WHERE id = $1
           LIMIT 1`,
          [decoded.id]
        );

        if (
          result.rows.length > 0 &&
          result.rows[0].role === decoded.role
        ) {
          initialUser = result.rows[0];
        }
      }
    }
  } catch (error) {
    console.error("Gagal mengambil data pengguna:", error);
  }

  return <HomeClient initialUser={initialUser} />;
}
