
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// Memeriksa hak akses Admin
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_admin_token")?.value;

  if (!token) return null;

  try {
    const decoded = await verifyToken(token);

    if (!decoded?.id || decoded.role !== "admin") {
      return null;
    }

    const currentUser = await pool.query(
      `SELECT id, role FROM users WHERE id = $1 LIMIT 1`,
      [decoded.id]
    );

    if (currentUser.rows[0]?.role !== "admin") {
      return null;
    }

    return { ...decoded, ...currentUser.rows[0] };
  } catch {
    return null;
  }
}

// GET: Menampilkan daftar pengguna
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

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10)
    );

    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    const allowedRoles = ["admin", "teacher", "student"];

    if (role && !allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Filter role tidak valid." },
        { status: 400 }
      );
    }

    const limit = 10;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE (
         $1 = ''
         OR username ILIKE '%' || $1 || '%'
         OR display_name ILIKE '%' || $1 || '%'
         OR email ILIKE '%' || $1 || '%'
       )
       AND ($2 = '' OR role = $2)`,
      [search, role]
    );

    const total = Number(countResult.rows[0].total);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const result = await pool.query(
      `SELECT
         id,
         username,
         display_name,
         email,
         role,
         teacher_status,
         teacher_background,
         approved_at,
         created_at
       FROM users
       WHERE (
         $1 = ''
         OR username ILIKE '%' || $1 || '%'
         OR display_name ILIKE '%' || $1 || '%'
         OR email ILIKE '%' || $1 || '%'
       )
       AND ($2 = '' OR role = $2)
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [search, role, limit, offset]
    );

    return NextResponse.json({
      success: true,
      currentAdminId: admin.id,
      users: result.rows,
      pagination: {
        currentPage,
        totalPages,
        total,
        limit,
      },
    });
  } catch (error) {
    console.error("GET USER MANAGEMENT ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data pengguna." },
      { status: 500 }
    );
  }
}

// POST: Membuat pengguna baru
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

    const username = body.username?.trim();

    const displayName =
      body.display_name?.trim() ||
      body.displayName?.trim() ||
      username;

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const role = body.role;

    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Semua field wajib diisi." },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { success: false, message: "Username harus 3–50 karakter." },
        { status: 400 }
      );
    }

    if (!displayName || displayName.length > 100) {
      return NextResponse.json(
        { success: false, message: "Nama lengkap maksimal 100 karakter." },
        { status: 400 }
      );
    }

    if (!["admin", "teacher", "student"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Role tidak valid." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const teacherStatus = role === "teacher" ? "approved" : null;
    const approvedAt = role === "teacher";

    const result = await pool.query(
      `INSERT INTO users (
        username,
        display_name,
        email,
        password,
        role,
        teacher_status,
        approved_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        CASE WHEN $7 THEN NOW() ELSE NULL END
      )
      RETURNING
        id,
        username,
        display_name,
        email,
        role,
        teacher_status,
        approved_at,
        created_at`,
      [
        username,
        displayName,
        email,
        hashedPassword,
        role,
        teacherStatus,
        approvedAt,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Pengguna berhasil ditambahkan.",
        user: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST USER MANAGEMENT ERROR:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, message: "Username atau email sudah digunakan." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal menambahkan pengguna." },
      { status: 500 }
    );
  }
}

// PUT: Mengubah data pengguna
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
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role;
    const password = body.password;

    const displayNameInput =
      typeof body.display_name === "string"
        ? body.display_name.trim()
        : typeof body.displayName === "string"
          ? body.displayName.trim()
          : null;

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !username ||
      !email ||
      !role
    ) {
      return NextResponse.json(
        { success: false, message: "Data pengguna tidak lengkap." },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { success: false, message: "Username harus 3–50 karakter." },
        { status: 400 }
      );
    }

    if (displayNameInput !== null && displayNameInput.length > 100) {
      return NextResponse.json(
        { success: false, message: "Nama lengkap maksimal 100 karakter." },
        { status: 400 }
      );
    }

    if (!["admin", "teacher", "student"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Role tidak valid." },
        { status: 400 }
      );
    }

    let result;

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 12);

      result = await pool.query(
        `UPDATE users
         SET
           username = $1,
           display_name = COALESCE(
             NULLIF($2, ''),
             display_name,
             $1
           ),
           email = $3,
           password = $4,
           role = $5,
           teacher_status = CASE
             WHEN $5 = 'teacher' THEN 'approved'
             ELSE teacher_status
           END,
           approved_at = CASE
             WHEN $5 = 'teacher' THEN COALESCE(approved_at, NOW())
             ELSE approved_at
           END,
           updated_at = NOW()
         WHERE id = $6
         RETURNING
           id,
           username,
           display_name,
           email,
           role,
           teacher_status,
           approved_at,
           created_at`,
        [
          username,
          displayNameInput,
          email,
          hashedPassword,
          role,
          id,
        ]
      );
    } else {
      result = await pool.query(
        `UPDATE users
         SET
           username = $1,
           display_name = COALESCE(
             NULLIF($2, ''),
             display_name,
             $1
           ),
           email = $3,
           role = $4,
           teacher_status = CASE
             WHEN $4 = 'teacher' THEN 'approved'
             ELSE teacher_status
           END,
           approved_at = CASE
             WHEN $4 = 'teacher' THEN COALESCE(approved_at, NOW())
             ELSE approved_at
           END,
           updated_at = NOW()
         WHERE id = $5
         RETURNING
           id,
           username,
           display_name,
           email,
           role,
           teacher_status,
           approved_at,
           created_at`,
        [
          username,
          displayNameInput,
          email,
          role,
          id,
        ]
      );
    }

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data pengguna berhasil diperbarui.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("PUT USER MANAGEMENT ERROR:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, message: "Username atau email sudah digunakan." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal memperbarui pengguna." },
      { status: 500 }
    );
  }
}

