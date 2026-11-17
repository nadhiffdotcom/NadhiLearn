
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth-server";

export async function PATCH(request, { params }) {
  try {
    const auth = await getAuthenticatedUser(request, ["admin"]);

    if (!auth.user) {
      return NextResponse.json(
        {
          success: false,
          message: auth.error,
        },
        { status: auth.status }
      );
    }

    const id = params.id;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID pengguna tidak ditemukan.",
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
         teacher_status = $1,
         role = CASE
           WHEN $1 = 'approved' THEN 'teacher'
           ELSE role
         END,
         approved_at = CASE
           WHEN $1 = 'approved' THEN NOW()
           ELSE approved_at
         END
       WHERE id = $2
         AND teacher_status = 'pending'
       RETURNING id, username, email, role, teacher_status`,
      [status, id]
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
