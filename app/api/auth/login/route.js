
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { createToken } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email dan password wajib diisi.",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT
        id,
        username,
        email,
        password,
        role,
        teacher_status
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Email atau password salah.",
        },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Email atau password salah.",
        },
        { status: 401 }
      );
    }

    let cookieName;

    if (user.role === "admin") {
      cookieName = "nadhi_admin_token";
    } else if (user.role === "teacher") {
      if (user.teacher_status !== "approved") {
        return NextResponse.json(
          {
            success: false,
            message: "Akun Teacher belum disetujui.",
          },
          { status: 403 }
        );
      }

      cookieName = "nadhi_teacher_token";
    } else if (user.role === "student") {
      cookieName = "nadhi_student_token";
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Role akun tidak valid.",
        },
        { status: 403 }
      );
    }

    // Buat token untuk sesi pengguna
    const token = await createToken(user);

    // COOKIE SEMENTARA:
    // Dipertahankan agar halaman lama tetap berfungsi
    // selama proses migrasi berlangsung.
    const cookieStore = await cookies();

    cookieStore.set(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({
      success: true,
      message: "Login berhasil.",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        teacherStatus: user.teacher_status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}
