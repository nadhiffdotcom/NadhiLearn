
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "../student/dashboard/LogoutButton";

const menuItems = [
  { label: "Dashboard", href: "/teacher/dashboard", icon: "▦" },
  { label: "My Courses", href: "/teacher/courses", icon: "▤" },
  { label: "Content Management", href: "/teacher/contents", icon: "▣" },
  { label: "Settings", href: "/account/profile", icon: "⚙" },
];

export default function TeacherSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const renderMenu = () =>
    menuItems.map((item) => {
      const active =
        pathname === item.href ||
        (item.href !== "/teacher/dashboard" &&
          pathname.startsWith(item.href));

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
            active
              ? "bg-[#0B1F3A] font-semibold text-white"
              : "text-[#0B1F3A] hover:bg-gray-100"
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
          className="flex items-center gap-2"
        >
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

      <div className="px-5 pb-3 pt-7">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Teacher Menu
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {renderMenu()}
      </nav>

      <div className="shrink-0 border-t border-gray-200 p-4">
  <div className="mb-3 rounded-lg bg-gray-50 px-4 py-3">
    <p className="text-xs text-gray-500">Login sebagai</p>
    <p className="font-semibold">Teacher</p>
  </div>

  <div className="flex justify-start">
    <LogoutButton />
  </div>
</div>
    </>
  );

  return (
    <>
      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/logo-n-navy.png"
            alt="NadhiLearn Logo"
            className="h-9 w-9 object-contain"
          />
          <span className="text-xl font-bold text-[#0B1F3A]">
            NadhiLearn.
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isOpen}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-[#0B1F3A] hover:bg-gray-100"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-white text-[#0B1F3A] md:sticky md:top-0 md:flex md:h-screen">
        {sidebarContent}
      </aside>

      {/* MOBILE OVERLAY */}
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
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-gray-100"
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
