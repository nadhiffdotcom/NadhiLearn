
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_admin_token")?.value;

  if (!token) return null;

  try {
    const decoded = await verifyToken(token);
    if (!decoded || decoded.role !== "admin") return null;
    return decoded;
  } catch {
    return null;
  }
}

// GET: Daftar testimoni dengan pencarian dan pagination
export async function GET(request) {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "";

    if (status && !["published", "draft"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Filter status tidak valid." },
        { status: 400 }
      );
    }

    const limit = 10;
    const publishedFilter =
      status === "published" ? true :
      status === "draft" ? false : null;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM testimonials
       WHERE (
         $1 = ''
         OR student_name ILIKE '%' || $1 || '%'
         OR course_title ILIKE '%' || $1 || '%'
         OR content ILIKE '%' || $1 || '%'
       )
       AND ($2::boolean IS NULL OR is_published = $2)`,
      [search, publishedFilter]
    );

    const total = Number(countResult.rows[0].total);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const result = await pool.query(
      `SELECT
         id,
         student_name,
         course_title,
         content,
         rating,
         is_published,
         created_at,
         updated_at
       FROM testimonials
       WHERE (
         $1 = ''
         OR student_name ILIKE '%' || $1 || '%'
         OR course_title ILIKE '%' || $1 || '%'
         OR content ILIKE '%' || $1 || '%'
       )
       AND ($2::boolean IS NULL OR is_published = $2)
       ORDER BY created_at DESC, id DESC
       LIMIT $3 OFFSET $4`,
      [search, publishedFilter, limit, offset]
    );

    return NextResponse.json({
      success: true,
      testimonials: result.rows,
      pagination: {
        currentPage,
        totalPages,
        total,
        limit,
      },
    });
  } catch (error) {
    console.error("GET TESTIMONIALS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data testimoni." },
      { status: 500 }
    );
  }
}

// POST: Tambah testimoni
export async function POST(request) {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const studentName = body.student_name?.trim();
    const courseTitle = body.course_title?.trim();
    const content = body.content?.trim();
    const rating = Number(body.rating ?? 5);
    const isPublished = body.is_published === true;

    if (!studentName || !courseTitle || !content) {
      return NextResponse.json(
        { success: false, message: "Semua field wajib diisi." },
        { status: 400 }
      );
    }

    if (studentName.length > 100 || courseTitle.length > 200) {
      return NextResponse.json(
        { success: false, message: "Nama atau judul kursus terlalu panjang." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: "Rating harus antara 1 sampai 5." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO testimonials (
        student_name,
        course_title,
        content,
        rating,
        is_published
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [studentName, courseTitle, content, rating, isPublished]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Testimoni berhasil ditambahkan.",
        testimonial: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST TESTIMONIAL ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal menambahkan testimoni." },
      { status: 500 }
    );
  }
}

// PUT: Edit testimoni
export async function PUT(request) {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = Number(body.id);
    const studentName = body.student_name?.trim();
    const courseTitle = body.course_title?.trim();
    const content = body.content?.trim();
    const rating = Number(body.rating);
    const isPublished = body.is_published === true;

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !studentName ||
      !courseTitle ||
      !content
    ) {
      return NextResponse.json(
        { success: false, message: "Data testimoni tidak lengkap." },
        { status: 400 }
      );
    }

    if (studentName.length > 100 || courseTitle.length > 200) {
      return NextResponse.json(
        { success: false, message: "Nama atau judul kursus terlalu panjang." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: "Rating harus antara 1 sampai 5." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE testimonials
       SET
         student_name = $1,
         course_title = $2,
         content = $3,
         rating = $4,
         is_published = $5,
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [studentName, courseTitle, content, rating, isPublished, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Testimoni tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Testimoni berhasil diperbarui.",
      testimonial: result.rows[0],
    });
  } catch (error) {
    console.error("PUT TESTIMONIAL ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal memperbarui testimoni." },
      { status: 500 }
    );
  }
}

// DELETE: Hapus testimoni
export async function DELETE(request) {
  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "ID testimoni tidak valid." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "DELETE FROM testimonials WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Testimoni tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Testimoni berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE TESTIMONIAL ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal menghapus testimoni." },
      { status: 500 }
    );
  }
}
