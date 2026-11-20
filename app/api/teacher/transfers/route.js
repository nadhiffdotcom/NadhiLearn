
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// =====================================
// AUTHENTICATION
// =====================================

async function getCurrentTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_teacher_token")?.value;

  if (!token) return null;

  try {
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
  } catch (error) {
    console.error("TRANSFER AUTH ERROR:", error);
    return null;
  }
}

function authError() {
  return NextResponse.json(
    { message: "Akses ditolak. Silakan login kembali." },
    { status: 401 }
  );
}

function validId(value) {
  return /^\d+$/.test(String(value)) && BigInt(value) > 0n;
}

// =====================================
// GET: TRANSFER DATA
// =====================================

export async function GET() {
  try {
    const user = await getCurrentTeacher();

    if (!user) return authError();

    const requestsResult = await pool.query(
      `SELECT
        r.id,
        r.from_teacher_id,
        r.to_teacher_id,
        r.from_teacher_username,
        r.to_teacher_username,
        r.status,
        r.requested_at,
        r.responded_at,
        CASE
          WHEN r.from_teacher_id = $1 THEN 'sent'
          ELSE 'received'
        END AS direction,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', i.id,
                'course_id', i.course_id,
                'course_title', i.course_title
              )
              ORDER BY i.id
            )
            FROM course_transfer_items i
            WHERE i.request_id = r.id
          ),
          '[]'::json
        ) AS courses
       FROM course_transfer_requests r
       WHERE r.from_teacher_id = $1
          OR r.to_teacher_id = $1
       ORDER BY r.requested_at DESC`,
      [user.id]
    );

    const teachersResult = await pool.query(
      `SELECT id, username, email
       FROM users
       WHERE role = 'teacher'
         AND teacher_status = 'approved'
         AND id <> $1
       ORDER BY username ASC`,
      [user.id]
    );

    return NextResponse.json({
      sentRequests: requestsResult.rows.filter(
        (item) => item.direction === "sent"
      ),
      receivedRequests: requestsResult.rows.filter(
        (item) => item.direction === "received"
      ),
      teachers: teachersResult.rows,
    });
  } catch (error) {
    console.error("GET TRANSFERS ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengambil data permintaan transfer." },
      { status: 500 }
    );
  }
}

// =====================================
// POST: CREATE TRANSFER REQUEST
// =====================================

export async function POST(request) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const user = await getCurrentTeacher();

    if (!user) return authError();

    const body = await request.json();
    const { toTeacherId, courseIds } = body;

    if (
      !validId(toTeacherId) ||
      !Array.isArray(courseIds) ||
      courseIds.length === 0 ||
      !courseIds.every(validId)
    ) {
      return NextResponse.json(
        { message: "Data transfer tidak valid." },
        { status: 400 }
      );
    }

    const uniqueCourseIds = [...new Set(courseIds.map(String))];

    if (uniqueCourseIds.length !== courseIds.length) {
      return NextResponse.json(
        { message: "Terdapat kursus yang dipilih lebih dari sekali." },
        { status: 400 }
      );
    }

    if (String(toTeacherId) === String(user.id)) {
      return NextResponse.json(
        { message: "Tidak dapat mentransfer kursus kepada diri sendiri." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const recipientResult = await client.query(
      `SELECT id, username
       FROM users
       WHERE id = $1
         AND role = 'teacher'
         AND teacher_status = 'approved'
       FOR SHARE`,
      [toTeacherId]
    );

    if (recipientResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        { message: "Teacher penerima tidak valid atau belum disetujui." },
        { status: 400 }
      );
    }

    const coursesResult = await client.query(
      `SELECT id, title
       FROM courses
       WHERE id = ANY($1::bigint[])
         AND teacher_id = $2
       ORDER BY id
       FOR UPDATE`,
      [uniqueCourseIds, user.id]
    );

    if (coursesResult.rows.length !== uniqueCourseIds.length) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        { message: "Sebagian kursus bukan milik Anda atau tidak ditemukan." },
        { status: 400 }
      );
    }

    const pendingResult = await client.query(
      `SELECT i.course_id
       FROM course_transfer_items i
       JOIN course_transfer_requests r
         ON r.id = i.request_id
       WHERE i.course_id = ANY($1::bigint[])
         AND r.status = 'pending'
       LIMIT 1`,
      [uniqueCourseIds]
    );

    if (pendingResult.rows.length > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        { message: "Ada kursus yang masih memiliki permintaan transfer pending." },
        { status: 409 }
      );
    }

    const requestResult = await client.query(
      `INSERT INTO course_transfer_requests (
        from_teacher_id,
        to_teacher_id,
        from_teacher_username,
        to_teacher_username,
        status,
        requested_at
      )
      VALUES ($1, $2, $3, $4, 'pending', NOW())
      RETURNING id`,
      [
        user.id,
        toTeacherId,
        user.username,
        recipientResult.rows[0].username,
      ]
    );

    const transferRequestId = requestResult.rows[0].id;

    for (const course of coursesResult.rows) {
      await client.query(
        `INSERT INTO course_transfer_items (
          request_id,
          course_id,
          course_title,
          created_at
        )
        VALUES ($1, $2, $3, NOW())`,
        [transferRequestId, course.id, course.title]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json(
      {
        message: "Permintaan transfer berhasil dikirim.",
        requestId: transferRequestId,
      },
      { status: 201 }
    );
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("POST TRANSFER ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengirim permintaan transfer." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
