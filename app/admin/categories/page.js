
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import CategoryManager from "./CategoryManager";

export default async function CategoriesPage() {
  const cookieStore = await cookies();

  // Gunakan cookie khusus Admin
  const token = cookieStore.get("nadhi_admin_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const decoded = await verifyToken(token);

  if (!decoded?.id || decoded.role !== "admin") {
    redirect("/login");
  }

  // Pastikan akun masih terdaftar dan berstatus Admin
  const userResult = await pool.query(
    `SELECT id, role
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [decoded.id]
  );

  if (
    userResult.rows.length === 0 ||
    userResult.rows[0].role !== "admin"
  ) {
    redirect("/login");
  }

  const result = await pool.query(
    `SELECT id, name, description, created_at
     FROM categories
     ORDER BY id ASC`
  );

  const categories = result.rows.map((category) => ({
    ...category,
    id: Number(category.id),
    created_at: category.created_at?.toISOString() || null,
  }));

  return <CategoryManager initialCategories={categories} />;
}
