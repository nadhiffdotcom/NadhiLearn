
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth-server";

const ITEMS_PER_PAGE = 10;

export async function GET(request) {
  try {
    // Periksa token dan pastikan pengguna adalah Admin.
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

    const { searchParams } = new URL(request.url);
    const requestedPage = Number(searchParams.get("page")) || 1;

    // Ambil statistik pengguna.
    const statsResult = await pool.query(
      `SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (
          WHERE role = 'student'
        )::int AS total_students,
        COUNT(*) FILTER (
          WHERE role = 'teacher'
        )::int AS total_teachers,
        COUNT(*) FILTER (
          WHERE teacher_status = 'pending'
        )::int AS pending_teachers
       FROM users`
    );

    const stats = statsResult.rows[0];

    // Hitung total pengajuan Teacher.
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users
       WHERE teacher_status = 'pending'`
    );

    const totalApplicants = countResult.rows[0].total;

    const totalPages = Math.max(
      1,
      Math.ceil(totalApplicants / ITEMS_PER_PAGE)
    );

    const currentPage = Math.min(
      Math.max(1, Math.floor(requestedPage)),
      totalPages
    );

    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    // Ambil pengajuan sesuai halaman.
    const applicantsResult = await pool.query(
      `SELECT
        id,
        username,
        display_name,
        email,
        teacher_background,
        created_at
       FROM users
       WHERE teacher_status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1 OFFSET $2`,
      [ITEMS_PER_PAGE, offset]
    );

    return NextResponse.json({
      success: true,
      admin: auth.user,
      stats,
      applicants: applicantsResult.rows,
      pagination: {
        currentPage,
        totalPages,
        totalApplicants,
        startItem: totalApplicants === 0 ? 0 : offset + 1,
        endItem: Math.min(
          offset + ITEMS_PER_PAGE,
          totalApplicants
        ),
      },
    });
  } catch (error) {
    console.error("Admin dashboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data Dashboard Admin.",
      },
      { status: 500 }
    );
  }
}
