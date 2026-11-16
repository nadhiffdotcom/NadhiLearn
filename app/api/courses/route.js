
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// =====================================
// AUTHENTICATION & ROLE CHECK
// =====================================

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_token")?.value;

  if (!token) return null;

  const payload = await verifyToken(token);

  if (!payload) return null;

  const result = await pool.query(
    `SELECT id, username, email, role, teacher_status
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [payload.id]
  );

  if (result.rows.length === 0) return null;

  const user = result.rows[0];

  if (
    user.role !== "admin" &&
    !(
      user.role === "teacher" &&
      user.teacher_status === "approved"
    )
  ) {
    return null;
  }

  return user;
}

function normalizeDate(value) {
  return value ? value : null;
}

function validateCourseDates(startDate, endDate) {
  if (startDate && endDate && endDate < startDate) {
    return false;
  }

  return true;
}

// =====================================
// GET: LIST COURSES
// =====================================

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Akses ditolak. Silakan login kembali." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const search = searchParams.get("search") || "";
    const limit = 10;
    const offset = (page - 1) * limit;

    const values = [];
    let whereClause = "";

    if (user.role === "teacher") {
      values.push(user.id);
      whereClause = `WHERE c.teacher_id = $${values.length}`;
    }

    if (search.trim()) {
      values.push(`%${search.trim()}%`);

      const searchCondition = `
        (
          c.title ILIKE $${values.length}
          OR c.description ILIKE $${values.length}
          OR cat.name ILIKE $${values.length}
          OR u.username ILIKE $${values.length}
        )
      `;

      whereClause += whereClause
        ? ` AND ${searchCondition}`
        : `WHERE ${searchCondition}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM courses c
       JOIN categories cat ON cat.id = c.category_id
       JOIN users u ON u.id = c.teacher_id
       ${whereClause}`,
      values
    );

    const total = countResult.rows[0].total;

    const coursesResult = await pool.query(
      `SELECT
        c.id,
        c.title,
        c.description,
        c.category_id,
        c.teacher_id,
        c.thumbnail,
        c.start_date,
        c.end_date,
        c.created_at,
        c.updated_at,
        cat.name AS category_name,
        u.username AS teacher_name,
        u.email AS teacher_email
       FROM courses c
       JOIN categories cat ON cat.id = c.category_id
       JOIN users u ON u.id = c.teacher_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    const categoriesResult = await pool.query(
      `SELECT id, name
       FROM categories
       ORDER BY name ASC`
    );

    let teachers = [];

    if (user.role === "admin") {
      const teachersResult = await pool.query(
        `SELECT id, username, email
         FROM users
         WHERE role = 'teacher'
           AND teacher_status = 'approved'
         ORDER BY username ASC`
      );

      teachers = teachersResult.rows;
    }

    return NextResponse.json({
      courses: coursesResult.rows,
      categories: categoriesResult.rows,
      teachers,
      currentUser: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET COURSES ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengambil data kursus." },
      { status: 500 }
    );
  }
}

// =====================================
// POST: CREATE COURSE
// =====================================

