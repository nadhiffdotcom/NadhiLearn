
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// =====================================
// AUTHENTICATION & ROLE CHECK
// =====================================

async function getCurrentTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_token")?.value;

  if (!token) return null;

  const payload = await verifyToken(token);

  if (!payload?.id) return null;

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
    user.role !== "teacher" ||
    user.teacher_status !== "approved"
  ) {
    return null;
  }

  return user;
}

// =====================================
// VALIDATION
// =====================================

function validateContent(title, content, courseId, orderIndex) {
  if (typeof title !== "string" || !title.trim()) {
    return "Judul materi wajib diisi.";
  }

  if (typeof content !== "string" || !content.trim()) {
    return "Isi materi wajib diisi.";
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return "Kursus tidak valid.";
  }

  if (
    !Number.isInteger(orderIndex) ||
    orderIndex <= 0
  ) {
    return "Urutan materi harus berupa angka positif.";
  }

  return null;
}

// =====================================
// CHECK COURSE OWNERSHIP
// =====================================

async function isCourseOwnedByTeacher(courseId, teacherId) {
  const result = await pool.query(
    `SELECT id
     FROM courses
     WHERE id = $1
       AND teacher_id = $2
     LIMIT 1`,
    [courseId, teacherId]
  );

  return result.rows.length > 0;
}

// =====================================
// GET: LIST CONTENTS
// =====================================

