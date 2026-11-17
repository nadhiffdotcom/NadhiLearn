
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth-server";

export async function PUT(request) {
  try {
    // 1. Periksa token dari tab yang sedang aktif
    const auth = await getAuthenticatedUser(request);

    if (!auth.user) {
      return NextResponse.json(
        {
          success: false,
          message: auth.error,
        },
        { status: auth.status }
      );
    }

    const userId = auth.user.id;

    // 2. Ambil data dari form
    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword ?? "";

    // 3. Validasi input
    if (
      !username ||
      !email ||
      typeof currentPassword !== "string" ||
      !currentPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Semua data wajib diisi, termasuk password saat ini.",
        },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Username harus terdiri dari 3–50 karakter.",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format email tidak valid.",
        },
        { status: 400 }
      );
    }

    if (
      typeof newPassword !== "string" ||
      (newPassword !== "" && newPassword.length < 8)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Password baru minimal 8 karakter.",
        },
        { status: 400 }
      );
    }

    // 4. Ambil pengguna berdasarkan token tab aktif
    const userResult = await pool.query(
      `SELECT id, username, email, password, role
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Data pengguna tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 5. Verifikasi password saat ini
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Password saat ini salah.",
        },
        { status: 401 }
      );
    }

    // 6. Periksa username dan email duplikat
    const existingUser = await pool.query(
      `SELECT id
       FROM users
       WHERE (
         LOWER(email) = $1
         OR LOWER(username) = LOWER($2)
       )
       AND id <> $3
       LIMIT 1`,
      [email, username, user.id]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Username atau email sudah digunakan akun lain.",
        },
        { status: 409 }
      );
    }

    // 7. Hash password baru jika ingin menggantinya
    let hashedPassword = user.password;

    if (newPassword) {
      hashedPassword = await bcrypt.hash(newPassword, 12);
    }

    // 8. Update data pengguna
    const updateResult = await pool.query(
      `UPDATE users
       SET
         username = $1,
         email = $2,
         password = $3,
         updated_at = NOW()
       WHERE id = $4
       RETURNING id, username, email, role`,
      [username, email, hashedPassword, user.id]
    );

    const updatedUser = updateResult.rows[0];

    // 9. Kirim hasil tanpa mengubah cookie atau token tab lain
    return NextResponse.json({
      success: true,
      message: "Pengaturan akun berhasil diperbarui.",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "Username atau email sudah digunakan.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}
