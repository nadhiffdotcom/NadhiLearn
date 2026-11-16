
import TeacherSidebar from "./TeacherSidebar";

export default function TeacherLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <TeacherSidebar />

      <main className="min-w-0 flex-1 border-l border-gray-200">
        {children}
      </main>
    </div>
  );
}
