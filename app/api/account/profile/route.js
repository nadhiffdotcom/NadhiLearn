
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { verifyToken, createToken } from "@/lib/auth";

export async function PUT(request) {
  try {
    // 1. Periksa sesi login
    const cookieStore = await cookies();
    const token = cookieStore.get("nadhi_token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Silakan login terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);

    if (!decoded?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Sesi tidak valid. Silakan login kembali.",
        },
        { status: 401 }
      );
    }

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
    const newPassword = body.newPassword;

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
      newPassword !== undefined &&
      newPassword !== "" &&
      (typeof newPassword !== "string" ||
        newPassword.length < 8)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Password baru minimal 8 karakter.",
        },
        { status: 400 }
      );
    }

    // 4. Ambil data pengguna dari database
    const userResult = await pool.query(
      `SELECT id, username, email, password, role
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [decoded.id]
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

    // 9. Perbarui token login
    const newToken = await createToken(updatedUser);

    cookieStore.set("nadhi_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    // 10. Kirim respons berhasil
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
