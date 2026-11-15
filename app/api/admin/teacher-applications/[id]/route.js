
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function PATCH(request, { params }) {
  try {
    // Periksa login Admin
    const cookieStore = await cookies();
    const token = cookieStore.get("nadhi_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Sesi login tidak valid." },
        { status: 401 }
      );
    }

    const admin = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [payload.id]
    );

    if (!admin.rows.length || admin.rows[0].role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Akses hanya untuk Admin." },
        { status: 403 }
      );
    }

    // Validasi ID dan status pengajuan
    const { id } = await params;
    const userId = Number(id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, message: "ID pengguna tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const status = body.status;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Status pengajuan tidak valid." },
        { status: 400 }
      );
    }

    // Perbarui status pengajuan
    const result = await pool.query(
      `UPDATE users
       SET teacher_status = $1,
           role = CASE
             WHEN $1 = 'approved' THEN 'teacher'
             ELSE 'student'
           END,
           approved_at = CASE
             WHEN $1 = 'approved' THEN NOW()
             ELSE NULL
           END,
           updated_at = NOW()
       WHERE id = $2
         AND teacher_status = 'pending'
       RETURNING id, username, email, role, teacher_status`,
      [status, userId]
    );

    if (!result.rows.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengajuan tidak ditemukan atau sudah diproses.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        status === "approved"
          ? "Pengajuan Teacher berhasil disetujui."
          : "Pengajuan Teacher berhasil ditolak.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Teacher application error:", error);

    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

