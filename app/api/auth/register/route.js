
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";

export async function POST(request) {
  try {
    const body = await request.json();

    // ========================================
    // AMBIL DATA REGISTRASI
    // ========================================

    const username = body.username?.trim();
    const displayName =
      body.display_name?.trim() ||
      body.displayName?.trim();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const accountType = body.accountType;
    const teacherBackground =
      body.teacherBackground?.trim();

    // ========================================
    // VALIDASI DATA WAJIB
    // ========================================

    if (
      !username ||
      !displayName ||
      !email ||
      !password ||
      !accountType
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Semua data wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (!["student", "teacher"].includes(accountType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Jenis akun tidak valid.",
        },
        { status: 400 }
      );
    }

    // ========================================
    // VALIDASI USERNAME
    // ========================================

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Username harus 3–50 karakter.",
        },
        { status: 400 }
      );
    }

    // ========================================
    // VALIDASI DISPLAY NAME
    // ========================================

    if (displayName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Display Name maksimal 100 karakter.",
        },
        { status: 400 }
      );
    }

    // ========================================
    // VALIDASI EMAIL
    // ========================================

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format email tidak valid.",
        },
        { status: 400 }
      );
    }

    // ========================================
    // VALIDASI PASSWORD
    // ========================================

    if (
      typeof password !== "string" ||
      password.length < 8
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Password minimal 8 karakter.",
        },
        { status: 400 }
      );
    }

    // ========================================
    // VALIDASI TEACHER BACKGROUND
    // ========================================

    if (
      accountType === "teacher" &&
      !teacherBackground
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Latar belakang Teacher wajib diisi.",
        },
        { status: 400 }
      );
    }

    // ========================================
    // CEK USERNAME DAN EMAIL DUPLIKAT
    // ========================================

    const existingUser = await pool.query(
      `SELECT id
       FROM users
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

    // ========================================
    // HASH PASSWORD
    // ========================================

    const hashedPassword = await bcrypt.hash(password, 12);

    // ========================================
    // ROLE DAN STATUS TEACHER
    // ========================================

    // Pendaftar Teacher tetap ber-role Student
    // sampai disetujui oleh Admin.

    const teacherStatus =
      accountType === "teacher" ? "pending" : null;

    const background =
      accountType === "teacher"
        ? teacherBackground
        : null;

    // ========================================
    // SIMPAN USER
    // ========================================

    const result = await pool.query(
      `INSERT INTO users (
        username,
        display_name,
        email,
        password,
        role,
        teacher_status,
        teacher_background
      )
      VALUES ($1, $2, $3, $4, 'student', $5, $6)
      RETURNING
        id,
        username,
        display_name,
        email,
        role,
        teacher_status`,
      [
        username,
        displayName,
        email,
        hashedPassword,
        teacherStatus,
        background,
      ]
    );

    // ========================================
    // RESPONSE BERHASIL
    // ========================================

    return NextResponse.json(
      {
        success: true,
        message:
          accountType === "teacher"
            ? "Pendaftaran berhasil. Pengajuan Teacher menunggu persetujuan Admin."
            : "Pendaftaran Student berhasil. Silakan login.",
        user: result.rows[0],
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}