// PATCH: Reset password Student dan Teacher oleh Admin
export async function PATCH(request) {
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
    const password = body.password;

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "ID pengguna tidak valid." },
        { status: 400 }
      );
    }

    // Admin tidak boleh mereset password akunnya sendiri
    if (Number(admin.id) === id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin tidak dapat mereset password akunnya sendiri melalui fitur ini.",
        },
        { status: 400 }
      );
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Password baru minimal 8 karakter.",
        },
        { status: 400 }
      );
    }

    const userResult = await pool.query(
      `SELECT id, username, display_name, role
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (userResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const targetUser = userResult.rows[0];
    const targetName = targetUser.display_name || targetUser.username;

    // Hanya Student dan Teacher yang dapat direset
    if (!["teacher", "student"].includes(targetUser.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reset password hanya berlaku untuk akun Student dan Teacher.",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const updateResult = await pool.query(
      `UPDATE users
       SET password = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, id]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password akun ${targetUser.role} "${targetName}" berhasil direset.`,
    });
  } catch (error) {
    console.error("RESET USER PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mereset password pengguna.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus pengguna
export async function DELETE(request) {
  let client;

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
        { success: false, message: "ID pengguna tidak valid." },
        { status: 400 }
      );
    }

    // Admin tidak boleh menghapus akunnya sendiri
    if (Number(admin.id) === id) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin tidak dapat menghapus akunnya sendiri.",
        },
        { status: 400 }
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT id, username, display_name, role
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const targetUser = userResult.rows[0];
    const targetName = targetUser.display_name || targetUser.username;

    // Teacher tidak boleh dihapus jika masih memiliki kursus
    if (targetUser.role === "teacher") {
      const courseResult = await client.query(
        `SELECT COUNT(*) AS total
         FROM courses
         WHERE teacher_id = $1`,
        [id]
      );

      const totalCourses = Number(courseResult.rows[0].total);

      if (totalCourses > 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message: `Akun Teacher "${targetName}" tidak dapat dihapus karena masih memiliki ${totalCourses} kursus. Pindahkan atau hapus seluruh kursus miliknya terlebih dahulu.`,
          },
          { status: 409 }
        );
      }
    }

    // Admin terakhir tidak boleh dihapus
    if (targetUser.role === "admin") {
      await client.query(
        "SELECT pg_advisory_xact_lock($1)",
        [987654321]
      );

      const adminCountResult = await client.query(
        `SELECT COUNT(*) AS total
         FROM users
         WHERE role = 'admin'`
      );

      const totalAdmins = Number(adminCountResult.rows[0].total);

      if (totalAdmins <= 1) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            message:
              "Admin terakhir tidak dapat dihapus. NadhiLearn harus memiliki minimal satu Admin.",
          },
          { status: 409 }
        );
      }
    }

    await client.query(
      "DELETE FROM users WHERE id = $1",
      [id]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: `Pengguna "${targetName}" berhasil dihapus.`,
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("DELETE USER MANAGEMENT ERROR:", error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Pengguna tidak dapat dihapus karena masih memiliki data terkait.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menghapus pengguna.",
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
