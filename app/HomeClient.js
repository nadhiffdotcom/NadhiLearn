"use client";

import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/auth-client";


const CATEGORY_TONES = [
  { bg: "#e4eaf5", fg: "#0a1f4a" },
  { bg: "#E2F7E8", fg: "#1F9D55" },
  { bg: "#FFE7EC", fg: "#E0445E" },
  { bg: "#FFEBD9", fg: "#E8782A" },
  { bg: "#E3ECFF", fg: "#3B6FE0" },
  { bg: "#FFF2C9", fg: "#B88400" },
];

function CategoryIcon({ name = "", color }) {
  const key = name.toLowerCase();
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (/(program|develop|code|web)/.test(key)) {
    return (
      <svg {...common}>
        <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
      </svg>
    );
  }

  if (/(business|bisnis|finance|keuangan)/.test(key)) {
    return (
      <svg {...common}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    );
  }

  if (/(design|desain|ui|ux)/.test(key)) {
    return (
      <svg {...common}>
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  if (/(market|pemasaran)/.test(key)) {
    return (
      <svg {...common}>
        <path d="M3 11v2a1 1 0 0 0 1 1h2l8 4V6L6 10H4a1 1 0 0 0-1 1ZM18 9a4 4 0 0 1 0 6" />
      </svg>
    );
  }

  if (/(data|tech|teknologi|ai)/.test(key)) {
    return (
      <svg {...common}>
        <path d="M21 12A9 9 0 1 1 12 3v9ZM15 3.5A9 9 0 0 1 20.5 9H15Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" />
    </svg>
  );
}

function Stars({ value = 5, size = 18 }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));

  return (
    <div
      className="flex gap-0.5"
      role="img"
      aria-label={`${rating} dari 5 bintang`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i < rating ? "#FFB020" : "#d9e0ee"}
          aria-hidden="true"
        >
          <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.5 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9Z" />
        </svg>
      ))}
    </div>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "–";
  return new Intl.NumberFormat("id-ID").format(value);
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

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
  const [stats, setStats] = useState(null);

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
          setStats(data.stats || null);
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
          sessionStorage.removeItem("nadhi_profile");
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

        if (
          element &&
          element.getBoundingClientRect().top <= activationPoint
        ) {
          activeSection = section.menu;
        }
      });

      setActiveMenu(activeSection);
    };

    updateActiveMenu();

    window.addEventListener("scroll", updateActiveMenu, {
      passive: true,
    });
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
    sessionStorage.removeItem("nadhi_profile");
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

  const navItems = [
    { id: "home", label: "Home" },
    { id: "courses", label: "Courses" },
    { id: "about", label: "About" },
    { id: "testimonials", label: "Student Testimonials" },
  ];

  const menuClass = (menu) =>
    `rounded-full px-4 py-2 text-sm font-semibold ${
      activeMenu === menu
        ? "bg-[#e7edf7] text-[#0a1f4a]"
        : "text-[#101b36]/75 hover:bg-[#f2f5fb] hover:text-[#101b36]"
    }`;

  const primaryButton =
    "inline-flex items-center justify-center gap-2 rounded-full bg-[#0a1f4a] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(10,31,74,0.7)] hover:bg-[#1b3a7a] sm:text-base";

  const secondaryButton =
    "inline-flex items-center justify-center gap-2 rounded-full border border-[#ced7e8] bg-white px-6 py-3 text-sm font-bold text-[#101b36] hover:border-[#0a1f4a] hover:text-[#0a1f4a] sm:text-base";

  function pickCategory(id) {
    setCategoryId(String(id));
    document
      .getElementById("courses")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const heroFeatures = [
    { label: "Pengajar terverifikasi", note: "Disetujui admin", tone: CATEGORY_TONES[3] },
    { label: "Belajar sesuai jadwalmu", note: "Materi bertahap", tone: CATEGORY_TONES[1] },
    { label: "Sertifikat penyelesaian", note: "Bisa dicetak", tone: CATEGORY_TONES[0] },
    { label: "Diskusi tiap materi", note: "Tanya langsung", tone: CATEGORY_TONES[2] },
  ];

  const statItems = [
    { label: "Kursus tersedia", value: stats?.courses },
    { label: "Materi belajar", value: stats?.materials },
    { label: "Pengajar terverifikasi", value: stats?.teachers },
    { label: "Siswa terdaftar", value: stats?.students },
  ];

  return (
    <main className="min-h-screen bg-white text-[#101b36]">
      {/* NAVBAR */}
      <nav
        id="main-navbar"
        className="sticky top-0 z-50 w-full border-b border-[#dce3ef] bg-white/90 backdrop-blur"
      >
        <div className="mx-auto flex min-h-[68px] w-full max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-[76px] sm:px-6">
          <a href="/#home" className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo-n-navy.png"
              alt="NadhiLearn Logo"
              className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
            />
            <span className="text-xl font-extrabold tracking-tight sm:text-2xl">
              NadhiLearn
            </span>
          </a>

          <div className="hidden items-center gap-1 whitespace-nowrap lg:flex">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`/#${item.id}`}
                onClick={() => setActiveMenu(item.id)}
                className={menuClass(item.id)}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden shrink-0 items-center gap-3 text-sm font-semibold lg:flex">
            {checkingUser ? (
              <span className="text-[#56627c]">Memeriksa sesi...</span>
            ) : user ? (
              <>
                <span className="max-w-40 truncate text-[#56627c]">
                  Hi, {user?.display_name || "Nama belum diatur"}
                </span>

                <button
                  onClick={handleLogout}
                  className="whitespace-nowrap rounded-full border border-[#ced7e8] px-5 py-2.5 text-[#101b36] hover:border-[#0a1f4a] hover:text-[#0a1f4a]"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="px-3 py-2 hover:text-[#0a1f4a]">
                  Login
                </a>

                <a
                  href="/register"
                  className="whitespace-nowrap rounded-full bg-[#0a1f4a] px-5 py-2.5 text-white hover:bg-[#1b3a7a]"
                >
                  Sign up
                </a>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ced7e8] text-xl hover:bg-[#e7edf7] lg:hidden"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[#dce3ef] bg-white px-5 py-5 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`/#${item.id}`}
                  onClick={() => {
                    setActiveMenu(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={menuClass(item.id)}
                >
                  {item.label}
                </a>
              ))}

              <div className="mt-3 border-t border-[#dce3ef] pt-4">
                {checkingUser ? (
                  <span className="text-sm">Memeriksa sesi...</span>
                ) : user ? (
                  <div className="flex flex-col gap-3">
                    <span className="font-semibold">
                      {user?.display_name || "Nama belum diatur"}
                    </span>

                    <button
                      onClick={handleLogout}
                      className="w-full rounded-full border border-[#ced7e8] px-5 py-3 font-semibold hover:border-[#0a1f4a] hover:text-[#0a1f4a]"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <a
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-full border border-[#ced7e8] px-5 py-3 text-center font-semibold hover:border-[#0a1f4a] hover:text-[#0a1f4a]"
                    >
                      Login
                    </a>

                    <a
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-full bg-[#0a1f4a] px-5 py-3 text-center font-bold text-white hover:bg-[#1b3a7a]"
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

      {/* HERO */}
      <section
        id="home"
        className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-[#f2f5fb] to-white"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-28 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-36 lg:pt-20">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e7edf7] px-4 py-1.5 text-xs font-bold text-[#0a1f4a] sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0a1f4a]" />
              Platform belajar online
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[64px]">
              Learn something.
              <br />
              <span className="text-[#0a1f4a]">Become something.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-[#56627c] sm:text-lg">
              Temukan keterampilan baru, belajar dari pengajar berpengalaman,
              dan kembangkan potensimu lewat NadhiLearn.
            </p>

            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap sm:mt-10">
              <a href="/#courses" className={primaryButton}>
                Explore Courses
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>

              {!checkingUser && !user && (
                <a href="/register" className={secondaryButton}>
                  Become a Teacher
                </a>
              )}

              {!checkingUser && userDashboard && (
                <a href={userDashboard.href} className={secondaryButton}>
                  {userDashboard.label}
                </a>
              )}
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="relative mx-auto w-full max-w-[560px] min-w-0">
            <div className="absolute inset-0 -z-0 rounded-[2.5rem] bg-gradient-to-br from-[#dce4f5] via-[#e7edf7] to-[#FFF1D6]" />

            <div className="relative px-4 pb-10 pt-12 sm:px-8 sm:pb-12 sm:pt-14">
              <div className="nl-float mx-auto max-w-[360px] rounded-3xl border border-white bg-white p-5 shadow-[0_30px_60px_-28px_rgba(46,26,140,0.45)]">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF8FA3]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FFC857]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#7ED9A0]" />
                  </div>
                  <span className="text-xs font-semibold text-[#56627c]">
                    Progres belajarmu
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e7edf7" strokeWidth="4" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#0a1f4a" strokeWidth="4" strokeLinecap="round" strokeDasharray="73 100" pathLength="100" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold">
                      75%
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-snug">
                      Python untuk Analisis Data
                    </p>
                    <p className="mt-1 text-xs text-[#56627c]">
                      6 dari 8 materi selesai
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5 text-sm">
                  {[
                    ["Pengenalan Python", true],
                    ["Mengolah data dengan Pandas", true],
                    ["Visualisasi data", false],
                  ].map(([label, done]) => (
                    <li key={label} className="flex items-center gap-3">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          done
                            ? "bg-[#0a1f4a] text-white"
                            : "border-2 border-[#ced7e8] text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className={done ? "text-[#101b36]" : "text-[#56627c]"}>
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Kartu fitur */}
              <div className="mx-auto mt-5 w-full max-w-[300px] rounded-2xl border border-white bg-white/95 p-4 shadow-[0_20px_40px_-24px_rgba(46,26,140,0.4)] sm:absolute sm:-right-2 sm:top-24 sm:mx-0 sm:mt-0 sm:w-[236px]">
                <ul className="space-y-3">
                  {heroFeatures.map((feature) => (
                    <li key={feature.label} className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: feature.tone.bg }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: feature.tone.fg }}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold leading-tight">
                          {feature.label}
                        </span>
                        <span className="block text-xs text-[#56627c]">
                          {feature.note}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KATEGORI */}
      <section className="relative z-10 mx-auto -mt-16 max-w-7xl px-4 sm:-mt-20 sm:px-6">
        <div className="rounded-3xl border border-[#dce3ef] bg-white p-5 shadow-[0_24px_60px_-34px_rgba(46,26,140,0.35)] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-extrabold sm:text-xl">
              Kategori populer
            </h2>

            {categoryId && (
              <button
                type="button"
                onClick={() => setCategoryId("")}
                className="text-sm font-bold text-[#0a1f4a] hover:underline"
              >
                Hapus filter
              </button>
            )}
          </div>

          {categories.length === 0 ? (
            <p className="py-6 text-sm text-[#56627c]">
              {loadingCourses ? "Memuat kategori..." : "Belum ada kategori."}
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {categories.map((category, index) => {
                const tone = CATEGORY_TONES[index % CATEGORY_TONES.length];
                const selected = String(category.id) === String(categoryId);

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => pickCategory(category.id)}
                    aria-pressed={selected}
                    className={`flex flex-col items-center gap-3 rounded-2xl border px-3 py-5 text-center ${
                      selected
                        ? "border-[#0a1f4a] bg-[#f2f5fb]"
                        : "border-transparent hover:bg-[#f2f5fb]"
                    }`}
                  >
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ background: tone.bg }}
                    >
                      <CategoryIcon name={category.name} color={tone.fg} />
                    </span>

                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-tight">
                        {category.name}
                      </span>
                      <span className="mt-1 block text-xs text-[#56627c]">
                        {category.course_count} kursus
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* COURSES */}
      <section id="courses" className="scroll-mt-24 px-4 pb-6 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-[#f2f5fb] p-5 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Kursus terpopuler
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#56627c] sm:text-base">
                Temukan berbagai kelas menarik dan kembangkan kemampuanmu
                bersama pengajar berpengalaman.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[460px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari course..."
                aria-label="Cari course"
                className="w-full min-w-0 rounded-full border border-[#ced7e8] bg-white px-5 py-3 text-sm outline-none placeholder:text-[#8793ac] focus:border-[#0a1f4a] focus:ring-2 focus:ring-[#0a1f4a]/20"
              />

              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                aria-label="Filter kategori"
                className="w-full min-w-0 rounded-full border border-[#ced7e8] bg-white px-5 py-3 text-sm outline-none focus:border-[#0a1f4a] focus:ring-2 focus:ring-[#0a1f4a]/20"
              >
                <option value="">Semua Kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingCourses ? (
            <p className="py-14 text-center text-sm text-[#56627c]">Memuat course...</p>
          ) : courseError ? (
            <p className="py-14 text-center text-sm text-red-600">{courseError}</p>
          ) : courses.length === 0 ? (
            <p className="py-14 text-center text-sm text-[#56627c]">Course tidak ditemukan.</p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
              {courses.slice(0, 5).map((course, index) => {
                const tone = CATEGORY_TONES[index % CATEGORY_TONES.length];
                const centeredLastRow = courses.length >= 5 && index >= 3;

                return (
                  <article
                    key={course.id}
                    className={`flex min-w-0 flex-col overflow-hidden rounded-3xl border border-[#dce3ef] bg-white lg:col-span-2 ${
                      centeredLastRow
                        ? index === 3
                          ? "lg:col-start-2"
                          : "lg:col-start-4"
                        : ""
                    }`}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#e7edf7]">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={`Sampul ${course.title}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center text-5xl font-extrabold"
                          style={{ background: tone.bg, color: tone.fg }}
                        >
                          {initials(course.title)}
                        </div>
                      )}

                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#0a1f4a]">
                        {course.category_name || "Uncategorized"}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="break-words text-lg font-extrabold leading-snug">
                        {course.title}
                      </h3>

                      <p className="mt-2 break-words text-sm text-[#56627c]">
                        Teacher: {course.teacher_name || "Belum ditentukan"}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                        <span className="text-sm font-semibold text-[#56627c]">
                          {course.enrollment_count} siswa terdaftar
                        </span>

                        <a
                          href={`/courses/${course.id}`}
                          className="rounded-full bg-[#0a1f4a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1b3a7a]"
                        >
                          View Course
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* STATISTIK */}
      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 rounded-3xl bg-[#101b36] px-6 py-9 text-white sm:px-10 lg:grid-cols-4">
          {statItems.map((item, index) => (
            <div
              key={item.label}
              className={`px-2 text-center lg:px-6 ${
                index > 0 ? "lg:border-l lg:border-white/15" : ""
              }`}
            >
              <p className="text-3xl font-extrabold sm:text-4xl">
                {formatNumber(item.value)}
              </p>
              <p className="mt-1 text-sm text-white/70">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <span className="text-sm font-bold text-[#0a1f4a]">
              Tentang NadhiLearn
            </span>

            <h2 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Belajar sesuai ritmemu, dari mana saja.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-8 text-[#56627c]">
              NadhiLearn mempertemukan siswa dan pengajar dalam satu ruang
              belajar. Temukan materi, ikuti kelas, dan pantau perkembangan
              belajarmu sampai mendapat sertifikat.
            </p>

            <ul className="mt-7 space-y-4">
              {[
                "Materi tersusun bertahap di setiap kursus",
                "Progres belajar tercatat otomatis",
                "Diskusi dengan pengajar di tiap materi",
                "Sertifikat bisa diverifikasi dengan kode unik",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm font-semibold sm:text-base">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e7edf7] text-xs font-bold text-[#0a1f4a]">
                    ✓
                  </span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/#courses" className={primaryButton}>
                Mulai belajar
              </a>
              <a href="/verify-certificates" className={secondaryButton}>
                Verifikasi sertifikat
              </a>
            </div>
          </div>

          {/* Ilustrasi perangkat */}
          <div className="relative mx-auto w-full max-w-[560px] min-w-0 rounded-[2rem] bg-gradient-to-br from-[#e7edf7] to-[#f5f8fc] p-6 sm:p-10">
            <div className="rounded-2xl border border-[#dce3ef] bg-white p-4 shadow-[0_24px_50px_-30px_rgba(46,26,140,0.4)]">
              <div className="flex items-center gap-2">
                <img src="/logo-n-navy.png" alt="" className="h-6 w-6" />
                <span className="text-sm font-extrabold">Dashboard Student</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ["3", "Kursus"],
                  ["18", "Materi selesai"],
                  ["1", "Sertifikat"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl bg-[#f2f5fb] px-2 py-3">
                    <p className="text-lg font-extrabold text-[#0a1f4a]">{value}</p>
                    <p className="text-[11px] text-[#56627c]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e7edf7]">
                <div className="h-full w-3/4 rounded-full bg-[#0a1f4a]" />
              </div>
            </div>

            <div className="mt-4 ml-auto w-[78%] rounded-2xl border border-[#F2E3B8] bg-[#FFFAEB] p-4 text-center shadow-[0_18px_40px_-28px_rgba(120,80,0,0.5)]">
              <p className="text-[11px] font-bold text-[#8A6A00]">
                Sertifikat Penyelesaian
              </p>
              <p className="mt-2 text-sm font-extrabold">Nama Siswa</p>
              <p className="mt-1 text-xs text-[#56627c]">
                telah menyelesaikan seluruh materi kursus
              </p>
              <div className="mx-auto mt-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#FFB020] text-sm font-extrabold text-white">
                ★
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STUDENT TESTIMONIALS */}
      <section id="testimonials" className="scroll-mt-24 px-4 pb-16 pt-6 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-[#f2f5fb] p-5 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <span className="text-sm font-bold text-[#0a1f4a]">
                Student Testimonials
              </span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Cerita belajar dari siswa kami
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#56627c] sm:text-base">
                Pengalaman belajar dan perkembangan siswa bersama NadhiLearn.
              </p>
            </div>

            {!loadingTestimonials &&
              !testimonialError &&
              testimonials.length > testimonialVisibleCount && (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollTestimonials(-1)}
                    disabled={activeTestimonial === 0}
                    aria-label="Testimoni sebelumnya"
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ced7e8] bg-white text-xl hover:border-[#0a1f4a] hover:text-[#0a1f4a] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollTestimonials(1)}
                    disabled={activeTestimonial >= maxTestimonialIndex}
                    aria-label="Testimoni berikutnya"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0a1f4a] text-xl text-white hover:bg-[#1b3a7a] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    →
                  </button>
                </div>
              )}
          </div>

          <div className="mt-8">
            {loadingTestimonials ? (
              <p className="py-10 text-center text-sm text-[#56627c]">Memuat testimoni...</p>
            ) : testimonialError ? (
              <p className="py-10 text-center text-sm text-red-600">{testimonialError}</p>
            ) : testimonials.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#56627c]">
                Belum ada testimoni yang dipublikasikan.
              </p>
            ) : (
              <div
                ref={testimonialTrackRef}
                onScroll={handleTestimonialScroll}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 lg:gap-6"
              >
                {testimonials.map((testimonial) => (
                  <article
                    key={testimonial.id}
                    data-testimonial-card
                    className="relative flex min-w-0 w-[88%] shrink-0 snap-start flex-col rounded-3xl border border-[#dce3ef] bg-white p-6 sm:w-[calc((100%-1.25rem)/2)] lg:w-[calc((100%-3rem)/3)] lg:p-7"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7edf7] text-3xl font-extrabold leading-none text-[#0a1f4a]">
                        <span className="translate-y-[5px]">“</span>
                      </span>

                      <Stars value={testimonial.rating} />
                    </div>

                    <p className="mt-5 flex-1 text-[15px] leading-7 text-[#2c3a5c] sm:text-base sm:leading-8">
                      {testimonial.message}
                    </p>

                    <div className="mt-6 flex items-center gap-3 border-t border-[#e7edf7] pt-5">
                      {testimonial.image_url ? (
                        <img
                          src={testimonial.image_url}
                          alt={`Foto ${testimonial.name}`}
                          className="h-12 w-12 shrink-0 rounded-full border border-[#dce3ef] object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0a1f4a] text-base font-bold text-white">
                          {initials(testimonial.name)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-extrabold sm:text-base">
                          {testimonial.name}
                        </h3>
                        <p className="mt-0.5 break-words text-xs text-[#56627c] sm:text-sm">
                          {testimonial.course}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!loadingTestimonials &&
              !testimonialError &&
              testimonials.length > testimonialVisibleCount && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {Array.from({ length: maxTestimonialIndex + 1 }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => goToTestimonial(index)}
                      aria-label={`Lihat posisi testimoni ${index + 1}`}
                      aria-current={activeTestimonial === index ? "true" : undefined}
                      className={`h-2 rounded-full ${
                        activeTestimonial === index
                          ? "w-8 bg-[#0a1f4a]"
                          : "w-2 bg-[#0a1f4a]/25 hover:bg-[#0a1f4a]/50"
                      }`}
                    />
                  ))}
                </div>
              )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#101b36] px-6 py-12 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <a href="/#home" className="flex items-center gap-2.5">
            <img src="/logo-n-navy.png" alt="" className="h-9 w-9" />
            <span className="text-xl font-extrabold">NadhiLearn</span>
          </a>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/75">
            {navItems.map((item) => (
              <a key={item.id} href={`/#${item.id}`} className="hover:text-white">
                {item.label}
              </a>
            ))}
            <a href="/verify-certificates" className="hover:text-white">
              Verifikasi Sertifikat
            </a>
          </div>

          <p className="text-sm text-white/60">© 2026 NadhiLearn. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
