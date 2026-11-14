import { NextResponse } from "next/server";
import pool from "../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await pool.query("SELECT 1");

    return NextResponse.json({
      success: true,
      message: "Database connected",
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}
