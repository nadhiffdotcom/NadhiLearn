
"use client";

import { useState, useEffect } from "react";

const courses = [
  {
    category: "Programming",
    title: "Full Stack Web Development",
    teacher: "Andi Pratama",
    lessons: 12,
  },
  {
    category: "Design",
    title: "UI/UX Design Masterclass",
    teacher: "Sarah Putri",
    lessons: 10,
  },
  {
    category: "Marketing",
    title: "Digital Marketing Strategy",
    teacher: "Budi Santoso",
    lessons: 8,
  },
];

export default function Home() {
  const [activeMenu, setActiveMenu] = useState("home");

  // AUTHENTICATION STATE
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // CHECK LOGIN STATUS
  useEffect(() => {
    async function checkLogin() {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (data.success) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Gagal memeriksa status login:", error);
      } finally {
        setAuthLoading(false);
      }
    }

    checkLogin();
  }, []);

  // LOGOUT FUNCTION
  async function handleLogout() {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin logout?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(null);
        window.location.href = "/";
      } else {
        alert("Logout gagal. Silakan coba lagi.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("Terjadi kesalahan saat logout.");
    }
  }

  // ACTIVE NAVBAR MENU
  const menuClass = (menu) =>
    `cursor-pointer transition-all duration-200 ${
      activeMenu === menu
        ? "font-bold underline underline-offset-8"
        : "font-normal hover:underline hover:underline-offset-8"
    }`;

  return (
    <main className="min-h-screen bg-[#0B1F3A] text-white">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full border-b border-[#0B1F3A] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          {/* LOGO */}
          <a
            href="#home"
            onClick={() => setActiveMenu("home")}
            className="flex items-center gap-2.5"
          >
            <img
              src="/logo-n-navy.png"
              alt="NadhiLearn Logo"
              className="h-11 w-11 object-contain"
            />

            <span className="text-3xl font-bold tracking-tight text-[#0B1F3A]">
              NadhiLearn.
            </span>
          </a>

          {/* MENU */}
          <div className="hidden items-center gap-9 text-lg text-[#0B1F3A] md:flex">

            <a
              href="#home"
              onClick={() => setActiveMenu("home")}
              className={menuClass("home")}
            >
              Home
            </a>

            <a
              href="#courses"
              onClick={() => setActiveMenu("courses")}
              className={menuClass("courses")}
            >
              Courses
            </a>

            <a
              href="#about"
              onClick={() => setActiveMenu("about")}
              className={menuClass("about")}
            >
              About
            </a>

          </div>

          {/* AUTH BUTTON */}
          <div className="flex items-center gap-6 text-lg font-semibold">

            {authLoading ? (
              <span className="text-[#0B1F3A]">
                Loading...
              </span>
            ) : user ? (
              <>
                <span className="text-[#0B1F3A]">
                  Hi, {user.username}
                </span>

                <button
                  onClick={handleLogout}
                  className="rounded-lg bg-[#0B1F3A] px-6 py-3.5 text-lg text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="text-[#0B1F3A] hover:underline"
                >
                  Login
                </a>

                <a
                  href="/register"
                  className="rounded-lg bg-[#0B1F3A] px-6 py-3.5 text-lg text-white hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A]"
                >
                  Sign up
                </a>
              </>
            )}

          </div>

        </div>
      </nav>


      {/* HERO SECTION */}
      <section
        id="home"
        className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-24 pt-24 md:pb-32 md:pt-28"
      >
        <p className="mb-12 text-sm font-bold uppercase tracking-[0.2em]">
          Online Learning Platform
        </p>

        <div className="grid items-center gap-12 lg:grid-cols-[1.4fr_1fr]">

          <div>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight md:text-6xl">
              Learn something.
              <br />
              Become something.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8">
              Discover new skills, learn from experienced teachers, and
              develop your potential through NadhiLearn.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#courses"
                onClick={() => setActiveMenu("courses")}
                className="rounded-lg bg-white px-7 py-4 font-bold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-white hover:outline hover:outline-1 hover:outline-white"
              >
                Explore Courses
              </a>

              <a
                href="/register"
                className="rounded-lg border border-white px-7 py-4 font-bold text-white transition hover:bg-white hover:text-[#0B1F3A]"
              >
                Become a Teacher
              </a>
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <img
              src="/logo-nadhilearn.png"
              alt="NadhiLearn"
              className="h-auto w-[340px] max-w-full object-contain md:w-[400px] lg:w-[460px]"
            />
          </div>

        </div>

        {/* STATISTICS */}
        <div className="mt-24 grid grid-cols-1 gap-10 border-t border-white/30 pt-10 sm:grid-cols-3">

          <div>
            <h2 className="text-4xl font-bold">100+</h2>
            <p className="mt-2">Learning Materials</p>
          </div>

          <div>
            <h2 className="text-4xl font-bold">20+</h2>
            <p className="mt-2">Expert Teachers</p>
          </div>

          <div>
            <h2 className="text-4xl font-bold">500+</h2>
            <p className="mt-2">Active Students</p>
          </div>

        </div>
      </section>


      {/* COURSES SECTION */}
      <section
        id="courses"
        className="scroll-mt-28 bg-white px-6 py-24 text-[#0B1F3A]"
      >
        <div className="mx-auto max-w-6xl">

          <div className="mb-12">
            <p className="text-sm font-bold uppercase tracking-[0.2em]">
              Explore Courses
            </p>

            <h2 className="mt-4 text-4xl font-bold">
              Popular Courses
            </h2>

            <p className="mt-4 max-w-2xl leading-7">
              Temukan berbagai kelas menarik dan kembangkan kemampuanmu
              bersama pengajar berpengalaman.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

            {courses.map((course, index) => (
              <div
                key={index}
                className="rounded-xl border border-[#0B1F3A] p-7 transition hover:-translate-y-1"
              >
                <p className="text-sm font-bold uppercase tracking-wider">
                  {course.category}
                </p>

                <h3 className="mt-5 text-2xl font-bold">
                  {course.title}
                </h3>

                <p className="mt-4">
                  Teacher: {course.teacher}
                </p>

                <p className="mt-2">
                  {course.lessons} Lessons
                </p>

                <a
                  href="/courses"
                  className="mt-8 inline-block rounded-lg bg-[#0B1F3A] px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A]"
                >
                  View Course
                </a>
              </div>
            ))}

          </div>

          <div className="mt-12 text-center">
            <a
              href="/courses"
              className="inline-block border border-[#0B1F3A] px-8 py-3 font-bold transition hover:bg-[#0B1F3A] hover:text-white"
            >
              View All Courses
            </a>
          </div>

        </div>
      </section>


      {/* ABOUT SECTION */}
      <section
        id="about"
        className="scroll-mt-28 bg-[#0B1F3A] px-6 py-28 text-white"
      >
        <div className="mx-auto max-w-6xl">

          <p className="text-sm font-bold uppercase tracking-[0.2em]">
            About NadhiLearn
          </p>

          <h2 className="mt-7 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            A better way to learn, grow, and share knowledge.
          </h2>

          <p className="mt-10 max-w-4xl text-lg leading-10">
            NadhiLearn adalah platform pembelajaran digital yang
            mempertemukan siswa dan pengajar dalam satu ruang belajar.
            Temukan materi, ikuti kelas, dan pantau perkembangan belajarmu.
          </p>

        </div>
      </section>


      {/* FOOTER */}
      <footer className="bg-white px-6 py-12 text-[#0B1F3A]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">

          <a
            href="#home"
            onClick={() => setActiveMenu("home")}
            className="text-2xl font-bold"
          >
            NadhiLearn.
          </a>

          <p className="text-sm">
            © 2026 NadhiLearn. All rights reserved.
          </p>

        </div>
      </footer>

    </main>
  );
}