export async function GET(request) {
  try {
    const user = await getCurrentTeacher();

    if (!user) {
      return NextResponse.json(
        { message: "Akses ditolak. Silakan login sebagai Teacher." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const search = searchParams.get("search") || "";
    const courseIdParam = searchParams.get("course_id");

    const limit = 10;
    const offset = (page - 1) * limit;

    const values = [user.id];
    let whereClause = "WHERE c.teacher_id = $1";

    if (courseIdParam) {
      const courseId = Number(courseIdParam);

      if (!Number.isInteger(courseId) || courseId <= 0) {
        return NextResponse.json(
          { message: "Filter kursus tidak valid." },
          { status: 400 }
        );
      }

      values.push(courseId);
      whereClause += ` AND ct.course_id = $${values.length}`;
    }

    if (search.trim()) {
      values.push(`%${search.trim()}%`);
      const searchIndex = values.length;

      whereClause += `
        AND (
          ct.title ILIKE $${searchIndex}
          OR ct.description ILIKE $${searchIndex}
          OR ct.content ILIKE $${searchIndex}
          OR c.title ILIKE $${searchIndex}
        )
      `;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM contents ct
       JOIN courses c ON c.id = ct.course_id
       ${whereClause}`,
      values
    );

    const total = countResult.rows[0].total;

    const contentsResult = await pool.query(
      `SELECT
        ct.id,
        ct.course_id,
        ct.title,
        ct.description,
        ct.content,
        ct.order_index,
        ct.created_at,
        ct.updated_at,
        c.title AS course_title
       FROM contents ct
       JOIN courses c ON c.id = ct.course_id
       ${whereClause}
       ORDER BY ct.course_id ASC, ct.order_index ASC, ct.id ASC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    // Setiap kursus memiliki nomor urut materi sendiri.
    // next_order_index dihitung langsung dari seluruh data kursus.
    const coursesResult = await pool.query(
      `SELECT
        c.id,
        c.title,
        COALESCE(
          (
            SELECT MAX(ct.order_index) + 1
            FROM contents ct
            WHERE ct.course_id = c.id
          ),
          1
        )::int AS next_order_index
       FROM courses c
       WHERE c.teacher_id = $1
       ORDER BY c.title ASC`,
      [user.id]
    );

    return NextResponse.json({
      contents: contentsResult.rows,
      courses: coursesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET CONTENTS ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengambil data materi." },
      { status: 500 }
    );
  }
}

// =====================================
// POST: CREATE CONTENT
// =====================================

export async function POST(request) {
  let client;

  try {
    const user = await getCurrentTeacher();

    if (!user) {
      return NextResponse.json(
        { message: "Akses ditolak." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      course_id,
      title,
      description,
      content,
    } = body;

    const courseId = Number(course_id);

    if (
      !Number.isInteger(courseId) ||
      courseId <= 0
    ) {
      return NextResponse.json(
        { message: "Kursus tidak valid." },
        { status: 400 }
      );
    }

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { message: "Judul materi wajib diisi." },
        { status: 400 }
      );
    }

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { message: "Isi materi wajib diisi." },
        { status: 400 }
      );
    }

    client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Kunci per kursus agar dua proses tambah materi
      // tidak memperoleh nomor urut yang sama.
      await client.query(
        "SELECT pg_advisory_xact_lock($1::int, $2::int)",
        [73142, courseId]
      );

      const ownedResult = await client.query(
        `SELECT id
         FROM courses
         WHERE id = $1
           AND teacher_id = $2
         LIMIT 1`,
        [courseId, user.id]
      );

      if (ownedResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            message:
              "Kamu hanya dapat menambahkan materi ke kursus milik sendiri.",
          },
          { status: 403 }
        );
      }

      // Hitung urutan berikutnya dari seluruh materi kursus.
      const orderResult = await client.query(
        `SELECT COALESCE(MAX(order_index), 0) + 1 AS next_order
         FROM contents
         WHERE course_id = $1`,
        [courseId]
      );

      const nextOrder = Number(orderResult.rows[0].next_order);

      const result = await client.query(
        `INSERT INTO contents (
          course_id,
          title,
          description,
          content,
          order_index
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          courseId,
          title.trim(),
          typeof description === "string"
            ? description.trim() || null
            : null,
          content.trim(),
          nextOrder,
        ]
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: `Materi berhasil ditambahkan dengan urutan ${nextOrder}.`,
          content: result.rows[0],
        },
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST CONTENT ERROR:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        {
          message:
            "Terjadi benturan urutan materi. Silakan coba tambahkan kembali.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Gagal menambahkan materi." },
      { status: 500 }
    );
  }
}

// =====================================
// PUT: UPDATE CONTENT
// =====================================

export async function PUT(request) {
  try {
    const user = await getCurrentTeacher();

    if (!user) {
      return NextResponse.json(
        { message: "Akses ditolak." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      id,
      course_id,
      title,
      description,
      content,
      order_index,
    } = body;

    const contentId = Number(id);
    const courseId = Number(course_id);
    const orderIndex = Number(order_index);

    if (
      !Number.isInteger(contentId) ||
      contentId <= 0
    ) {
      return NextResponse.json(
        { message: "ID materi tidak valid." },
        { status: 400 }
      );
    }

    const validationError = validateContent(
      title,
      content,
      courseId,
      orderIndex
    );

    if (validationError) {
      return NextResponse.json(
        { message: validationError },
        { status: 400 }
      );
    }

    const existingContent = await pool.query(
      `SELECT ct.id
       FROM contents ct
       JOIN courses c ON c.id = ct.course_id
       WHERE ct.id = $1
         AND c.teacher_id = $2
       LIMIT 1`,
      [contentId, user.id]
    );

    if (existingContent.rows.length === 0) {
      return NextResponse.json(
        { message: "Materi tidak ditemukan atau bukan milikmu." },
        { status: 404 }
      );
    }

    const owned = await isCourseOwnedByTeacher(
      courseId,
      user.id
    );

    if (!owned) {
      return NextResponse.json(
        { message: "Kamu tidak memiliki akses ke kursus tersebut." },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `UPDATE contents
       SET
         course_id = $1,
         title = $2,
         description = $3,
         content = $4,
         order_index = $5,
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        courseId,
        title.trim(),
        typeof description === "string"
          ? description.trim() || null
          : null,
        content.trim(),
        orderIndex,
        contentId,
      ]
    );

    return NextResponse.json({
      message: "Materi berhasil diperbarui.",
      content: result.rows[0],
    });
  } catch (error) {
    console.error("PUT CONTENT ERROR:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        {
          message:
            "Urutan materi tersebut sudah digunakan pada kursus ini.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Gagal memperbarui materi." },
      { status: 500 }
    );
  }
}

// =====================================
// DELETE: DELETE CONTENT
// =====================================

export async function DELETE(request) {
  try {
    const user = await getCurrentTeacher();

    if (!user) {
      return NextResponse.json(
        { message: "Akses ditolak." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contentId = Number(searchParams.get("id"));

    if (
      !Number.isInteger(contentId) ||
      contentId <= 0
    ) {
      return NextResponse.json(
        { message: "ID materi tidak valid." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM contents ct
       USING courses c
       WHERE ct.course_id = c.id
         AND ct.id = $1
         AND c.teacher_id = $2
       RETURNING ct.id`,
      [contentId, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: "Materi tidak ditemukan atau bukan milikmu." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Materi berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE CONTENT ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menghapus materi." },
      { status: 500 }
    );
  }
}
