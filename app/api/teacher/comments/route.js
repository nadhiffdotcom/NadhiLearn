
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
        { message: auth.error || "Akses ditolak." },
        { status: auth.status || 401 }
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

    const contentResult = await pool.query(
      `
        SELECT
          ct.id,
          ct.title,
          ct.description,
          ct.course_id,
          c.title AS course_title
        FROM contents ct
        INNER JOIN courses c ON c.id = ct.course_id
        WHERE ct.id = $1 AND c.teacher_id = $2
      `,
      [contentId, teacherId]
    );

    if (contentResult.rows.length === 0) {
      return NextResponse.json(
        { message: "Materi tidak ditemukan atau bukan milik Anda." },
        { status: 404 }
      );
    }

    const commentsResult = await pool.query(
      `
        SELECT
          cm.id,
          cm.content_id,
          cm.user_id,
          cm.comment,
          cm.created_at,
          cm.updated_at,
          u.display_name,
          u.email,
          u.role
        FROM comments cm
        INNER JOIN users u ON u.id = cm.user_id
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
        { message: auth.error || "Akses ditolak." },
        { status: auth.status || 401 }
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
    const comment =
      typeof body.comment === "string" ? body.comment.trim() : "";

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

    const contentResult = await pool.query(
      `
        SELECT ct.id
        FROM contents ct
        INNER JOIN courses c ON c.id = ct.course_id
        WHERE ct.id = $1 AND c.teacher_id = $2
      `,
      [contentId, teacherId]
    );

    if (contentResult.rows.length === 0) {
      return NextResponse.json(
        { message: "Materi tidak ditemukan atau bukan milik Anda." },
        { status: 404 }
      );
    }

    const insertResult = await pool.query(
      `
        INSERT INTO comments (content_id, user_id, comment)
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

    const userResult = await pool.query(
      `
        SELECT display_name, email, role
        FROM users
        WHERE id = $1
      `,
      [teacherId]
    );

    return NextResponse.json(
      {
        message: "Komentar berhasil dikirim.",
        comment: {
          ...insertResult.rows[0],
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

// ========================================
// DELETE: TEACHER MENGHAPUS KOMENTAR
// ========================================
export async function DELETE(request) {
  try {
    const auth = await getAuthenticatedUser(request, ["teacher"]);

    if (!auth.user) {
      return NextResponse.json(
        { message: auth.error || "Akses ditolak." },
        { status: auth.status || 401 }
      );
    }

    const teacherId = auth.user.id;
    const { searchParams } = new URL(request.url);
    const commentId = Number(searchParams.get("id"));

    if (!Number.isInteger(commentId) || commentId <= 0) {
      return NextResponse.json(
        { message: "ID komentar tidak valid." },
        { status: 400 }
      );
    }

    // Pastikan komentar berada pada kursus milik Teacher
    const deleteResult = await pool.query(
      `
        DELETE FROM comments cm
        USING contents ct, courses c
        WHERE
          cm.id = $1
          AND cm.content_id = ct.id
          AND ct.course_id = c.id
          AND c.teacher_id = $2
        RETURNING cm.id
      `,
      [commentId, teacherId]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        {
          message:
            "Komentar tidak ditemukan atau bukan bagian dari kursus Anda.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Komentar berhasil dihapus.",
      deletedId: deleteResult.rows[0].id,
    });
  } catch (error) {
    console.error("DELETE TEACHER COMMENT ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menghapus komentar." },
      { status: 500 }
    );
  }
}
