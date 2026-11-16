
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    // Verifikasi login
    const cookieStore = await cookies();
    const token = cookieStore.get("nadhi_token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { message: "Sesi login tidak valid." },
        { status: 401 }
      );
    }

    const userResult = await pool.query(
      `SELECT role, teacher_status
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [payload.id]
    );

    const user = userResult.rows[0];

    if (
      !user ||
      (user.role !== "admin" &&
        !(user.role === "teacher" && user.teacher_status === "approved"))
    ) {
      return NextResponse.json(
        { message: "Kamu tidak memiliki izin mengunggah gambar." },
        { status: 403 }
      );
    }

    // Ambil file
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { message: "Silakan pilih gambar terlebih dahulu." },
        { status: 400 }
      );
    }

    const allowedTypes = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };

    if (!allowedTypes[file.type]) {
      return NextResponse.json(
        { message: "Format gambar harus JPG, PNG, atau WEBP." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "Ukuran gambar maksimal 5 MB." },
        { status: 400 }
      );
    }

    // Simpan gambar
    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "courses"
    );

    await mkdir(uploadDirectory, { recursive: true });

    const fileName = `${randomUUID()}${allowedTypes[file.type]}`;
    const filePath = path.join(uploadDirectory, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, buffer);

    return NextResponse.json({
      message: "Gambar berhasil diunggah.",
      url: `/uploads/courses/${fileName}`,
    });
  } catch (error) {
    console.error("UPLOAD COURSE THUMBNAIL ERROR:", error);

    return NextResponse.json(
      { message: "Gagal mengunggah gambar." },
      { status: 500 }
    );
  }
}
