
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// ========================================
// HELPER: GET CURRENT USER
// ========================================
async function getCurrentUser() {
  const cookieStore = await cookies();
  const candidates = [
    cookieStore.get("nadhi_admin_token")?.value,
    cookieStore.get("nadhi_teacher_token")?.value,
    cookieStore.get("nadhi_student_token")?.value,
  ].filter(Boolean);

  for (const token of candidates) {
    try {
      const payload = await verifyToken(token);

      if (!payload?.id || !payload?.role) continue;

      const currentUser = await pool.query(
        `SELECT id, role, teacher_status
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [payload.id]
      );

      const user = currentUser.rows[0];

      if (!user || user.role !== payload.role) continue;
      if (user.role === "teacher" && user.teacher_status !== "approved") continue;

      return {
        id: user.id,
        role: user.role,
      };
    } catch {
      // Token dari sesi lain atau sesi kedaluwarsa diabaikan.
    }
  }

  return { id: null, role: null };
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
          u.display_name AS teacher_name,
          u.email AS teacher_email,

          (
            SELECT COUNT(*)::int
            FROM enrollments all_e
            WHERE all_e.course_id = c.id
              AND all_e.status = 'active'
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
          AND e.status = 'active'

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
    // GET HOMEPAGE COURSES
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
        u.display_name AS teacher_name,
        u.email AS teacher_email,
        COUNT(e.id)::int AS enrollment_count

      FROM courses c

      LEFT JOIN categories cat
        ON cat.id = c.category_id

      LEFT JOIN users u
        ON u.id = c.teacher_id

      LEFT JOIN enrollments e
        ON e.course_id = c.id
        AND e.status = 'active'

      WHERE
        (
          $1::text IS NULL
          OR c.title ILIKE '%' || $1 || '%'
          OR c.description ILIKE '%' || $1 || '%'
        )
        AND
        (
          $2::bigint IS NULL
          OR c.category_id = $2::bigint
        )

      GROUP BY
        c.id,
        cat.name,
        u.display_name,
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
      SELECT
        cat.id,
        cat.name,
        cat.description,
        COUNT(c.id)::int AS course_count
      FROM categories cat
      LEFT JOIN courses c
        ON c.category_id = cat.id
      GROUP BY cat.id
      ORDER BY cat.name ASC
      `
    );

    const statsResult = await pool.query(
      `
      SELECT
        (SELECT COUNT(*)::int FROM courses) AS courses,
        (SELECT COUNT(*)::int FROM contents) AS materials,
        (
          SELECT COUNT(*)::int FROM users
          WHERE role = 'teacher' AND teacher_status = 'approved'
        ) AS teachers,
        (
          SELECT COUNT(*)::int FROM users
          WHERE role = 'student'
        ) AS students,
        (SELECT COUNT(*)::int FROM certificates) AS certificates
      `
    );

    return NextResponse.json({
      success: true,
      courses: coursesResult.rows,
      categories: categoriesResult.rows,
      stats: statsResult.rows[0],
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
// POST: ENROLL / RE-ENROLL COURSE
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
    const courseId = Number(body.course_id ?? body.courseId);

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
        (student_id, course_id, enrolled_at, status)
      VALUES ($1, $2, NOW(), 'active')

      ON CONFLICT (student_id, course_id)
      DO UPDATE SET
        status = 'active',
        enrolled_at = NOW()
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

// ========================================
// PATCH: CANCEL ENROLLMENT
// ========================================
export async function PATCH(request) {
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

    // Menerima courseId maupun course_id
    const courseId = Number(body.courseId ?? body.course_id);

    if (!Number.isSafeInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { success: false, message: "ID course tidak valid." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      UPDATE enrollments
      SET status = 'cancelled'
      WHERE student_id = $1
        AND course_id = $2
        AND status = 'active'
      RETURNING id
      `,
      [user.id, courseId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Enrollment aktif tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Keikutsertaan course berhasil dibatalkan. Progress belajar tetap tersimpan.",
    });
  } catch (error) {
    console.error("Gagal membatalkan enrollment:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal membatalkan keikutsertaan course.",
      },
      { status: 500 }
    );
  }
}