export async function POST(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Akses ditolak." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      title,
      description,
      category_id,
      teacher_id,
      thumbnail,
      start_date,
      end_date,
    } = body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !category_id
    ) {
      return NextResponse.json(
        { message: "Judul, deskripsi, dan kategori wajib diisi." },
        { status: 400 }
      );
    }

    const categoryId = Number(category_id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json(
        { message: "Kategori tidak valid." },
        { status: 400 }
      );
    }

    const startDate = normalizeDate(start_date);
    const endDate = normalizeDate(end_date);

    if (!validateCourseDates(startDate, endDate)) {
      return NextResponse.json(
        { message: "Tanggal selesai tidak boleh sebelum tanggal mulai." },
        { status: 400 }
      );
    }

    let assignedTeacherId;

    if (user.role === "admin") {
      assignedTeacherId = Number(teacher_id);

      if (
        !Number.isInteger(assignedTeacherId) ||
        assignedTeacherId <= 0
      ) {
        return NextResponse.json(
          { message: "Silakan pilih pengajar." },
          { status: 400 }
        );
      }
    } else {
      assignedTeacherId = user.id;
    }

    const teacherResult = await pool.query(
      `SELECT id
       FROM users
       WHERE id = $1
         AND role = 'teacher'
         AND teacher_status = 'approved'
       LIMIT 1`,
      [assignedTeacherId]
    );

    if (teacherResult.rows.length === 0) {
      return NextResponse.json(
        { message: "Pengajar tidak valid atau belum disetujui." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO courses (
        title,
        description,
        category_id,
        teacher_id,
        thumbnail,
        start_date,
        end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        title.trim(),
        description.trim(),
        categoryId,
        assignedTeacherId,
        thumbnail?.trim() || null,
        startDate,
        endDate,
      ]
    );

    return NextResponse.json(
      {
        message: "Kursus berhasil ditambahkan.",
        course: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST COURSE ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menambahkan kursus." },
      { status: 500 }
    );
  }
}

// =====================================
// PUT: UPDATE COURSE
// =====================================

export async function PUT(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Akses ditolak." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      id,
      title,
      description,
      category_id,
      teacher_id,
      thumbnail,
      start_date,
      end_date,
    } = body;

    const courseId = Number(id);
    const categoryId = Number(category_id);

    if (
      !Number.isInteger(courseId) ||
      courseId <= 0 ||
      !title?.trim() ||
      !description?.trim() ||
      !Number.isInteger(categoryId) ||
      categoryId <= 0
    ) {
      return NextResponse.json(
        { message: "Data kursus tidak lengkap atau tidak valid." },
        { status: 400 }
      );
    }

    const startDate = normalizeDate(start_date);
    const endDate = normalizeDate(end_date);

    if (!validateCourseDates(startDate, endDate)) {
      return NextResponse.json(
        { message: "Tanggal selesai tidak boleh sebelum tanggal mulai." },
        { status: 400 }
      );
    }

    const existingCourse = await pool.query(
      `SELECT id, teacher_id
       FROM courses
       WHERE id = $1
       LIMIT 1`,
      [courseId]
    );

    if (existingCourse.rows.length === 0) {
      return NextResponse.json(
        { message: "Kursus tidak ditemukan." },
        { status: 404 }
      );
    }

    const course = existingCourse.rows[0];

    if (
      user.role === "teacher" &&
      String(course.teacher_id) !== String(user.id)
    ) {
      return NextResponse.json(
        { message: "Kamu hanya dapat mengedit kursus milik sendiri." },
        { status: 403 }
      );
    }

    let assignedTeacherId = course.teacher_id;

    if (user.role === "admin") {
      assignedTeacherId = Number(teacher_id);

      if (
        !Number.isInteger(assignedTeacherId) ||
        assignedTeacherId <= 0
      ) {
        return NextResponse.json(
          { message: "Silakan pilih pengajar." },
          { status: 400 }
        );
      }

      const teacherResult = await pool.query(
        `SELECT id
         FROM users
         WHERE id = $1
           AND role = 'teacher'
           AND teacher_status = 'approved'
         LIMIT 1`,
        [assignedTeacherId]
      );

      if (teacherResult.rows.length === 0) {
        return NextResponse.json(
          { message: "Pengajar tidak valid." },
          { status: 400 }
        );
      }
    }

    const result = await pool.query(
      `UPDATE courses
       SET
         title = $1,
         description = $2,
         category_id = $3,
         teacher_id = $4,
         thumbnail = $5,
         start_date = $6,
         end_date = $7,
         updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        title.trim(),
        description.trim(),
        categoryId,
        assignedTeacherId,
        thumbnail?.trim() || null,
        startDate,
        endDate,
        courseId,
      ]
    );

    return NextResponse.json({
      message: "Kursus berhasil diperbarui.",
      course: result.rows[0],
    });
  } catch (error) {
    console.error("PUT COURSE ERROR:", error);

    return NextResponse.json(
      { message: "Gagal memperbarui kursus." },
      { status: 500 }
    );
  }
}

// =====================================
// DELETE: DELETE COURSE
// =====================================

export async function DELETE(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { message: "Akses ditolak." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = Number(searchParams.get("id"));

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return NextResponse.json(
        { message: "ID kursus tidak valid." },
        { status: 400 }
      );
    }

    const existingCourse = await pool.query(
      `SELECT id, teacher_id
       FROM courses
       WHERE id = $1
       LIMIT 1`,
      [courseId]
    );

    if (existingCourse.rows.length === 0) {
      return NextResponse.json(
        { message: "Kursus tidak ditemukan." },
        { status: 404 }
      );
    }

    const course = existingCourse.rows[0];

    if (
      user.role === "teacher" &&
      String(course.teacher_id) !== String(user.id)
    ) {
      return NextResponse.json(
        { message: "Kamu hanya dapat menghapus kursus milik sendiri." },
        { status: 403 }
      );
    }

    await pool.query(
      `DELETE FROM courses
       WHERE id = $1`,
      [courseId]
    );

    return NextResponse.json({
      message: "Kursus berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE COURSE ERROR:", error);

    return NextResponse.json(
      {
        message:
          "Gagal menghapus kursus. Periksa apakah kursus masih memiliki data terkait.",
      },
      { status: 500 }
    );
  }
}
