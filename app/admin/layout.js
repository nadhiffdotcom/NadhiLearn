
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7fc] md:flex-row">
      <AdminSidebar />

      <main className="w-full min-w-0 flex-1 border-[#dce3ef] md:border-l">
        {children}
      </main>
    </div>
  );
}
