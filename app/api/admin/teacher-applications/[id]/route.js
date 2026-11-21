
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// Memeriksa hak akses Admin menggunakan cookie
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_admin_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = await verifyToken(token);

    if (!decoded?.id || decoded.role !== "admin") {
      return null;
    }

    const currentUser = await pool.query(
      `SELECT id, role FROM users WHERE id = $1 LIMIT 1`,
      [decoded.id]
    );

    if (currentUser.rows[0]?.role !== "admin") {
      return null;
    }

    return { ...decoded, ...currentUser.rows[0] };
  } catch {
    return null;
  }
}

export async function PATCH(request, { params }) {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak.",
        },
        { status: 403 }
      );
    }

    // Next.js 15: params harus di-await
    const { id } = await params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "ID pengguna tidak valid.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Status pengajuan tidak valid.",
        },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE users
       SET
         teacher_status = $1::varchar,
         role = CASE
           WHEN $1::varchar = 'approved' THEN 'teacher'
           ELSE role
         END,
         approved_at = CASE
           WHEN $1::varchar = 'approved' THEN NOW()
           ELSE approved_at
         END
       WHERE id = $2
         AND teacher_status = 'pending'
       RETURNING id, username, email, role, teacher_status, approved_at`,
      [status, userId]
    );

    if (result.rows.length === 0) {
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
    console.error("Teacher application PATCH error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat memproses pengajuan Teacher.",
      },
      { status: 500 }
    );
  }
}
