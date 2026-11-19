
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

  const approvedAt = result.user.approved_at
    ? new Date(result.user.approved_at).getTime()
    : null;
  const now = Date.now();
  const showTeacherWelcome =
    result.user.role === "teacher" &&
    Number.isFinite(approvedAt) &&
    approvedAt <= now &&
    now - approvedAt < 24 * 60 * 60 * 1000;

  return NextResponse.json({
    success: true,
    user: {
      id: result.user.id,
      username: result.user.username,
      display_name: result.user.display_name,
      email: result.user.email,
      role: result.user.role,
      teacherStatus: result.user.teacher_status,
      approvedAt: result.user.approved_at,
      showTeacherWelcome,
    },
  });
}
