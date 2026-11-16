"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "../student/dashboard/LogoutButton";

const menuItems = [
  {
    label: "Dashboard",
    href: "/teacher/dashboard",
    icon: "▦",
  },
  {
    label: "My Courses",
    href: "/teacher/courses",
    icon: "▤",
  },
  {
    label: "Content Management",
    href: "/teacher/contents",
    icon: "▣",
  },
  {
    label: "Settings",
    href: "/account/profile",
    icon: "⚙",
  },
];

export default function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-white text-[#0B1F3A]">
      {/* LOGO */}
      <div className="flex h-20 items-center gap-3 border-b border-gray-200 px-5">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/logo-n-navy.png"
            alt="NadhiLearn Logo"
            className="h-10 w-10 object-contain"
          />

          <span className="text-2xl font-bold tracking-tight">
            NadhiLearn.
          </span>
        </Link>
      </div>

      {/* MENU TITLE */}
      <div className="px-5 pb-3 pt-7">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Teacher Menu
        </p>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/teacher/dashboard" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
                active
                  ? "bg-[#0B1F3A] font-semibold text-white"
                  : "text-[#0B1F3A] hover:bg-gray-100"
              }`}
            >
              <span className="w-5 text-center text-lg">
                {item.icon}
              </span>

              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <div className="border-t border-gray-200 p-4">
        <div className="mb-3 rounded-lg bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500">
            Login sebagai
          </p>

          <p className="font-semibold">
            Teacher
          </p>
        </div>

        <div className="flex items-center gap-3 px-2">
          <span className="text-sm font-semibold">
            Logout
          </span>

          <div className="ml-auto">
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
