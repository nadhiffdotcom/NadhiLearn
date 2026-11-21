
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";

import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "testimonials"
);

// ========================================
// HELPER: CHECK ADMIN
// ========================================
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_admin_token")?.value;

  if (!token) return null;

  try {
    const decoded = await verifyToken(token);

    if (!decoded?.id || decoded.role !== "admin") return null;

    const currentUser = await pool.query(
      `SELECT id, role FROM users WHERE id = $1 LIMIT 1`,
      [decoded.id]
    );

    if (currentUser.rows[0]?.role !== "admin") return null;

    return { ...decoded, ...currentUser.rows[0] };
  } catch {
    return null;
  }
}

// ========================================
// HELPER: VALIDASI FILE
// ========================================
function getImageExtension(buffer) {
  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpg";
  }

  // PNG
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return "png";
  }

  // WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

// ========================================
// HELPER: UPLOAD FOTO
// ========================================
async function uploadImage(file) {
  if (!file || file.size === 0) {
    return null;
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = getImageExtension(buffer);

  if (!extension) {
    throw new Error("Format foto harus JPG, PNG, atau WEBP.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await writeFile(filepath, buffer, { flag: "wx" });

  return {
    filename,
    url: `/uploads/testimonials/${filename}`,
  };
}

// ========================================
// HELPER: HAPUS FOTO LAMA
// ========================================
async function deleteImage(imageUrl) {
  if (
    typeof imageUrl !== "string" ||
    !imageUrl.startsWith("/uploads/testimonials/")
  ) {
    return;
  }

  const filename = path.basename(imageUrl);
  const filepath = path.join(UPLOAD_DIR, filename);

  try {
    await unlink(filepath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("DELETE TESTIMONIAL IMAGE ERROR:", error);
    }
  }
}

// ========================================
// HELPER: BACA FORM DATA
// ========================================
async function getFormData(request) {
  const formData = await request.formData();

  return {
    id: Number(formData.get("id")),
    studentName: String(formData.get("student_name") || "").trim(),
    courseTitle: String(formData.get("course_title") || "").trim(),
    content: String(formData.get("content") || "").trim(),
    rating: Number(formData.get("rating") || 5),
    isPublished: formData.get("is_published") === "true",
    image: formData.get("image"),
    removeImage: formData.get("remove_image") === "true",
  };
}

// ========================================
// HELPER: VALIDASI DATA
// ========================================
function validateTestimonial(data, isEdit = false) {
  if (
    (isEdit && (!Number.isSafeInteger(data.id) || data.id <= 0)) ||
    !data.studentName ||
    !data.courseTitle ||
    !data.content
  ) {
    return "Data testimoni tidak lengkap.";
  }

  if (
    data.studentName.length > 100 ||
    data.courseTitle.length > 200
  ) {
    return "Nama atau judul kursus terlalu panjang.";
  }

  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
    return "Rating harus antara 1 sampai 5.";
  }

  return null;
}

// ========================================
// GET: DAFTAR TESTIMONI
// ========================================
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

    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "";

    if (status && !["published", "draft"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Filter status tidak valid." },
        { status: 400 }
      );
    }

    const limit = 10;

    const publishedFilter =
      status === "published"
        ? true
        : status === "draft"
          ? false
          : null;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM testimonials
       WHERE (
         $1 = ''
         OR student_name ILIKE '%' || $1 || '%'
         OR course_title ILIKE '%' || $1 || '%'
         OR content ILIKE '%' || $1 || '%'
       )
       AND ($2::boolean IS NULL OR is_published = $2)`,
      [search, publishedFilter]
    );

    const total = Number(countResult.rows[0].total);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * limit;

    const result = await pool.query(
      `SELECT
         id,
         student_name,
         course_title,
         content,
         rating,
         is_published,
         image_url,
         created_at,
         updated_at
       FROM testimonials
       WHERE (
         $1 = ''
         OR student_name ILIKE '%' || $1 || '%'
         OR course_title ILIKE '%' || $1 || '%'
         OR content ILIKE '%' || $1 || '%'
       )
       AND ($2::boolean IS NULL OR is_published = $2)
       ORDER BY created_at DESC, id DESC
       LIMIT $3 OFFSET $4`,
      [search, publishedFilter, limit, offset]
    );

    return NextResponse.json({
      success: true,
      testimonials: result.rows,
      pagination: {
        currentPage,
        totalPages,
        total,
        limit,
      },
    });
  } catch (error) {
    console.error("GET TESTIMONIALS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data testimoni." },
      { status: 500 }
    );
  }
}

// ========================================
// POST: TAMBAH TESTIMONI
// ========================================
export async function POST(request) {
  let uploadedImage = null;

  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const data = await getFormData(request);
    const validationError = validateTestimonial(data);

    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    if (data.image instanceof File && data.image.size > 0) {
      uploadedImage = await uploadImage(data.image);
    }

    const result = await pool.query(
      `INSERT INTO testimonials (
         student_name,
         course_title,
         content,
         rating,
         is_published,
         image_url
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.studentName,
        data.courseTitle,
        data.content,
        data.rating,
        data.isPublished,
        uploadedImage?.url || null,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Testimoni berhasil ditambahkan.",
        testimonial: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (uploadedImage) {
      await deleteImage(uploadedImage.url);
    }

    console.error("POST TESTIMONIAL ERROR:", error);

    const isValidationError =
      error.message?.includes("Ukuran foto") ||
      error.message?.includes("Format foto");

    return NextResponse.json(
      {
        success: false,
        message: isValidationError
          ? error.message
          : "Gagal menambahkan testimoni.",
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

// ========================================
// PUT: EDIT TESTIMONI
// ========================================
export async function PUT(request) {
  let uploadedImage = null;

  try {
    const admin = await checkAdmin();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const data = await getFormData(request);
    const validationError = validateTestimonial(data, true);

    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    const existingResult = await pool.query(
      `SELECT image_url
       FROM testimonials
       WHERE id = $1
       LIMIT 1`,
      [data.id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Testimoni tidak ditemukan." },
        { status: 404 }
      );
    }

    const oldImage = existingResult.rows[0].image_url;
    let imageUrl = oldImage;

    if (data.image instanceof File && data.image.size > 0) {
      uploadedImage = await uploadImage(data.image);
      imageUrl = uploadedImage.url;
    } else if (data.removeImage) {
      imageUrl = null;
    }

    const result = await pool.query(
      `UPDATE testimonials
       SET
         student_name = $1,
         course_title = $2,
         content = $3,
         rating = $4,
         is_published = $5,
         image_url = $6,
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        data.studentName,
        data.courseTitle,
        data.content,
        data.rating,
        data.isPublished,
        imageUrl,
        data.id,
      ]
    );

    if (uploadedImage && oldImage) {
      await deleteImage(oldImage);
    } else if (data.removeImage && oldImage) {
      await deleteImage(oldImage);
    }

    return NextResponse.json({
      success: true,
      message: "Testimoni berhasil diperbarui.",
      testimonial: result.rows[0],
    });
  } catch (error) {
    if (uploadedImage) {
      await deleteImage(uploadedImage.url);
    }

    console.error("PUT TESTIMONIAL ERROR:", error);

    const isValidationError =
      error.message?.includes("Ukuran foto") ||
      error.message?.includes("Format foto");

    return NextResponse.json(
      {
        success: false,
        message: isValidationError
          ? error.message
          : "Gagal memperbarui testimoni.",
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

// ========================================
// DELETE: HAPUS TESTIMONI
// ========================================
export async function DELETE(request) {
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

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "ID testimoni tidak valid." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM testimonials
       WHERE id = $1
       RETURNING id, image_url`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Testimoni tidak ditemukan." },
        { status: 404 }
      );
    }

    await deleteImage(result.rows[0].image_url);

    return NextResponse.json({
      success: true,
      message: "Testimoni berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE TESTIMONIAL ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Gagal menghapus testimoni." },
      { status: 500 }
    );
  }
}
