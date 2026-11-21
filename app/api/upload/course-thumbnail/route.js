
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// =====================================
// AUTHENTICATION
// =====================================

async function getCurrentUser() {
  const cookieStore = await cookies();

  const candidates = [
    {
      token: cookieStore.get("nadhi_admin_token")?.value,
      expectedRole: "admin",
    },
    {
      token: cookieStore.get("nadhi_teacher_token")?.value,
      expectedRole: "teacher",
    },
  ];

  for (const candidate of candidates) {
    if (!candidate.token) continue;

    try {
      const payload = await verifyToken(candidate.token);

      if (!payload?.id) continue;

      const result = await pool.query(
        `SELECT
          id,
          role,
          teacher_status
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [payload.id]
      );

      if (result.rows.length === 0) continue;

      const user = result.rows[0];

      // Role harus sesuai dengan cookie.
      if (user.role !== candidate.expectedRole) {
        continue;
      }

      // Teacher harus sudah disetujui.
      if (
        user.role === "teacher" &&
        user.teacher_status !== "approved"
      ) {
        continue;
      }

      return user;
    } catch (error) {
      console.error(
        `UPLOAD AUTH ERROR (${candidate.expectedRole}):`,
        error.message
      );
    }
  }

  return null;
}

// =====================================
// POST: UPLOAD COURSE THUMBNAIL
// =====================================

export async function POST(request) {
  try {
    // Verifikasi login Admin atau Teacher.
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          message:
            "Sesi login tidak valid. Silakan login kembali.",
        },
        { status: 401 }
      );
    }

    // Pastikan hanya Admin dan Teacher yang dapat upload.
    if (
      user.role !== "admin" &&
      user.role !== "teacher"
    ) {
      return NextResponse.json(
        {
          message:
            "Kamu tidak memiliki izin mengunggah gambar.",
        },
        { status: 403 }
      );
    }

    // Ambil file dari FormData.
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        {
          message:
            "Silakan pilih gambar terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    // Validasi format gambar.
    const allowedTypes = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };

    if (!allowedTypes[file.type]) {
      return NextResponse.json(
        {
          message:
            "Format gambar harus JPG, PNG, atau WEBP.",
        },
        { status: 400 }
      );
    }

    // Validasi ukuran gambar maksimal 5 MB.
    if (
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          message:
            "Ukuran gambar maksimal 5 MB.",
        },
        { status: 400 }
      );
    }

    // =====================================
    // SIMPAN GAMBAR
    // =====================================

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "courses"
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const fileName = `${randomUUID()}${allowedTypes[file.type]}`;

    const filePath = path.join(
      uploadDirectory,
      fileName
    );

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    await writeFile(filePath, buffer);

    // =====================================
    // RESPONSE
    // =====================================

    return NextResponse.json(
      {
        message: "Gambar berhasil diunggah.",
        url: `/uploads/courses/${fileName}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "UPLOAD COURSE THUMBNAIL ERROR:",
      error
    );

    return NextResponse.json(
      {
        message: "Gagal mengunggah gambar.",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
