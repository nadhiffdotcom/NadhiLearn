import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth-server";

// ========================================
// GET: MENGAMBIL DISKUSI MATERI TEACHER
// ========================================
export async function GET(request) {
  try {
    const auth = await getAuthenticatedUser(request, ["teacher"]);

    if (!auth.user) {
      return NextResponse.json(
        {
          message: auth.error || "Akses ditolak.",
        },
        {
          status: auth.status || 401,
        }
      );
    }

    const teacherId = auth.user.id;
    const { searchParams } = new URL(request.url);

    const contentId = Number(searchParams.get("content_id"));

    if (!Number.isInteger(contentId) || contentId <= 0) {
      return NextResponse.json(
        { message: "ID materi tidak valid." },
        { status: 400 }
      );
    }

    // ========================================
    // CEK KEPEMILIKAN MATERI
    // ========================================
    const contentResult = await pool.query(
      `
        SELECT
          ct.id,
          ct.title,
          ct.description,
          ct.course_id,
          c.title AS course_title
        FROM contents ct
        INNER JOIN courses c
          ON c.id = ct.course_id
        WHERE
          ct.id = $1
          AND c.teacher_id = $2
      `,
      [contentId, teacherId]
    );

    if (contentResult.rows.length === 0) {
      return NextResponse.json(
        {
          message: "Materi tidak ditemukan atau bukan milik Anda.",
        },
        { status: 404 }
      );
    }

    // ========================================
    // AMBIL KOMENTAR
    // ========================================
    const commentsResult = await pool.query(
      `
        SELECT
          cm.id,
          cm.content_id,
          cm.user_id,
          cm.comment,
          cm.created_at,
          cm.updated_at,

          u.username,
          u.email,
          u.role

        FROM comments cm

        INNER JOIN users u
          ON u.id = cm.user_id

        WHERE cm.content_id = $1

        ORDER BY cm.created_at ASC, cm.id ASC
      `,
      [contentId]
    );

    return NextResponse.json({
      content: contentResult.rows[0],
      comments: commentsResult.rows,
    });
  } catch (error) {
    console.error("GET TEACHER COMMENTS ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengambil diskusi materi." },
      { status: 500 }
    );
  }
}

// ========================================
// POST: TEACHER MENAMBAHKAN KOMENTAR
// ========================================
export async function POST(request) {
  try {
    const auth = await getAuthenticatedUser(request, ["teacher"]);

    if (!auth.user) {
      return NextResponse.json(
        {
          message: auth.error || "Akses ditolak.",
        },
        {
          status: auth.status || 401,
        }
      );
    }

    const teacherId = auth.user.id;

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Format data tidak valid." },
        { status: 400 }
      );
    }

    const contentId = Number(body.content_id);
    const comment = typeof body.comment === "string"
      ? body.comment.trim()
      : "";

    // ========================================
    // VALIDASI INPUT
    // ========================================
    if (!Number.isInteger(contentId) || contentId <= 0) {
      return NextResponse.json(
        { message: "ID materi tidak valid." },
        { status: 400 }
      );
    }

    if (!comment) {
      return NextResponse.json(
        { message: "Komentar tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (comment.length > 2000) {
      return NextResponse.json(
        { message: "Komentar maksimal 2000 karakter." },
        { status: 400 }
      );
    }

    // ========================================
    // CEK KEPEMILIKAN MATERI
    // ========================================
    const contentResult = await pool.query(
      `
        SELECT ct.id
        FROM contents ct
        INNER JOIN courses c
          ON c.id = ct.course_id
        WHERE
          ct.id = $1
          AND c.teacher_id = $2
      `,
      [contentId, teacherId]
    );

    if (contentResult.rows.length === 0) {
      return NextResponse.json(
        {
          message: "Materi tidak ditemukan atau bukan milik Anda.",
        },
        { status: 404 }
      );
    }

    // ========================================
    // SIMPAN KOMENTAR
    // ========================================
    const insertResult = await pool.query(
      `
        INSERT INTO comments (
          content_id,
          user_id,
          comment
        )
        VALUES ($1, $2, $3)

        RETURNING
          id,
          content_id,
          user_id,
          comment,
          created_at,
          updated_at
      `,
      [contentId, teacherId, comment]
    );

    // ========================================
    // AMBIL DATA USER KOMENTAR
    // ========================================
    const savedComment = insertResult.rows[0];

    const userResult = await pool.query(
      `
        SELECT username, email, role
        FROM users
        WHERE id = $1
      `,
      [teacherId]
    );

    return NextResponse.json(
      {
        message: "Komentar berhasil dikirim.",
        comment: {
          ...savedComment,
          ...userResult.rows[0],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST TEACHER COMMENTS ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengirim komentar." },
      { status: 500 }
    );
  }
}