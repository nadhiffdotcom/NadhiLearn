
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function POST(request) {
  try {
    const body = await request.json();

    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const accountType = body.accountType;
    const teacherBackground = body.teacherBackground?.trim();

    // Validasi data wajib
    if (!username || !email || !password || !accountType) {
      return NextResponse.json(
        { success: false, message: "Semua data wajib diisi." },
        { status: 400 }
      );
    }

    if (!["student", "teacher"].includes(accountType)) {
      return NextResponse.json(
        { success: false, message: "Jenis akun tidak valid." },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { success: false, message: "Username harus 3–50 karakter." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Format email tidak valid." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password minimal 8 karakter." },
        { status: 400 }
      );
    }

    if (accountType === "teacher" && !teacherBackground) {
      return NextResponse.json(
        {
          success: false,
          message: "Latar belakang Teacher wajib diisi.",
        },
        { status: 400 }
      );
    }

    // Periksa email dan username
    const existingUser = await pool.query(
      `SELECT id FROM users
       WHERE LOWER(email) = $1
          OR LOWER(username) = LOWER($2)
       LIMIT 1`,
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Email atau username sudah digunakan.",
        },
        { status: 409 }
      );
    }

    // Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(password, 12);

    // Pendaftar Teacher tetap ber-role student
    const teacherStatus =
      accountType === "teacher" ? "pending" : null;

    const background =
      accountType === "teacher" ? teacherBackground : null;

    // Sesuai database.sql: nama kolom password
    await pool.query(
      `INSERT INTO users (
        username,
        email,
        password,
        role,
        teacher_status,
        teacher_background
      )
      VALUES ($1, $2, $3, 'student', $4, $5)`,
      [username, email, hashedPassword, teacherStatus, background]
    );

    return NextResponse.json(
      {
        success: true,
        message:
          accountType === "teacher"
            ? "Pendaftaran berhasil. Pengajuan Teacher menunggu persetujuan Admin."
            : "Pendaftaran Student berhasil. Silakan login.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}
