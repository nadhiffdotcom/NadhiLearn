
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import HomeClient from "./HomeClient";

export default async function Home() {
  let initialUser = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nadhi_token")?.value;

    if (token) {
      const decoded = await verifyToken(token);

      if (decoded?.id) {
        const result = await pool.query(
          `SELECT id, username, email, role
           FROM users
           WHERE id = $1
           LIMIT 1`,
          [decoded.id]
        );

        if (result.rows.length > 0) {
          initialUser = result.rows[0];
        }
      }
    }
  } catch (error) {
    console.error("Gagal mengambil data pengguna:", error);
  }

  return <HomeClient initialUser={initialUser} />;
}
