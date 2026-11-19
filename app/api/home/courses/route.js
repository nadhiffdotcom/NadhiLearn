
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// ========================================
// HELPER: GET LOGIN STUDENT
// ========================================
async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_student_token")?.value;

  if (!token) {
    return { id: null, role: null };
  }

  try {
    const payload = await verifyToken(token);

    if (!payload?.id || !payload?.role) {
      return { id: null, role: null };
    }

    return {
      id: payload.id,
      role: payload.role,
    };
  } catch {
    return { id: null, role: null };
  }
}

// ========================================
// GET COURSES / COURSE DETAIL
// ========================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("id");

    const user = await getCurrentUser();

    // ========================================
    // GET SINGLE COURSE DETAIL
    // ========================================
    if (courseId) {
      if (!/^\d+$/.test(courseId)) {
        return NextResponse.json(
          { success: false, message: "ID course tidak valid." },
          { status: 400 }
        );
      }

      const studentId =
        user.role === "student" ? user.id : null;

      const result = await pool.query(
        `
        SELECT
          c.id,
          c.title,
          c.description,
          c.category_id,
          c.thumbnail,
          c.start_date,
          c.end_date,
          cat.name AS category_name,
          u.username AS teacher_name,
          u.email AS teacher_email,

          (
            SELECT COUNT(*)::int
            FROM enrollments all_e
            WHERE all_e.course_id = c.id
          ) AS enrollment_count,

          CASE
            WHEN e.id IS NOT NULL THEN TRUE
            ELSE FALSE
          END AS is_enrolled,

          (
            SELECT COUNT(*)::int
            FROM contents ct
            WHERE ct.course_id = c.id
          ) AS total_contents,

          (
            SELECT COUNT(*)::int
            FROM content_progress cp
            JOIN contents ct ON ct.id = cp.content_id
            WHERE cp.enrollment_id = e.id
              AND cp.is_completed = TRUE
              AND ct.course_id = c.id
          ) AS completed_contents

        FROM courses c

        LEFT JOIN categories cat
          ON cat.id = c.category_id

        LEFT JOIN users u
          ON u.id = c.teacher_id

        LEFT JOIN enrollments e
          ON e.course_id = c.id
          AND e.student_id = $1

        WHERE c.id = $2
        LIMIT 1
        `,
        [studentId, courseId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: "Course tidak ditemukan." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        course: result.rows[0],
        userRole: user.role,
      });
    }

    // ========================================
    // GET HOMEPAGE COURSES (EXISTING)
    // ========================================
    const search = searchParams.get("search")?.trim() || null;
    const categoryId = searchParams.get("category_id") || null;

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
      LEFT JOIN enrollments e ON e.course_id = c.id
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
        COUNT(e.id) DESC,
        c.created_at DESC
      LIMIT 5
      `,
      [search, categoryId]
    );

    const categoriesResult = await pool.query(
      `
      SELECT id, name
      FROM categories
      ORDER BY name ASC
      `
    );

    return NextResponse.json({
      success: true,
      courses: coursesResult.rows,
      categories: categoriesResult.rows,
    });
  } catch (error) {
    console.error("Gagal mengambil course:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data course.",
      },
      { status: 500 }
    );
  }
}

// ========================================
// POST: ENROLL COURSE
// ========================================
export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user.id || user.role !== "student") {
      return NextResponse.json(
        {
          success: false,
          message: "Silakan login sebagai Student terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const courseId = Number(body.course_id);

    if (!Number.isSafeInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { success: false, message: "ID course tidak valid." },
        { status: 400 }
      );
    }

    const course = await pool.query(
      "SELECT id FROM courses WHERE id = $1 LIMIT 1",
      [courseId]
    );

    if (course.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Course tidak ditemukan." },
        { status: 404 }
      );
    }

    await pool.query(
      `
      INSERT INTO enrollments
        (student_id, course_id, enrolled_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (student_id, course_id) DO NOTHING
      `,
      [user.id, courseId]
    );

    return NextResponse.json({
      success: true,
      message: "Berhasil mengikuti course.",
    });
  } catch (error) {
    console.error("Gagal enroll course:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengikuti course.",
      },
      { status: 500 }
    );
  }
}
