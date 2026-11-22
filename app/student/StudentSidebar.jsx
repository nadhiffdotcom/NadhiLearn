
"use client";

import { useEffect, useState } from "react";
import { warmProfileCache } from "@/lib/auth-client";
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

  // Siapkan data Settings di latar belakang agar langsung terbuka saat diklik.
  useEffect(() => {
    warmProfileCache();
  }, []);

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
              ? "bg-[#0a1f4a] font-semibold text-white"
              : "font-medium text-[#101b36] hover:bg-[#e7edf7]"
          }`}
        >
          <span className="w-5 text-center text-lg">{item.icon}</span>
          {item.label}
        </Link>
      );
    });

  const sidebarContent = (
    <>
      <div className="flex h-20 shrink-0 items-center border-b border-[#dce3ef] px-5">
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
          <span className="truncate text-2xl font-bold tracking-tight text-[#101b36]">
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

      <div className="shrink-0 border-t border-[#dce3ef] p-4">
        <div className="mb-3 rounded-lg bg-[#f4f7fc] px-4 py-3">
          <p className="text-xs text-gray-500">Login sebagai</p>
          <p className="font-semibold text-[#101b36]">Student</p>
        </div>

        <div className="flex justify-start">
          <LogoutButton />
        </div>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-[#dce3ef] bg-white px-4 md:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <img
            src="/logo-n-navy.png"
            alt="NadhiLearn Logo"
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="truncate text-xl font-bold text-[#101b36]">
            NadhiLearn.
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isOpen}
          className="rounded-lg border border-[#dce3ef] px-3 py-2 text-xl text-[#101b36]"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </header>

      <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-white text-[#101b36] md:sticky md:top-0 md:flex md:h-screen">
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

          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white text-[#101b36] shadow-xl">
            <div className="absolute right-3 top-5 z-10">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup menu"
                className="rounded-lg px-3 py-2 text-xl text-[#101b36]"
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
