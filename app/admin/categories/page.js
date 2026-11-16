
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import CategoryManager from "./CategoryManager";

export default async function CategoriesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_token")?.value;

  if (!token) {
    redirect("/login");
  }

  let decoded;

  try {
    decoded = await verifyToken(token);
  } catch {
    redirect("/login");
  }

  if (decoded.role !== "admin") {
    redirect("/");
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
