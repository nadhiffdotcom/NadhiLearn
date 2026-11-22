
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth-server";

// ========================================
// GET: TEACHER STUDENT PROGRESS
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

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const search = searchParams.get("search") || "";
    const courseId = searchParams.get("course_id");

    const limit = 10;
    const offset = (page - 1) * limit;

    const values = [teacherId];

    let whereClause = "WHERE c.teacher_id = $1 AND e.status = 'active'";

    if (courseId) {
      const parsedCourseId = Number(courseId);

      if (
        !Number.isInteger(parsedCourseId) ||
        parsedCourseId <= 0
      ) {
        return NextResponse.json(
          { message: "Filter course tidak valid." },
          { status: 400 }
        );
      }

      values.push(parsedCourseId);
      whereClause += ` AND c.id = $${values.length}`;
    }

    if (search.trim()) {
      values.push(`%${search.trim()}%`);

      whereClause += `
        AND (
          c.title ILIKE $${values.length}
          OR u.username ILIKE $${values.length}
          OR u.email ILIKE $${values.length}
        )
      `;
    }

    // ========================================
    // COUNT TOTAL ENROLLMENTS
    // ========================================
    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM enrollments e
        INNER JOIN courses c
          ON c.id = e.course_id
        INNER JOIN users u
          ON u.id = e.student_id
        ${whereClause}
      `,
      values
    );

    const total = countResult.rows[0].total;
    const totalPages = Math.ceil(total / limit);

    // ========================================
    // GET STUDENT PROGRESS
    // ========================================
    const progressResult = await pool.query(
      `
        SELECT
          c.id AS course_id,
          c.title AS course_title,

          e.id AS enrollment_id,

          u.id AS student_id,
          u.username AS student_name,
          u.email AS student_email,

          COUNT(DISTINCT ct.id)::int AS total_contents,

          COUNT(DISTINCT ct.id) FILTER (
            WHERE cp.is_completed = TRUE
          )::int AS completed_contents

        FROM enrollments e

        INNER JOIN courses c
          ON c.id = e.course_id

        INNER JOIN users u
          ON u.id = e.student_id

        LEFT JOIN contents ct
          ON ct.course_id = c.id

        LEFT JOIN content_progress cp
          ON cp.content_id = ct.id
          AND cp.enrollment_id = e.id

        ${whereClause}

        GROUP BY
          c.id,
          c.title,
          e.id,
          u.id,
          u.username,
          u.email,
          e.enrolled_at

        ORDER BY
          c.title ASC,
          u.username ASC

        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
      `,
      [...values, limit, offset]
    );

    // ========================================
    // GET TEACHER COURSES FOR FILTER
    // ========================================
    const coursesResult = await pool.query(
      `
        SELECT id, title
        FROM courses
        WHERE teacher_id = $1
        ORDER BY title ASC
      `,
      [teacherId]
    );

    return NextResponse.json({
      students: progressResult.rows,
      courses: coursesResult.rows,

      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET TEACHER STUDENT PROGRESS ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengambil data progress siswa." },
      { status: 500 }
    );
  }
}
