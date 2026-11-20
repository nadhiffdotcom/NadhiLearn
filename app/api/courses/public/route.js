
import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || null;
    const categoryId = searchParams.get("category_id") || null;

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const limit = 9;
    const offset = (page - 1) * limit;

    // Mengambil seluruh course sesuai search dan kategori.
    const coursesResult = await pool.query(
      `
      SELECT
        c.id,
        c.title,
        c.description,
        c.category_id,
        c.thumbnail,
        c.start_date,
        c.end_date,
        c.created_at,
        cat.name AS category_name,
        u.username AS teacher_name,
        u.email AS teacher_email,
        COUNT(e.id)::int AS enrollment_count
      FROM courses c
      LEFT JOIN categories cat ON cat.id = c.category_id
      LEFT JOIN users u ON u.id = c.teacher_id
      LEFT JOIN enrollments e
        ON e.course_id = c.id
        AND e.status = 'active'
      WHERE
        ($1::text IS NULL OR
          c.title ILIKE '%' || $1 || '%' OR
          c.description ILIKE '%' || $1 || '%')
        AND
        ($2::bigint IS NULL OR c.category_id = $2::bigint)
      GROUP BY
        c.id,
        cat.name,
        u.username,
        u.email
      ORDER BY
        c.created_at DESC
      LIMIT $3 OFFSET $4
      `,
      [search, categoryId, limit, offset]
    );

    // Menghitung total course sesuai filter.
    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM courses c
      WHERE
        ($1::text IS NULL OR
          c.title ILIKE '%' || $1 || '%' OR
          c.description ILIKE '%' || $1 || '%')
        AND
        ($2::bigint IS NULL OR c.category_id = $2::bigint)
      `,
      [search, categoryId]
    );

    // Mengambil seluruh kategori untuk filter.
    const categoriesResult = await pool.query(
      `
      SELECT id, name
      FROM categories
      ORDER BY name ASC
      `
    );

    const total = countResult.rows[0].total;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      courses: coursesResult.rows,
      categories: categoriesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Gagal mengambil All Courses:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data course.",
      },
      { status: 500 }
    );
  }
}
