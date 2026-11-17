
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function getAuthenticatedUser(request, allowedRoles = []) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return {
        user: null,
        error: "Token autentikasi tidak ditemukan.",
        status: 401,
      };
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return {
        user: null,
        error: "Token autentikasi tidak valid.",
        status: 401,
      };
    }

    const payload = await verifyToken(token);

    if (!payload?.id || !payload?.role) {
      return {
        user: null,
        error: "Sesi login tidak valid atau sudah kedaluwarsa.",
        status: 401,
      };
    }

    const result = await pool.query(
      `SELECT id, username, email, role, teacher_status
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [payload.id]
    );

    if (result.rows.length === 0) {
      return {
        user: null,
        error: "Pengguna tidak ditemukan.",
        status: 401,
      };
    }

    const user = result.rows[0];

    if (user.role !== payload.role) {
      return {
        user: null,
        error: "Data sesi tidak sesuai dengan akun.",
        status: 401,
      };
    }

    if (
      user.role === "teacher" &&
      user.teacher_status !== "approved"
    ) {
      return {
        user: null,
        error: "Akun Teacher belum disetujui.",
        status: 403,
      };
    }

    if (
      allowedRoles.length > 0 &&
      !allowedRoles.includes(user.role)
    ) {
      return {
        user: null,
        error: "Kamu tidak memiliki izin untuk mengakses data ini.",
        status: 403,
      };
    }

    return {
      user,
      error: null,
      status: 200,
    };
  } catch (error) {
    console.error("Authentication error:", error);

    return {
      user: null,
      error: "Terjadi kesalahan saat memeriksa autentikasi.",
      status: 500,
    };
  }
}
