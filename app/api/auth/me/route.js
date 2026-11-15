
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_token")?.value;

  if (!token) {
    return NextResponse.json({
      success: true,
      user: null,
    });
  }

  const user = await verifyToken(token);

  if (!user) {
    return NextResponse.json({
      success: true,
      user: null,
    });
  }

  return NextResponse.json({
    success: true,
    user,
  });
}
