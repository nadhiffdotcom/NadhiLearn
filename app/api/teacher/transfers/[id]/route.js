
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
    console.error("TRANSFER AUTH ERROR:", error.message);
    return null;
  }
}

function authError() {
  return NextResponse.json(
    { message: "Akses ditolak. Silakan login kembali." },
    { status: 401 }
  );
}

function isValidId(value) {
  return (
    (typeof value === "string" ||
      typeof value === "number") &&
    /^\d+$/.test(String(value)) &&
    BigInt(value) > 0n
  );
}

// =====================================
// PATCH: ACCEPT OR REJECT TRANSFER
// =====================================

export async function PATCH(request, { params }) {
  let client;

  try {
    const user = await getCurrentTeacher();

    if (!user) {
      return authError();
    }

    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json(
        { message: "ID permintaan transfer tidak valid." },
        { status: 400 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const action = body.action;

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        {
          message:
            "Aksi tidak valid. Gunakan accept atau reject.",
        },
        { status: 400 }
      );
    }

    client = await pool.connect();

    await client.query("BEGIN");

    // =====================================
    // LOCK TRANSFER REQUEST
    // =====================================

    const requestResult = await client.query(
      `SELECT *
       FROM course_transfer_requests
       WHERE id = $1
       FOR UPDATE`,
      [String(id)]
    );

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { message: "Permintaan transfer tidak ditemukan." },
        { status: 404 }
      );
    }

    const transfer = requestResult.rows[0];

    // Only the recipient can respond.
    if (String(transfer.to_teacher_id) !== String(user.id)) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          message:
            "Kamu tidak memiliki izin untuk merespons permintaan ini.",
        },
        { status: 403 }
      );
    }

    if (transfer.status !== "pending") {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          message:
            "Permintaan transfer ini sudah pernah diproses.",
        },
        { status: 409 }
      );
    }

    // =====================================
    // LOAD TRANSFER ITEMS
    // =====================================

    const itemsResult = await client.query(
      `SELECT
        id,
        course_id,
        course_title
       FROM course_transfer_items
       WHERE request_id = $1
       ORDER BY course_id`,
      [transfer.id]
    );

    if (itemsResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          message:
            "Permintaan transfer tidak memiliki daftar kursus.",
        },
        { status: 409 }
      );
    }

    // =====================================
    // ACCEPT TRANSFER
    // =====================================

    if (action === "accept") {
      if (!transfer.from_teacher_id) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            message:
              "Akun Teacher pengirim sudah tidak tersedia. Transfer tidak dapat diterima.",
          },
          { status: 409 }
        );
      }

      const courseIds = itemsResult.rows.map(
        (item) => item.course_id
      );

      // A deleted course has a NULL course_id.
      if (courseIds.some((courseId) => !courseId)) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            message:
              "Satu atau beberapa kursus dalam pengajuan sudah tidak tersedia. Transfer tidak dapat diterima.",
          },
          { status: 409 }
        );
      }

      // Lock all courses in the request.
      const coursesResult = await client.query(
        `SELECT id, teacher_id
         FROM courses
         WHERE id = ANY($1::bigint[])
         ORDER BY id
         FOR UPDATE`,
        [courseIds]
      );

      if (coursesResult.rows.length !== courseIds.length) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            message:
              "Satu atau beberapa kursus sudah tidak ditemukan. Transfer dibatalkan.",
          },
          { status: 409 }
        );
      }

      // Verify that all courses still belong to the sender.
      const ownershipChanged = coursesResult.rows.some(
        (course) =>
          String(course.teacher_id) !==
          String(transfer.from_teacher_id)
      );

      if (ownershipChanged) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            message:
              "Kepemilikan salah satu kursus sudah berubah. Transfer tidak dapat dilanjutkan.",
          },
          { status: 409 }
        );
      }

      // Transfer all courses in one SQL statement.
      const updateResult = await client.query(
        `UPDATE courses
         SET
           teacher_id = $1,
           updated_at = NOW()
         WHERE id = ANY($2::bigint[])
           AND teacher_id = $3
         RETURNING id`,
        [
          user.id,
          courseIds,
          transfer.from_teacher_id,
        ]
      );

      if (updateResult.rows.length !== courseIds.length) {
        throw new Error(
          "Jumlah kursus yang berhasil dipindahkan tidak sesuai."
        );
      }
    }

    // =====================================
    // UPDATE REQUEST STATUS
    // =====================================

    const newStatus =
      action === "accept" ? "accepted" : "rejected";

    const updatedRequest = await client.query(
      `UPDATE course_transfer_requests
       SET
         status = $1,
         responded_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, transfer.id]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      message:
        action === "accept"
          ? "Permintaan transfer diterima. Semua kursus berhasil dipindahkan."
          : "Permintaan transfer berhasil ditolak.",

      transfer: updatedRequest.rows[0],

      transferredCourses:
        action === "accept"
          ? itemsResult.rows.map((item) => ({
              id: item.course_id,
              title: item.course_title,
            }))
          : [],
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "TRANSFER ROLLBACK ERROR:",
          rollbackError
        );
      }
    }

    console.error("RESPOND TRANSFER ERROR:", error);

    return NextResponse.json(
      {
        message:
          "Gagal memproses permintaan transfer kursus.",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
