
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";

export async function GET(request) {
  const result = await getAuthenticatedUser(request);

  if (!result.user) {
    return NextResponse.json(
      {
        success: false,
        message: result.error,
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      role: result.user.role,
      teacherStatus: result.user.teacher_status,
    },
  });
}
