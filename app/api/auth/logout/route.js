
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logout berhasil.",
  });

  const cookieNames = [
    "nadhi_admin_token",
    "nadhi_teacher_token",
    "nadhi_student_token",
    "nadhi_token",
  ];

  cookieNames.forEach((cookieName) => {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  });

  return response;
}
