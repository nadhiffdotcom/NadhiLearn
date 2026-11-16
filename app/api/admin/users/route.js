
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// Memeriksa hak akses Admin
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = await verifyToken(token);

    if (!decoded || decoded.role !== "admin") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

// GET: Menampilkan daftar pengguna
export async function GET(request) {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10)
    );

    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    const allowedRoles = ["admin", "teacher", "student"];

    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Filter role tidak valid." },
        { status: 400 }
      );
    }

    const limit = 10;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE (
         $1 = ''
         OR username ILIKE '%' || $1 || '%'
         OR email ILIKE '%' || $1 || '%'
       )
       AND ($2 = '' OR role = $2)`,
      [search, role]
    );

    const total = Number(countResult.rows[0].total);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const result = await pool.query(
      `SELECT
         id,
         username,
         email,
         role,
         teacher_status,
         teacher_background,
         approved_at,
         created_at
       FROM users
       WHERE (
         $1 = ''
         OR username ILIKE '%' || $1 || '%'
         OR email ILIKE '%' || $1 || '%'
       )
       AND ($2 = '' OR role = $2)
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [search, role, limit, offset]
    );

    return NextResponse.json({
      success: true,
      users: result.rows,
      pagination: {
        currentPage,
        totalPages,
        total,
        limit,
      },
    });
  } catch (error) {
    console.error("GET USER MANAGEMENT ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data pengguna." },
      { status: 500 }
    );
  }
}

// POST: Membuat pengguna baru
export async function POST(request) {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const role = body.role;

    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Semua field wajib diisi." },
        { status: 400 }
      );
    }

    if (!["admin", "teacher", "student"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Role tidak valid." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const teacherStatus = role === "teacher" ? "approved" : null;
    const approvedAt = role === "teacher";

    const result = await pool.query(
      `INSERT INTO users (
        username,
        email,
        password,
        role,
        teacher_status,
        approved_at
      )
      VALUES ($1, $2, $3, $4, $5, CASE WHEN $6 THEN NOW() ELSE NULL END)
      RETURNING
        id,
        username,
        email,
        role,
        teacher_status,
        approved_at,
        created_at`,
      [
        username,
        email,
        hashedPassword,
        role,
        teacherStatus,
        approvedAt,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Pengguna berhasil ditambahkan.",
        user: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST USER MANAGEMENT ERROR:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, message: "Username atau email sudah digunakan." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal menambahkan pengguna." },
      { status: 500 }
    );
  }
}

// PUT: Mengubah data pengguna
export async function PUT(request) {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = Number(body.id);
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role;
    const password = body.password;

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !username ||
      !email ||
      !role
    ) {
      return NextResponse.json(
        { success: false, message: "Data pengguna tidak lengkap." },
        { status: 400 }
      );
    }

    if (!["admin", "teacher", "student"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Role tidak valid." },
        { status: 400 }
      );
    }

    let result;

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 12);

      result = await pool.query(
        `UPDATE users
         SET
           username = $1,
           email = $2,
           password = $3,
           role = $4,
           teacher_status = CASE
             WHEN $4 = 'teacher' THEN 'approved'
             ELSE teacher_status
           END,
           approved_at = CASE
             WHEN $4 = 'teacher' THEN COALESCE(approved_at, NOW())
             ELSE approved_at
           END,
           updated_at = NOW()
         WHERE id = $5
         RETURNING
           id,
           username,
           email,
           role,
           teacher_status,
           approved_at,
           created_at`,
        [username, email, hashedPassword, role, id]
      );
    } else {
      result = await pool.query(
        `UPDATE users
         SET
           username = $1,
           email = $2,
           role = $3,
           teacher_status = CASE
             WHEN $3 = 'teacher' THEN 'approved'
             ELSE teacher_status
           END,
           approved_at = CASE
             WHEN $3 = 'teacher' THEN COALESCE(approved_at, NOW())
             ELSE approved_at
           END,
           updated_at = NOW()
         WHERE id = $4
         RETURNING
           id,
           username,
           email,
           role,
           teacher_status,
           approved_at,
           created_at`,
        [username, email, role, id]
      );
    }

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data pengguna berhasil diperbarui.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("PUT USER MANAGEMENT ERROR:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, message: "Username atau email sudah digunakan." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal memperbarui pengguna." },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus pengguna
export async function DELETE(request) {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "ID pengguna tidak valid." },
        { status: 400 }
      );
    }

    if (Number(admin.id) === id) {
      return NextResponse.json(
        { success: false, message: "Admin tidak dapat menghapus akunnya sendiri." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pengguna berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE USER MANAGEMENT ERROR:", error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "Pengguna tidak dapat dihapus karena masih memiliki data terkait.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
