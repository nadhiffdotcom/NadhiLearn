
const courses = [
  {
    category: "Programming",
    title: "Full Stack Web Development",
    teacher: "Andi Pratama",
    lessons: "12 lessons",
  },
  {
    category: "Design",
    title: "UI/UX Design Masterclass",
    teacher: "Sarah Putri",
    lessons: "10 lessons",
  },
  {
    category: "Marketing",
    title: "Digital Marketing Strategy",
    teacher: "Budi Santoso",
    lessons: "8 lessons",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B1F3A] text-white">

      {/* NAVBAR STICKY */}
      <nav className="sticky top-0 z-50 w-full border-b border-[#0B1F3A] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          {/* LOGO */}
          <a
            href="/"
            className="text-xl font-bold tracking-tight text-[#0B1F3A]"
          >
            NadhiLearn.
          </a>

          {/* MENU */}
          <div className="hidden items-center gap-9 text-sm text-[#0B1F3A] md:flex">
            <a
              href="/"
              className="font-semibold underline underline-offset-8"
            >
              Home
            </a>

            <a href="#courses" className="hover:underline">
              Courses
            </a>

            <a href="#about" className="hover:underline">
              About
            </a>
          </div>

          {/* AUTH BUTTON */}
          <div className="flex items-center gap-5 text-sm font-semibold">
            <a
              href="/login"
              className="text-[#0B1F3A] hover:underline"
            >
              Login
            </a>

            <a
              href="/register"
              className="rounded-lg bg-[#0B1F3A] px-5 py-3 text-white hover:bg-white hover:text-[#0B1F3A] hover:outline hover:outline-1 hover:outline-[#0B1F3A]"
            >
              Sign up
            </a>
          </div>

        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-24 md:pb-32 md:pt-32">

        <div className="max-w-3xl">

          <p className="mb-7 text-xs font-semibold uppercase tracking-[0.2em]">
            Online Learning Platform
          </p>

          <h1 className="text-5xl leading-[1.12] font-semibold tracking-tight md:text-7xl">
            Learn something.
            <br />
            Become something.
          </h1>

          <p className="mt-8 max-w-xl text-base leading-8 md:text-lg">
            Kembangkan kemampuan dan raih tujuanmu melalui
            pengalaman belajar online yang lebih mudah dan fleksibel.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">

            <a
              href="#courses"
              className="rounded-lg bg-white px-7 py-4 text-sm font-semibold text-[#0B1F3A] hover:bg-[#0B1F3A] hover:text-white hover:outline hover:outline-1 hover:outline-white"
            >
              Explore courses
            </a>

            <a
              href="/register-teacher"
              className="text-sm font-semibold text-white underline underline-offset-4"
            >
              Become a teacher
            </a>

          </div>

        </div>

        {/* STATISTICS */}
        <div className="mt-20 grid grid-cols-3 gap-6 border-t border-white pt-8 md:max-w-2xl">

          <div>
            <p className="text-2xl font-semibold">100+</p>
            <p className="mt-2 text-xs">Learning materials</p>
          </div>

          <div>
            <p className="text-2xl font-semibold">20+</p>
            <p className="mt-2 text-xs">Expert teachers</p>
          </div>

          <div>
            <p className="text-2xl font-semibold">500+</p>
            <p className="mt-2 text-xs">Students</p>
          </div>

        </div>
      </section>

      {/* COURSES SECTION */}
      <section
        id="courses"
        className="border-t border-white"
      >

        <div className="mx-auto max-w-6xl px-6 py-24">

          {/* SECTION TITLE */}
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                Discover
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Popular courses
              </h2>

              <p className="mt-4 text-sm leading-7">
                Pilih kelas dan mulai perjalanan belajarmu.
              </p>
            </div>

            <a
              href="/courses"
              className="text-sm font-semibold underline underline-offset-4"
            >
              View all courses
            </a>

          </div>

          {/* COURSE CARDS */}
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">

            {courses.map((course, index) => (
              <article
                key={course.title}
                className="group"
              >

                {/* CARD VISUAL */}
                <div className="flex aspect-[5/3] items-center justify-center rounded-xl border border-white bg-[#0B1F3A] p-6 text-white">
                  <span className="text-5xl font-light">
                    0{index + 1}
                  </span>
                </div>

                {/* CARD CONTENT */}
                <div className="pt-6">

                  <p className="text-xs font-semibold uppercase tracking-widest">
                    {course.category}
                  </p>

                  <h3 className="mt-3 text-xl font-semibold leading-snug">
                    {course.title}
                  </h3>

                  <p className="mt-4 text-sm">
                    {course.teacher}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-white pt-4">

                    <span className="text-xs">
                      {course.lessons}
                    </span>

                    <a
                      href="/courses"
                      className="text-sm font-semibold underline underline-offset-4"
                    >
                      Learn more
                    </a>

                  </div>
                </div>

              </article>
            ))}

          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section
        id="about"
        className="border-t border-white"
      >

        <div className="mx-auto max-w-6xl px-6 py-24">

          <div className="max-w-2xl">

            <p className="text-xs font-semibold uppercase tracking-[0.2em]">
              About NadhiLearn
            </p>

            <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              A better way to learn, grow, and share knowledge.
            </h2>

            <p className="mt-6 text-base leading-8">
              NadhiLearn adalah platform pembelajaran digital yang
              mempertemukan siswa dan pengajar dalam satu ruang belajar.
              Temukan materi, ikuti kelas, dan pantau perkembangan belajarmu.
            </p>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white bg-white text-[#0B1F3A]">

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-9">

          <p className="text-lg font-bold">
            NadhiLearn.
          </p>

          <p className="text-xs">
            © 2026 NadhiLearn. All rights reserved.
          </p>

        </div>
      </footer>

    </main>
  );
}
