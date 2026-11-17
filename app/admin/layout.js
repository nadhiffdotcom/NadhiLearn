
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      <AdminSidebar />

      <main className="w-full min-w-0 flex-1 border-gray-200 md:border-l">
        {children}
      </main>
    </div>
  );
}
