
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./dashboard/LogoutButton";

const menuItems = [
  { label: "Dashboard", href: "/student/dashboard", icon: "▦" },
  { label: "My Courses", href: "/student/my-courses", icon: "▣" },
  { label: "Browse Courses", href: "/student/courses", icon: "⌕" },
  {
    label: "Learning Progress",
    href: "/student/learning-progress",
    icon: "◷",
  },
  { label: "Settings", href: "/account/profile", icon: "⚙" },
];

export default function StudentSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isMenuActive = (item) => {
    if (item.href === "/student/dashboard") {
      return pathname === item.href;
    }

    if (item.href === "/student/courses") {
      return pathname === "/student/courses" || pathname.startsWith("/student/courses/");
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const renderMenu = () =>
    menuItems.map((item) => {
      const isActive = isMenuActive(item);

      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-all duration-200 ${
            isActive
              ? "bg-[#0B1F3A] font-semibold text-white"
              : "font-medium text-[#0B1F3A] hover:bg-gray-100"
          }`}
        >
          <span className="w-5 text-center text-lg">{item.icon}</span>
          {item.label}
        </Link>
      );
    });

  const sidebarContent = (
    <>
      <div className="flex h-20 shrink-0 items-center border-b border-gray-200 px-5">
        <Link
          href="/"
          onClick={() => setIsOpen(false)}
          className="flex min-w-0 items-center gap-2"
        >
          <img
            src="/logo-n-navy.png"
            alt="NadhiLearn Logo"
            className="h-10 w-10 shrink-0 object-contain"
          />
          <span className="truncate text-2xl font-bold tracking-tight text-[#0B1F3A]">
            NadhiLearn.
          </span>
        </Link>
      </div>

      <div className="px-5 pb-3 pt-7">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Student Menu
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {renderMenu()}
      </nav>

      <div className="shrink-0 border-t border-gray-200 p-4">
        <div className="mb-3 rounded-lg bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500">Login sebagai</p>
          <p className="font-semibold text-[#0B1F3A]">Student</p>
        </div>

        <div className="flex justify-start">
          <LogoutButton />
        </div>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <img
            src="/logo-n-navy.png"
            alt="NadhiLearn Logo"
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="truncate text-xl font-bold text-[#0B1F3A]">
            NadhiLearn.
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isOpen}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xl text-[#0B1F3A]"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </header>

      <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-white text-[#0B1F3A] md:sticky md:top-0 md:flex md:h-screen">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/40"
          />

          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white text-[#0B1F3A] shadow-xl">
            <div className="absolute right-3 top-5 z-10">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup menu"
                className="rounded-lg px-3 py-2 text-xl text-[#0B1F3A]"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
