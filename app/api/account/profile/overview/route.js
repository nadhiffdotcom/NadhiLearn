
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth-server";

export async function GET(request) {
  try {
    const auth = await getAuthenticatedUser(request);

    if (!auth.user) {
      return NextResponse.json(
        { success: false, message: auth.error || "Akses ditolak." },
        { status: auth.status || 401 }
      );
    }

    const user = auth.user;
    let overview = {};

    // ========================================
    // STUDENT: COURSE DAN LEARNING PROGRESS
    // ========================================
    if (user.role === "student") {
      const result = await pool.query(
        `
          SELECT
            c.id AS course_id,
            c.title,
            c.thumbnail,
            e.id AS enrollment_id,
            COUNT(DISTINCT ct.id)::int AS total_contents,
            COUNT(DISTINCT ct.id) FILTER (
              WHERE cp.is_completed = TRUE
            )::int AS completed_contents
          FROM enrollments e
          INNER JOIN courses c ON c.id = e.course_id
          LEFT JOIN contents ct ON ct.course_id = c.id
          LEFT JOIN content_progress cp
            ON cp.content_id = ct.id
            AND cp.enrollment_id = e.id
          WHERE e.student_id = $1
            AND e.status = 'active'
          GROUP BY c.id, c.title, c.thumbnail, e.id, e.enrolled_at
          ORDER BY e.enrolled_at DESC
        `,
        [user.id]
      );

      overview.courses = result.rows.map((course) => {
        const total = Number(course.total_contents) || 0;
        const completed = Number(course.completed_contents) || 0;

        return {
          ...course,
          progress:
            total > 0
              ? Math.round((completed / total) * 100)
              : 0,
        };
      });
    }

    // ========================================
    // TEACHER: COURSE DAN STUDENT PROGRESS
    // ========================================
    if (user.role === "teacher") {
      const result = await pool.query(
        `
          SELECT
            c.id AS course_id,
            c.title AS course_title,
            COUNT(DISTINCT e.id)::int AS total_students,
            COUNT(DISTINCT ct.id)::int AS total_contents,
            COUNT(DISTINCT e.id) FILTER (
              WHERE EXISTS (
                SELECT 1
                FROM contents ct2
                WHERE ct2.course_id = c.id
              )
              AND NOT EXISTS (
                SELECT 1
                FROM contents ct2
                WHERE ct2.course_id = c.id
                  AND NOT EXISTS (
                    SELECT 1
                    FROM content_progress cp
                    WHERE cp.enrollment_id = e.id
                      AND cp.content_id = ct2.id
                      AND cp.is_completed = TRUE
                  )
              )
            )::int AS completed_students
          FROM courses c
          LEFT JOIN enrollments e
            ON e.course_id = c.id
            AND e.status = 'active'
          LEFT JOIN contents ct ON ct.course_id = c.id
          WHERE c.teacher_id = $1
          GROUP BY c.id, c.title
          ORDER BY c.title ASC
        `,
        [user.id]
      );

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
          INNER JOIN courses c ON c.id = e.course_id
          INNER JOIN users u ON u.id = e.student_id
          LEFT JOIN contents ct ON ct.course_id = c.id
          LEFT JOIN content_progress cp
            ON cp.content_id = ct.id
            AND cp.enrollment_id = e.id
          WHERE c.teacher_id = $1
            AND e.status = 'active'
          GROUP BY
            c.id, c.title, e.id,
            u.id, u.username, u.email, e.enrolled_at
          ORDER BY c.title ASC, u.username ASC
        `,
        [user.id]
      );

      overview.courses = result.rows;
      overview.students = progressResult.rows.map((student) => {
        const total = Number(student.total_contents) || 0;
        const completed = Number(student.completed_contents) || 0;

        return {
          ...student,
          progress:
            total > 0
              ? Math.min(100, Math.round((completed / total) * 100))
              : 0,
        };
      });
    }

    // ========================================
    // TEACHER APPLICATION STATUS
    // ========================================
    if (user.role === "student") {
      overview.teacherStatus = user.teacher_status || null;
    }

    return NextResponse.json({
      success: true,
      overview,
    });
  } catch (error) {
    console.error("GET PROFILE OVERVIEW ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil informasi Profile.",
      },
      { status: 500 }
    );
  }
}