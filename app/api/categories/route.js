
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// Memastikan hanya Admin yang dapat mengelola kategori
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_token")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = await verifyToken(token);

    if (decoded.role !== "admin") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

// GET: Mengambil semua kategori
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, name, description, created_at
       FROM categories
       ORDER BY id ASC`
    );

    return NextResponse.json({
      success: true,
      categories: result.rows,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data kategori." },
      { status: 500 }
    );
  }
}

// POST: Menambahkan kategori baru
export async function POST(request) {
  const admin = await checkAdmin();

  if (!admin) {
    return NextResponse.json(
      { success: false, message: "Akses hanya untuk Admin." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at`,
      [name.trim(), typeof description === "string" ? description.trim() || null : null]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Kategori berhasil ditambahkan.",
        category: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST CATEGORIES ERROR:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, message: "Nama kategori sudah digunakan." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal menambahkan kategori." },
      { status: 500 }
    );
  }
}

// PUT: Mengedit kategori
export async function PUT(request) {
  const admin = await checkAdmin();

  if (!admin) {
    return NextResponse.json(
      { success: false, message: "Akses hanya untuk Admin." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { id, name, description } = body;

    const categoryId = Number(id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json(
        { success: false, message: "ID kategori tidak valid." },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE categories
       SET name = $1, description = $2
       WHERE id = $3
       RETURNING id, name, description, created_at`,
      [
        name.trim(),
        typeof description === "string" ? description.trim() || null : null,
        categoryId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Kategori berhasil diperbarui.",
      category: result.rows[0],
    });
  } catch (error) {
    console.error("PUT CATEGORIES ERROR:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, message: "Nama kategori sudah digunakan." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal memperbarui kategori." },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus kategori
export async function DELETE(request) {
  const admin = await checkAdmin();

  if (!admin) {
    return NextResponse.json(
      { success: false, message: "Akses hanya untuk Admin." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const categoryId = Number(body.id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json(
        { success: false, message: "ID kategori tidak valid." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM categories
       WHERE id = $1
       RETURNING id, name`,
      [categoryId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Kategori berhasil dihapus.",
      category: result.rows[0],
    });
  } catch (error) {
    console.error("DELETE CATEGORIES ERROR:", error);

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          message: "Kategori tidak dapat dihapus karena masih digunakan.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Gagal menghapus kategori." },
      { status: 500 }
    );
  }
}
