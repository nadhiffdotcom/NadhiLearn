
"use client";

import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/auth-client";

export default function HomeClient() {
  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // State Homepage Courses
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseError, setCourseError] = useState("");

  
  // State Student Testimonials
  const testimonialTrackRef = useRef(null);

  const [testimonials, setTestimonials] = useState([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [testimonialError, setTestimonialError] = useState("");

  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [testimonialVisibleCount, setTestimonialVisibleCount] =
    useState(1);

  // Mengambil testimoni yang sudah dipublikasikan
  useEffect(() => {
    let active = true;

    async function loadTestimonials() {
      setLoadingTestimonials(true);
      setTestimonialError("");

      try {
        const response = await fetch("/api/home/testimonials");
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Gagal mengambil data testimoni."
          );
        }

        if (active) {
          setTestimonials(data.testimonials || []);
          setActiveTestimonial(0);
        }
      } catch (error) {
        console.error("Gagal mengambil testimoni Homepage:", error);

        if (active) {
          setTestimonials([]);
          setTestimonialError(
            error.message || "Terjadi kesalahan."
          );
        }
      } finally {
        if (active) {
          setLoadingTestimonials(false);
        }
      }
    }

    loadTestimonials();

    return () => {
      active = false;
    };
  }, []);

  // Mengambil data course dari API Homepage.
  useEffect(() => {
    let active = true;

    async function loadCourses() {
      setLoadingCourses(true);
      setCourseError("");

      try {
        const params = new URLSearchParams();

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (categoryId) {
          params.set("category_id", categoryId);
        }

        const response = await fetch(
          `/api/home/courses?${params.toString()}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Gagal mengambil data course."
          );
        }

        if (active) {
          setCourses(data.courses || []);
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Gagal mengambil course Homepage:", error);

        if (active) {
          setCourseError(error.message || "Terjadi kesalahan.");
          setCourses([]);
        }
      } finally {
        if (active) {
          setLoadingCourses(false);
        }
      }
    }

    loadCourses();

    return () => {
      active = false;
    };
  }, [search, categoryId]);

  // Periksa akun berdasarkan token pada tab ini.
  useEffect(() => {
    let active = true;

    async function loadUser() {
      const token = sessionStorage.getItem("nadhi_token");

      if (!token) {
        if (active) {
          setUser(null);
          setCheckingUser(false);
        }
        return;
      }

      try {
        const response = await authFetch("/api/auth/me");
        const data = await response.json();

        if (!active) return;

        if (response.ok && data.success) {
          setUser(data.user);
        } else {
          sessionStorage.removeItem("nadhi_token");
          setUser(null);
        }
      } catch (error) {
        console.error("Gagal memeriksa sesi:", error);

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setCheckingUser(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  // Menentukan menu aktif berdasarkan posisi scroll halaman.
  useEffect(() => {
  const updateActiveMenu = () => {
    const navbar = document.getElementById("main-navbar");
    const navbarHeight = navbar?.offsetHeight || 0;
    const activationPoint = navbarHeight + 120;

    const sections = [
      { id: "home", menu: "home" },
      { id: "courses", menu: "courses" },
      { id: "about", menu: "about" },
      { id: "testimonials", menu: "testimonials" },
    ];

    let activeSection = "home";

    sections.forEach((section) => {
      const element = document.getElementById(section.id);

      if (element && element.getBoundingClientRect().top <= activationPoint) {
        activeSection = section.menu;
      }
    });

    setActiveMenu(activeSection);
  };

  updateActiveMenu();

  window.addEventListener("scroll", updateActiveMenu, { passive: true });
  window.addEventListener("resize", updateActiveMenu);
  window.addEventListener("hashchange", updateActiveMenu);

  return () => {
    window.removeEventListener("scroll", updateActiveMenu);
    window.removeEventListener("resize", updateActiveMenu);
    window.removeEventListener("hashchange", updateActiveMenu);
  };
}, []);

  // Menyesuaikan jumlah kartu yang terlihat berdasarkan ukuran layar.
  useEffect(() => {
    function updateVisibleCount() {
      if (window.innerWidth >= 1024) {
        setTestimonialVisibleCount(3);
      } else if (window.innerWidth >= 640) {
        setTestimonialVisibleCount(2);
      } else {
        setTestimonialVisibleCount(1);
      }
    }

    updateVisibleCount();

    window.addEventListener("resize", updateVisibleCount);

    return () => {
      window.removeEventListener("resize", updateVisibleCount);
    };
  }, []);

  // Batas posisi carousel berdasarkan jumlah kartu yang terlihat.
  const maxTestimonialIndex = Math.max(
    0,
    testimonials.length - testimonialVisibleCount
  );

  // Memperbarui indikator carousel saat digeser.
  function handleTestimonialScroll() {
    const track = testimonialTrackRef.current;
    if (!track) return;

    const firstCard = track.querySelector(
      "[data-testimonial-card]"
    );

    if (!firstCard) return;

    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;

    const index = Math.round(
      track.scrollLeft / (cardWidth + gap)
    );

    setActiveTestimonial(
      Math.min(index, maxTestimonialIndex)
    );
  }

  // Menggeser carousel satu kartu.
  function scrollTestimonials(direction) {
    const track = testimonialTrackRef.current;
    if (!track) return;

    const firstCard = track.querySelector(
      "[data-testimonial-card]"
    );

    if (!firstCard) return;

    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;

    track.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: "smooth",
    });
  }

  // Navigasi ke posisi carousel tertentu.
  function goToTestimonial(index) {
    const track = testimonialTrackRef.current;
    if (!track) return;

    const cards = track.querySelectorAll(
      "[data-testimonial-card]"
    );

    cards[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }

  // Logout hanya dari tab yang sedang digunakan.
  function handleLogout() {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin logout dari tab ini?"
    );

    if (!confirmed) return;

    sessionStorage.removeItem("nadhi_token");
    setUser(null);
    setMobileMenuOpen(false);
    window.location.href = "/";
  }

  // Dashboard berdasarkan role.
  const dashboard = {
    student: {
      label: "Student Dashboard",
      href: "/student/dashboard",
    },
    teacher: {
      label: "Teacher Dashboard",
      href: "/teacher/dashboard",
    },
    admin: {
      label: "Admin Dashboard",
      href: "/admin/dashboard",
    },
  };

  const userDashboard = user ? dashboard[user.role] : null;

  const menuClass = (menu) =>
    `cursor-pointer transition-all duration-200 ${
      activeMenu === menu
        ? "font-bold underline underline-offset-8"
        : "font-normal hover:font-bold"
    }`;

  return (
    <main className="min-h-screen bg-[#0B1F3A] text-white">

      {/* NAVBAR */}
      <nav
        id="main-navbar"
        className="sticky top-0 z-50 w-full border-b border-[#0B1F3A] bg-white"
      >
        <div className="mx-auto flex min-h-[68px] w-full max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-[80px] sm:px-6">

          {/* LOGO */}
          <div className="min-w-0">
            <a href="/#home" className="flex items-center gap-2">
              <img
                src="/logo-n-navy.png"
                alt="NadhiLearn Logo"
                className="h-8 w-8 shrink-0 object-contain sm:h-10 sm:w-10"
              />

              <span className="text-lg font-bold tracking-tight text-[#0B1F3A] sm:text-2xl lg:text-3xl">
                NadhiLearn.
              </span>
            </a>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden items-center justify-center gap-5 whitespace-nowrap text-sm text-[#0B1F3A] lg:flex xl:gap-7 xl:text-base">
            <a
              href="/#home"
              onClick={() => setActiveMenu("home")}
              className={menuClass("home")}
            >
              Home
            </a>

            <a
              href="/#courses"
              onClick={() => setActiveMenu("courses")}
              className={menuClass("courses")}
            >
              Courses
            </a>

            <a
              href="/#about"
              onClick={() => setActiveMenu("about")}
              className={menuClass("about")}
            >
              About
            </a>

            <a
              href="/#testimonials"
              onClick={() => setActiveMenu("testimonials")}
              className={menuClass("testimonials")}
            >
              Student Testimonials
            </a>

            {userDashboard && (
              <a
                href={userDashboard.href}
                className="transition hover:font-bold"
              >
                {userDashboard.label}
              </a>
            )}
          </div>

          {/* DESKTOP LOGIN / LOGOUT */}
          <div className="hidden shrink-0 items-center gap-4 text-sm font-semibold text-[#0B1F3A] lg:flex">
            {checkingUser ? (
              <span className="text-sm">
                Memeriksa sesi...
              </span>
            ) : user ? (
              <>
                <span className="max-w-32 truncate">
                  Hi, {user.username}
                </span>

                <button
                  onClick={handleLogout}
                  className="whitespace-nowrap rounded-lg bg-[#0B1F3A] px-5 py-3 text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="transition hover:underline"
                >
                  Login
                </a>

                <a
                  href="/register"
                  className="whitespace-nowrap rounded-lg bg-[#0B1F3A] px-5 py-3 text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A]"
                >
                  Sign up
                </a>
              </>
            )}
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#0B1F3A] text-xl text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-white lg:hidden"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <div className="border-t border-[#0B1F3A]/20 bg-white px-5 py-5 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm font-medium text-[#0B1F3A]">

              <a
                href="/#home"
                onClick={() => {
                  setActiveMenu("home");
                  setMobileMenuOpen(false);
                }}
                className={menuClass("home")}
              >
                Home
              </a>

              <a
                href="/#courses"
                onClick={() => {
                  setActiveMenu("courses");
                  setMobileMenuOpen(false);
                }}
                className={menuClass("courses")}
              >
                Courses
              </a>

              <a
                href="/#about"
                onClick={() => {
                  setActiveMenu("about");
                  setMobileMenuOpen(false);
                }}
                className={menuClass("about")}
              >
                About
              </a>

              <a
                href="/#testimonials"
                onClick={() => {
                  setActiveMenu("testimonials");
                  setMobileMenuOpen(false);
                }}
                className={menuClass("testimonials")}
              >
                Student Testimonials
              </a>

              {userDashboard && (
                <a
                  href={userDashboard.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="transition hover:font-bold"
                >
                  {userDashboard.label}
                </a>
              )}

              <div className="border-t border-[#0B1F3A]/20 pt-4">
                {checkingUser ? (
                  <span className="text-sm">
                    Memeriksa sesi...
                  </span>
                ) : user ? (
                  <div className="flex flex-col gap-3">
                    <span className="font-semibold">
                      Hi, {user.username}
                    </span>

                    <button
                      onClick={handleLogout}
                      className="w-full rounded-lg bg-[#0B1F3A] px-5 py-3 text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A]"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <a
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-center transition hover:underline"
                    >
                      Login
                    </a>

                    <a
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-lg bg-[#0B1F3A] px-5 py-3 text-center text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A]"
                    >
                      Sign up
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section
        id="home"
        className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 md:pb-32 md:pt-28"
      >
        <p className="mb-8 text-xs font-bold uppercase tracking-[0.2em] sm:mb-12 sm:text-sm">
          Online Learning Platform
        </p>

        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          <div className="min-w-0">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              Learn something.
              <br />
              Become something.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 sm:mt-8 sm:text-lg sm:leading-8">
              Discover new skills, learn from experienced teachers,
              and develop your potential through NadhiLearn.
            </p>

            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap sm:mt-10">
              <a
                href="/#courses"
                className="rounded-lg bg-white px-6 py-3 text-center text-sm font-bold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-white hover:outline hover:outline-1 hover:outline-white sm:px-7 sm:py-4 sm:text-base"
              >
                Explore Courses
              </a>

              <a
                href="/register"
                className="rounded-lg border border-white px-6 py-3 text-center text-sm font-bold text-white transition hover:bg-white hover:text-[#0B1F3A] sm:px-7 sm:py-4 sm:text-base"
              >
                Become a Teacher
              </a>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center lg:justify-end">
            <img
              src="/logo-nadhilearn.png"
              alt="NadhiLearn"
              className="h-auto w-full max-w-[280px] object-contain sm:max-w-[340px] md:max-w-[400px] lg:max-w-[460px]"
            />
          </div>
        </div>

        {/* STATISTICS */}
        <div className="mt-16 grid grid-cols-1 gap-8 border-t border-white/30 pt-8 text-center sm:mt-24 sm:grid-cols-3 sm:gap-10 sm:pt-10 sm:text-left">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">
              100+
            </h2>
            <p className="mt-2 text-sm sm:text-base">
              Learning Materials
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">
              20+
            </h2>
            <p className="mt-2 text-sm sm:text-base">
              Expert Teachers
            </p>
          </div>

          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">
              500+
            </h2>
            <p className="mt-2 text-sm sm:text-base">
              Active Students
            </p>
          </div>
        </div>
      </section>

      {/* COURSES SECTION */}
      <section
        id="courses"
        className="scroll-mt-28 bg-white px-4 py-16 text-[#0B1F3A] sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-6xl">

          <div className="mb-10 sm:mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em] sm:text-sm">
              Explore Courses
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Popular Courses
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 sm:text-base">
              Temukan berbagai kelas menarik dan kembangkan
              kemampuanmu bersama pengajar berpengalaman.
            </p>
          </div>

          {/* SEARCH DAN FILTER */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:mb-10 md:grid-cols-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari course..."
              className="w-full min-w-0 rounded-lg border border-[#0B1F3A] bg-white px-4 py-3 text-sm text-[#0B1F3A] outline-none focus:ring-2 focus:ring-[#0B1F3A] sm:text-base"
            />

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-[#0B1F3A] bg-white px-4 py-3 text-sm text-[#0B1F3A] outline-none focus:ring-2 focus:ring-[#0B1F3A] sm:text-base"
            >
              <option value="">
                Semua Kategori
              </option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* COURSE LIST */}
          {loadingCourses ? (
            <p className="py-10 text-center text-sm sm:text-base">
              Memuat course...
            </p>
          ) : courseError ? (
            <p className="py-10 text-center text-sm text-red-600 sm:text-base">
              {courseError}
            </p>
          ) : courses.length === 0 ? (
            <p className="py-10 text-center text-sm sm:text-base">
              Course tidak ditemukan.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-6 lg:gap-8">
              {courses.map((course, index) => {
                const isLastRowTwo =
                  courses.length % 3 === 2 &&
                  index >= courses.length - 2;

                return (
                  <div
                    key={course.id}
                    className={`min-w-0 rounded-xl border border-[#0B1F3A] p-5 transition hover:-translate-y-1 sm:p-7 lg:col-span-2 ${
                      isLastRowTwo
                        ? index === courses.length - 2
                          ? "lg:col-start-2"
                          : "lg:col-start-4"
                        : ""
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider sm:text-sm">
                      {course.category_name || "Uncategorized"}
                    </p>

                    <h3 className="mt-4 break-words text-xl font-bold sm:mt-5 sm:text-2xl">
                      {course.title}
                    </h3>

                    <p className="mt-4 break-words text-sm sm:text-base">
                      Teacher: {course.teacher_name || "Belum ditentukan"}
                    </p>

                    <p className="mt-2 text-sm sm:text-base">
                      {course.enrollment_count} Students Enrolled
                    </p>

                    <a
                      href={`/courses/${course.id}`}
                      className="mt-6 inline-block rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A] sm:mt-8 sm:px-6 sm:text-base"
                    >
                      View Course
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section
        id="about"
        className="scroll-mt-28 bg-[#0B1F3A] px-4 py-20 text-white sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] sm:text-sm">
            About NadhiLearn
          </p>

          <h2 className="mt-6 max-w-3xl text-3xl font-bold leading-tight sm:mt-7 sm:text-4xl md:text-5xl">
            A better way to learn, grow, and share knowledge.
          </h2>

          <p className="mt-7 max-w-4xl text-base leading-8 sm:mt-10 sm:text-lg sm:leading-10">
            NadhiLearn adalah platform pembelajaran digital yang
            mempertemukan siswa dan pengajar dalam satu ruang belajar.
            Temukan materi, ikuti kelas, dan pantau perkembangan belajarmu.
          </p>
        </div>
                </section>

      {/* STUDENT TESTIMONIALS */}
      <section
        id="testimonials"
        className="scroll-mt-28 bg-white px-4 py-16 text-[#0B1F3A] sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-7xl">

          {/* SECTION HEADER */}
          <div className="mb-10 text-center sm:mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] sm:text-sm">
              Student Testimonials
            </p>

            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Stories From Our Students.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 sm:text-base">
              Pengalaman belajar dan cerita perkembangan siswa
              bersama NadhiLearn.
            </p>
          </div>

          {/* TESTIMONIAL CAROUSEL */}
          
          {loadingTestimonials ? (
            <p className="py-10 text-center text-sm">
              Memuat testimoni...
            </p>
          ) : testimonialError ? (
            <p className="py-10 text-center text-sm text-red-600">
              {testimonialError}
            </p>
          ) : testimonials.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#0B1F3A]/60">
              Belum ada testimoni yang dipublikasikan.
            </p>
          ) : (
            <div
              ref={testimonialTrackRef}
              onScroll={handleTestimonialScroll}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 lg:gap-6"
            >
              {testimonials.map((testimonial) => (
                <article
                  key={testimonial.id}
                  data-testimonial-card
                  className="flex min-w-0 w-[88%] shrink-0 snap-start flex-col rounded-xl border border-[#0B1F3A]/10 bg-white p-5 shadow-[0_8px_30px_rgba(11,31,58,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(11,31,58,0.12)] sm:w-[calc((100%-1.25rem)/2)] sm:p-6 lg:w-[calc((100%-3rem)/3)] lg:p-7"
                >
                  {/* STUDENT PROFILE */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0B1F3A] text-base font-bold text-white sm:h-14 sm:w-14 sm:text-lg">
                      {testimonial.name
                        .split(" ")
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join("")}
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words text-base font-bold sm:text-lg">
                        {testimonial.name}
                      </h3>

                      <p className="mt-1 text-xs text-[#0B1F3A]/60 sm:text-sm">
                        Student NadhiLearn
                      </p>
                    </div>
                  </div>

                  {/* RATING */}
                  <div
                    className="mt-5 flex gap-1"
                    aria-label={`${testimonial.rating} dari 5 bintang`}
                  >
                    {Array.from(
                      { length: Number(testimonial.rating) },
                      (_, index) => (
                        <span
                          key={index}
                          className="text-lg text-[#0B1F3A]"
                        >
                          ★
                        </span>
                      )
                    )}
                  </div>

                  {/* COURSE */}
                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[#0B1F3A]/55">
                    Course
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {testimonial.course}
                  </p>

                  {/* MESSAGE */}
                  <p className="mt-5 flex-1 text-sm leading-7 text-[#0B1F3A]/75 sm:text-base">
                    "{testimonial.message}"
                  </p>

                  <div className="mt-6 border-t border-[#0B1F3A]/10 pt-4">
                    <span className="text-xs font-semibold text-[#0B1F3A]/50">
                      Student Experience
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* CAROUSEL CONTROLS */}
          {!loadingTestimonials &&
            !testimonialError &&
            testimonials.length > testimonialVisibleCount && (
              <div className="mt-7 flex items-center justify-center gap-5 sm:mt-9">

                {/* PREVIOUS */}
                <button
                  type="button"
                  onClick={() => scrollTestimonials(-1)}
                  disabled={activeTestimonial === 0}
                  aria-label="Testimoni sebelumnya"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#0B1F3A]/20 text-xl transition hover:bg-[#0B1F3A] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ←
                </button>

                {/* INDICATOR */}
                <div className="flex items-center gap-2">
                  {Array.from(
                    { length: maxTestimonialIndex + 1 },
                    (_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => goToTestimonial(index)}
                        aria-label={`Lihat posisi testimoni ${index + 1}`}
                        aria-current={
                          activeTestimonial === index
                            ? "true"
                            : undefined
                        }
                        className={`h-2 rounded-full transition-all duration-300 ${
                          activeTestimonial === index
                            ? "w-10 bg-[#0B1F3A]"
                            : "w-2 bg-[#0B1F3A]/25 hover:bg-[#0B1F3A]/50"
                        }`}
                      />
                    )
                  )}
                </div>

                {/* NEXT */}
                <button
                  type="button"
                  onClick={() => scrollTestimonials(1)}
                  disabled={
                    activeTestimonial >= maxTestimonialIndex
                  }
                  aria-label="Testimoni berikutnya"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B1F3A] text-xl text-white transition hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  →
                </button>
              </div>
            )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0B1F3A] px-6 py-12 text-white">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
      <h2 className="text-2xl font-bold">NadhiLearn.</h2>
      <p className="text-sm text-white/80">
        © 2026 NadhiLearn. All rights reserved.
      </p>
    </div>
  </footer>
    </main>
  );
}
