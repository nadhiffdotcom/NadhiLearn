
import { NextResponse } from "next/server";
import pool from "@/lib/db";

// GET: Mengambil testimoni yang sudah dipublikasikan
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT
         id,
         student_name AS name,
         course_title AS course,
         content AS message,
         rating,
         image_url,
         created_at
       FROM testimonials
       WHERE is_published = TRUE
       ORDER BY created_at DESC, id DESC
       LIMIT 10`
    );

    return NextResponse.json({
      success: true,
      testimonials: result.rows,
    });
  } catch (error) {
    console.error("GET HOME TESTIMONIALS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data testimoni.",
      },
      { status: 500 }
    );
  }
}
