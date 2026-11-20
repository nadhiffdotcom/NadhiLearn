
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth-server";

export async function PUT(request) {
  try {
    // 1. Periksa token dari tab yang sedang aktif
    const auth = await getAuthenticatedUser(request);

    if (!auth.user) {
      return NextResponse.json(
        {
          success: false,
          message: auth.error,
        },
        { status: auth.status }
      );
    }

    const userId = auth.user.id;

    // 2. Ambil data dari form
    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const displayName =
      typeof body.display_name === "string"
        ? body.display_name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword ?? "";

    // 3. Validasi input
    if (
      !username ||
      !displayName ||
      !email ||
      typeof currentPassword !== "string" ||
      !currentPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Semua data wajib diisi, termasuk password saat ini.",
        },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Username harus terdiri dari 3–50 karakter.",
        },
        { status: 400 }
      );
    }

    if (displayName.length < 1 || displayName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Name wajib diisi dan maksimal 100 karakter.",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format email tidak valid.",
        },
        { status: 400 }
      );
    }

    if (
      typeof newPassword !== "string" ||
      (newPassword !== "" && newPassword.length < 8)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Password baru minimal 8 karakter.",
        },
        { status: 400 }
      );
    }

    // 4. Ambil pengguna berdasarkan token tab aktif
    const userResult = await pool.query(
      `SELECT id, username, display_name, email, password, role
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Data pengguna tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 5. Verifikasi password saat ini
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Password saat ini salah.",
        },
        { status: 401 }
      );
    }

    // 6. Periksa username dan email duplikat
    const existingUser = await pool.query(
      `SELECT id
       FROM users
       WHERE (
         LOWER(email) = $1
         OR LOWER(username) = LOWER($2)
       )
       AND id <> $3
       LIMIT 1`,
      [email, username, user.id]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Username atau email sudah digunakan akun lain.",
        },
        { status: 409 }
      );
    }

    // 7. Hash password baru jika ingin menggantinya
    let hashedPassword = user.password;

    if (newPassword) {
      hashedPassword = await bcrypt.hash(newPassword, 12);
    }

    // 8. Update data pengguna
    const updateResult = await pool.query(
      `UPDATE users
       SET
         username = $1,
         display_name = $2,
         email = $3,
         password = $4,
         updated_at = NOW()
       WHERE id = $5
       RETURNING id, username, display_name, email, role`,
      [
        username,
        displayName,
        email,
        hashedPassword,
        user.id,
      ]
    );

    const updatedUser = updateResult.rows[0];

    // 9. Kirim hasil tanpa mengubah token tab lain
    return NextResponse.json({
      success: true,
      message: "Pengaturan akun berhasil diperbarui.",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        display_name: updatedUser.display_name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          message: "Username atau email sudah digunakan.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE ACCOUNT
// ==========================================

export async function DELETE(request) {
  let client;
  let transactionStarted = false;

  try {
    // 1. Periksa autentikasi pengguna
    const auth = await getAuthenticatedUser(request);

    if (!auth.user) {
      return NextResponse.json(
        {
          success: false,
          message: auth.error,
        },
        { status: auth.status }
      );
    }

    const userId = auth.user.id;

    // 2. Hanya Student dan Teacher yang boleh menghapus akun sendiri
    if (!["student", "teacher"].includes(auth.user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin tidak dapat menghapus akun melalui fitur ini.",
        },
        { status: 403 }
      );
    }

    // 3. Ambil password konfirmasi
    const body = await request.json();
    const currentPassword = body.currentPassword;

    if (
      typeof currentPassword !== "string" ||
      !currentPassword.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Masukkan password untuk mengonfirmasi penghapusan akun.",
        },
        { status: 400 }
      );
    }

    // 4. Mulai transaksi database
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // 5. Ambil dan kunci akun yang akan dihapus
    const userResult = await client.query(
      `SELECT id, password, role
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: "Akun tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // 6. Pastikan role masih sesuai
    if (!["student", "teacher"].includes(user.role)) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: "Role akun tidak diizinkan menghapus akun.",
        },
        { status: 403 }
      );
    }

    // 7. Verifikasi password
    const passwordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!passwordMatch) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return NextResponse.json(
        {
          success: false,
          message: "Password yang kamu masukkan salah.",
        },
        { status: 401 }
      );
    }

    // 8. Jika Teacher, periksa kepemilikan kursus
    if (user.role === "teacher") {
      const courseResult = await client.query(
        `SELECT id
         FROM courses
         WHERE teacher_id = $1
         LIMIT 1`,
        [user.id]
      );

      if (courseResult.rows.length > 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return NextResponse.json(
          {
            success: false,
            message:
              "Akun belum dapat dihapus karena kamu masih memiliki kursus. Pindahkan atau hapus seluruh kursus milikmu terlebih dahulu.",
          },
          { status: 409 }
        );
      }
    }

    // 9. Hapus akun
    // Data yang memiliki ON DELETE CASCADE akan ikut ditangani
    // oleh PostgreSQL sesuai relasi database.
    await client.query(
      `DELETE FROM users
       WHERE id = $1`,
      [user.id]
    );

    // 10. Simpan transaksi
    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "Akun berhasil dihapus.",
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback delete account error:", rollbackError);
      }
    }

    console.error("Delete account error:", error);

    // Foreign key masih memiliki relasi yang membatasi penghapusan
    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Akun belum dapat dihapus karena masih memiliki data yang terkait. Silakan hubungi Admin.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menghapus akun.",
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
