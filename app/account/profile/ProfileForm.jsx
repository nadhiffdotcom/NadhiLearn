
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, warmProfileCache } from "@/lib/auth-client";

const ROLE_LABEL = { admin: "Admin", teacher: "Teacher", student: "Student" };

// Lencana peran di atas kartu identitas yang berlatar navy.
const ROLE_BADGE = {
  admin: "bg-white text-[#0a1f4a]",
  teacher: "bg-[#FFC857] text-[#3d2a00]",
  student: "bg-white/15 text-white",
};

const inputClass =
  "w-full rounded-xl border border-[#ced7e8] bg-white px-4 py-3 text-[#101b36] outline-none transition placeholder:text-[#8793ac] focus:border-[#0a1f4a] focus:ring-2 focus:ring-[#0a1f4a]/20";

const primaryButton =
  "inline-flex items-center justify-center rounded-full bg-[#0a1f4a] px-7 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(10,31,74,0.7)] transition hover:bg-[#1b3a7a] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base";

const secondaryButton =
  "inline-flex items-center justify-center rounded-full border border-[#ced7e8] bg-white px-5 py-2.5 text-sm font-bold text-[#101b36] transition hover:border-[#0a1f4a] hover:text-[#0a1f4a] disabled:cursor-not-allowed disabled:opacity-60";

const cardClass =
  "rounded-3xl border border-[#dce3ef] bg-white p-6 md:p-8";

// Inisial untuk avatar; gelar seperti "Ir." atau "S.Kom." tidak ikut dihitung.
function getInitials(value) {
  const tokens = String(value || "").trim().split(/\s+/).filter(Boolean);
  const words = tokens.filter((token) => !/\.,?$/.test(token));
  const use = words.length > 0 ? words : tokens;

  if (use.length === 0) return "?";

  return (use[0][0] + (use[1]?.[0] || "")).toUpperCase();
}

function clampPercent(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(100, Math.max(0, Math.round(number)))
    : 0;
}

function sumBy(list, key) {
  return list.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function SkeletonLines() {
  return (
    <div className="space-y-3" aria-busy="true">
      <div className="h-16 animate-pulse rounded-2xl bg-[#e7edf7]" />
      <div className="h-16 animate-pulse rounded-2xl bg-[#e7edf7]" />
    </div>
  );
}

function ProgressBar({ value, label }) {
  const percent = clampPercent(value);

  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-[#e7edf7]"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className={`h-full rounded-full ${
          percent >= 100 ? "bg-[#1FA67A]" : "bg-[#0a1f4a]"
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-extrabold text-[#101b36] md:text-xl">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm leading-relaxed text-[#56627c]">
          {description}
        </p>
      )}
    </div>
  );
}

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-[#101b36]"
      >
        {label}
      </label>

      {children}

      {hint}
    </div>
  );
}

function Hint({ tone = "muted", children }) {
  const color =
    tone === "good"
      ? "text-[#17794f]"
      : tone === "bad"
        ? "text-red-600"
        : "text-[#56627c]";

  return (
    <p className={`mt-2 text-xs ${color}`} role="status">
      {children}
    </p>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  minLength,
  required,
  placeholder,
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        className={`${inputClass} pr-28`}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        placeholder={placeholder}
      />

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={show}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-xs font-bold text-[#0a1f4a] transition hover:bg-[#e7edf7]"
      >
        {show ? "Sembunyikan" : "Tampilkan"}
      </button>
    </div>
  );
}

export default function ProfileForm({
  user,
  overview = {},
  overviewLoading = false,
  overviewError = "",
}) {
  const router = useRouter();

  const [username, setUsername] = useState(user.username);
  const [name, setName] = useState(
    user.display_name || user.username
  );
  const [email, setEmail] = useState(user.email);

  // Data yang sudah tersimpan (dipakai kartu identitas di bagian atas)
  const [saved, setSaved] = useState({
    name: user.display_name || user.username,
    email: user.email,
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // State untuk tampil/sembunyikan password
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // State hapus akun
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Tab: "akun" atau "belajar"
  const [tab, setTab] = useState("akun");

  const studentCourses = overview.courses || [];
  const teacherCourses = overview.courses || [];
  const teacherStudents = overview.students || [];

  const hasLearningTab = ["student", "teacher"].includes(user.role);
  const activeTab = hasLearningTab ? tab : "akun";
  const overviewReady = !overviewLoading && !overviewError;

  // Jendela notifikasi 24 jam dihitung di server berdasarkan approved_at.
  const showTeacherWelcome =
    user.role === "teacher" && user.showTeacherWelcome === true;

  // Ringkasan angka di kartu identitas (dihitung dari data course)
  let stats = [];

  if (user.role === "student") {
    const average = studentCourses.length
      ? Math.round(sumBy(studentCourses, "progress") / studentCourses.length)
      : 0;

    stats = [
      { label: "Course diikuti", value: studentCourses.length },
      { label: "Materi selesai", value: sumBy(studentCourses, "completed_contents") },
      { label: "Rata-rata progres", value: `${average}%` },
    ];
  } else if (user.role === "teacher") {
    stats = [
      { label: "Course dikelola", value: teacherCourses.length },
      { label: "Total siswa", value: sumBy(teacherCourses, "total_students") },
      { label: "Siswa selesai", value: sumBy(teacherCourses, "completed_students") },
    ];
  }

  const tabs = [
    { id: "akun", label: "Akun", count: null },
    {
      id: "belajar",
      label: user.role === "teacher" ? "Course & siswa" : "Course saya",
      count: overviewReady ? teacherCourses.length : null,
    },
  ];

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    if (!name.trim()) {
      setMessage("Name wajib diisi.");
      return;
    }

    if (name.trim().length > 100) {
      setMessage("Name maksimal 100 karakter.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setMessage("Konfirmasi password baru tidak cocok.");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setMessage("Password baru minimal 8 karakter.");
      return;
    }

    setLoading(true);

    try {
      const response = await authFetch("/api/account/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          display_name: name.trim(),
          email,
          currentPassword,
          newPassword,
        }),
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Respons API profil bukan JSON:", {
          status: response.status,
          response: text.slice(0, 500),
        });

        setMessage("Server mengirim respons yang tidak valid.");
        return;
      }

      if (!response.ok) {
        setMessage(data.message || "Gagal memperbarui akun.");
        return;
      }

      setSuccess(true);
      setMessage(data.message || "Pengaturan akun berhasil diperbarui.");

      setUsername(data.user.username);
      setName(data.user.display_name || data.user.username);
      setEmail(data.user.email);

      setSaved({
        name: data.user.display_name || data.user.username,
        email: data.user.email,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Perbarui cache di latar belakang agar Settings tetap akurat.
      warmProfileCache({ force: true });
    } catch (error) {
      console.error("Update profile error:", error);
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  // Membatalkan penghapusan akun
  function handleCancelDelete() {
    setShowDeleteForm(false);
    setDeletePassword("");
    setDeleteMessage("");
    setShowDeletePassword(false);
  }

  // Menghapus akun sendiri
  async function handleDeleteAccount(event) {
    event.preventDefault();

    setDeleteMessage("");

    if (!deletePassword.trim()) {
      setDeleteMessage("Masukkan password untuk menghapus akun.");
      return;
    }

    const confirmed = window.confirm(
      "Apakah kamu benar-benar yakin ingin menghapus akun NadhiLearn? Tindakan ini tidak dapat dibatalkan."
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await authFetch("/api/account/profile", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: deletePassword,
        }),
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        console.error("Respons API hapus akun bukan JSON:", {
          status: response.status,
          response: text.slice(0, 500),
        });

        setDeleteMessage("Server mengirim respons yang tidak valid.");
        return;
      }

      if (!response.ok) {
        setDeleteMessage(
          data.message || "Gagal menghapus akun."
        );
        return;
      }

      // Bersihkan token login dari tab aktif
      sessionStorage.removeItem("nadhi_token");
      sessionStorage.removeItem("nadhi_profile");

      // Arahkan pengguna ke halaman Login
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Delete account error:", error);
      setDeleteMessage("Tidak dapat terhubung ke server.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* NOTIFIKASI PENGAJUAN TEACHER (menunggu) */}
      {user.role === "student" && user.teacherStatus === "pending" && (
        <div
          className="flex gap-4 rounded-2xl border border-[#FFC857] bg-[#FFF8E5] p-5 text-[#5c4300]"
          role="status"
        >
          <span
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#FFB020]"
            aria-hidden="true"
          />

          <div>
            <h2 className="font-extrabold">
              Pengajuan Teacher sedang ditinjau
            </h2>

            <p className="mt-1 text-sm leading-relaxed">
              Pendaftaran Teacher kamu berhasil. Saat ini pengajuan
              sedang menunggu persetujuan Admin NadhiLearn.
              Kamu akan mendapatkan akses Teacher setelah disetujui.
            </p>
          </div>
        </div>
      )}

      {/* NOTIFIKASI PENGAJUAN TEACHER (disetujui) */}
      {showTeacherWelcome && (
        <div
          className="flex gap-4 rounded-2xl border border-[#7ED9A0] bg-[#E9F8EF] p-5 text-[#165a3a]"
          role="status"
        >
          <span
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1FA67A]"
            aria-hidden="true"
          />

          <div>
            <h2 className="font-extrabold">
              Selamat! Pengajuan Teacher disetujui
            </h2>

            <p className="mt-1 text-sm leading-relaxed">
              Selamat datang sebagai Teacher NadhiLearn.
              Sekarang kamu dapat membuat dan mengelola course
              serta memantau perkembangan belajar siswa.
            </p>
          </div>
        </div>
      )}

      {/* KARTU IDENTITAS */}
      <section className="rounded-3xl bg-gradient-to-br from-[#0a1f4a] to-[#1b3a7a] p-6 text-white md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-5">
            <div className="relative shrink-0">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] bg-white text-3xl font-extrabold text-[#0a1f4a]"
                aria-hidden="true"
              >
                {getInitials(saved.name)}
              </div>

              <span
                className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-[#FFC857] ring-4 ring-[#0a1f4a]"
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-xl font-extrabold md:text-2xl">
                {saved.name}
              </h2>

              <p className="mt-1 break-all text-sm text-white/70">
                {saved.email}
              </p>

              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                  ROLE_BADGE[user.role] || ROLE_BADGE.student
                }`}
              >
                {ROLE_LABEL[user.role] || user.role}
              </span>
            </div>
          </div>

          {stats.length > 0 && (
            <dl className="grid grid-cols-3 gap-4 border-t border-white/15 pt-5 md:flex md:shrink-0 md:gap-0 md:border-t-0 md:pt-0">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`flex min-w-0 flex-col-reverse justify-end md:px-6 ${
                    index > 0 ? "md:border-l md:border-white/15" : ""
                  }`}
                >
                  <dt className="mt-1 text-xs text-white/70 sm:text-sm md:whitespace-nowrap">
                    {stat.label}
                  </dt>

                  <dd className="text-2xl font-extrabold">
                    {overviewLoading ? (
                      <span className="inline-block h-7 w-10 animate-pulse rounded bg-white/20" />
                    ) : overviewError ? (
                      "–"
                    ) : (
                      stat.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* TAB */}
      {hasLearningTab && (
        <div
          role="tablist"
          aria-label="Bagian pengaturan"
          className="inline-flex max-w-full overflow-x-auto rounded-full border border-[#dce3ef] bg-white p-1"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={activeTab === item.id}
              aria-controls={`panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition ${
                activeTab === item.id
                  ? "bg-[#0a1f4a] text-white"
                  : "text-[#56627c] hover:text-[#0a1f4a]"
              }`}
            >
              {item.label}

              {item.count !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === item.id
                      ? "bg-white/20 text-white"
                      : "bg-[#e7edf7] text-[#0a1f4a]"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ============ TAB AKUN ============ */}
      {activeTab === "akun" && (
        <div
          role={hasLearningTab ? "tabpanel" : undefined}
          id="panel-akun"
          aria-labelledby={hasLearningTab ? "tab-akun" : undefined}
          className="space-y-6"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* INFORMASI AKUN */}
            <section className={cardClass}>
              <SectionHeading
                title="Informasi akun"
                description="Perbarui nama, username, dan email yang kamu pakai di NadhiLearn."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Field id="profile-name" label="Nama lengkap">
                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className={inputClass}
                      maxLength={100}
                      placeholder="Masukkan nama lengkap"
                      required
                    />
                  </Field>
                </div>

                <Field
                  id="profile-username"
                  label="Username"
                  hint={<Hint>3 sampai 50 karakter.</Hint>}
                >
                  <input
                    id="profile-username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={inputClass}
                    minLength={3}
                    maxLength={50}
                    required
                  />
                </Field>

                <Field id="profile-email" label="Email">
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                    required
                  />
                </Field>
              </div>
            </section>

            {/* GANTI PASSWORD */}
            <section className={cardClass}>
              <SectionHeading
                title="Ganti password"
                description="Opsional. Kosongkan kedua kolom jika tidak ingin mengganti password."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  id="new-password"
                  label="Password baru"
                  hint={
                    newPassword ? (
                      newPassword.length >= 8 ? (
                        <Hint tone="good">Panjang password sudah cukup.</Hint>
                      ) : (
                        <Hint tone="bad">
                          Minimal 8 karakter ({newPassword.length}/8).
                        </Hint>
                      )
                    ) : (
                      <Hint>Minimal 8 karakter.</Hint>
                    )
                  }
                >
                  <PasswordField
                    id="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    show={showNewPassword}
                    onToggle={() => setShowNewPassword((prev) => !prev)}
                    autoComplete="new-password"
                    minLength={8}
                  />
                </Field>

                <Field
                  id="confirm-password"
                  label="Konfirmasi password baru"
                  hint={
                    confirmPassword && newPassword ? (
                      confirmPassword === newPassword ? (
                        <Hint tone="good">Password cocok.</Hint>
                      ) : (
                        <Hint tone="bad">Password belum cocok.</Hint>
                      )
                    ) : null
                  }
                >
                  <PasswordField
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    show={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((prev) => !prev)}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            </section>

            {/* KONFIRMASI & SIMPAN */}
            <section className="rounded-3xl bg-[#e7edf7] p-6 md:p-8">
              <SectionHeading
                title="Konfirmasi perubahan"
                description="Masukkan password saat ini. Ini dibutuhkan setiap kali kamu menyimpan perubahan, termasuk saat hanya mengubah nama atau email."
              />

              {message && (
                <div
                  role={success ? "status" : "alert"}
                  className={`mb-5 rounded-2xl border p-4 text-sm font-semibold ${
                    success
                      ? "border-[#7ED9A0] bg-[#E9F8EF] text-[#165a3a]"
                      : "border-red-300 bg-red-50 text-red-800"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
                <Field id="current-password" label="Password saat ini">
                  <PasswordField
                    id="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    show={showCurrentPassword}
                    onToggle={() => setShowCurrentPassword((prev) => !prev)}
                    autoComplete="current-password"
                    required
                  />
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className={primaryButton}
                >
                  {loading ? "Menyimpan..." : "Simpan perubahan"}
                </button>
              </div>
            </section>
          </form>
        </div>
      )}

      {/* ============ TAB BELAJAR: STUDENT ============ */}
      {activeTab === "belajar" && user.role === "student" && (
        <div
          role="tabpanel"
          id="panel-belajar"
          aria-labelledby="tab-belajar"
          className="space-y-6"
        >
          <section className={cardClass}>
            <SectionHeading
              title="Course saya"
              description="Pantau progres belajar di setiap course yang kamu ikuti."
            />

            {overviewLoading ? (
              <SkeletonLines />
            ) : overviewError ? (
              <p className="text-sm text-red-600">{overviewError}</p>
            ) : studentCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#c2cce0] bg-[#f4f7fc] p-8 text-center">
                <p className="font-bold">
                  Kamu belum mengikuti course apa pun.
                </p>

                <p className="mt-1 text-sm text-[#56627c]">
                  Pilih course pertamamu, lalu progres belajarmu akan
                  muncul di sini.
                </p>

                <a href="/#courses" className={`${primaryButton} mt-5`}>
                  Jelajahi course
                </a>
              </div>
            ) : (
              <ul className="space-y-4">
                {studentCourses.map((course) => {
                  const percent = clampPercent(course.progress);

                  return (
                    <li
                      key={course.enrollment_id}
                      className="flex flex-col gap-4 rounded-2xl border border-[#dce3ef] p-4 sm:flex-row sm:items-center"
                    >
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="h-28 w-full shrink-0 rounded-xl object-cover sm:h-20 sm:w-32"
                        />
                      ) : (
                        <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl bg-[#e7edf7] text-2xl font-extrabold text-[#0a1f4a] sm:h-20 sm:w-32">
                          {getInitials(course.title)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-extrabold">{course.title}</h3>

                          <span className="shrink-0 text-sm font-extrabold">
                            {percent}%
                          </span>
                        </div>

                        <div className="mt-3">
                          <ProgressBar
                            value={percent}
                            label={`Progres ${course.title}`}
                          />
                        </div>

                        <p className="mt-2 text-xs text-[#56627c]">
                          {course.completed_contents} dari{" "}
                          {course.total_contents} materi selesai.
                        </p>
                      </div>

                      <a
                        href={`/student/courses/${course.course_id}`}
                        className={`${secondaryButton} shrink-0 sm:w-44`}
                      >
                        {percent >= 100 ? "Lihat course" : "Lanjutkan belajar"}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ============ TAB BELAJAR: TEACHER ============ */}
      {activeTab === "belajar" && user.role === "teacher" && (
        <div
          role="tabpanel"
          id="panel-belajar"
          aria-labelledby="tab-belajar"
          className="space-y-6"
        >
          <section className={cardClass}>
            <SectionHeading
              title="Course yang saya kelola"
              description="Jumlah siswa dan siswa yang sudah menyelesaikan tiap course."
            />

            {overviewLoading ? (
              <SkeletonLines />
            ) : overviewError ? (
              <p className="text-sm text-red-600">{overviewError}</p>
            ) : teacherCourses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#c2cce0] bg-[#f4f7fc] p-8 text-center">
                <p className="font-bold">Kamu belum membuat course.</p>

                <p className="mt-1 text-sm text-[#56627c]">
                  Buat course pertamamu, lalu jumlah siswa akan
                  muncul di sini.
                </p>

                <a href="/teacher/courses" className={`${primaryButton} mt-5`}>
                  Kelola course
                </a>
              </div>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {teacherCourses.map((course) => (
                  <li
                    key={course.course_id}
                    className="flex flex-col rounded-2xl border border-[#dce3ef] p-5"
                  >
                    <h3 className="font-extrabold">{course.course_title}</h3>

                    <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
                      <div className="rounded-xl bg-[#f4f7fc] p-3">
                        <p className="text-xs text-[#56627c]">Total siswa</p>
                        <p className="mt-1 text-xl font-extrabold">
                          {course.total_students}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#f4f7fc] p-3">
                        <p className="text-xs text-[#56627c]">Siswa selesai</p>
                        <p className="mt-1 text-xl font-extrabold text-[#17794f]">
                          {course.completed_students}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={cardClass}>
            <SectionHeading
              title="Progress siswa"
              description="Perkembangan belajar siswa di course yang kamu kelola."
            />

            {overviewLoading ? (
              <SkeletonLines />
            ) : overviewError ? (
              <p className="text-sm text-red-600">{overviewError}</p>
            ) : teacherStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#c2cce0] bg-[#f4f7fc] p-8 text-center">
                <p className="font-bold">
                  Belum ada siswa yang mengikuti course kamu.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {teacherStudents.map((student) => {
                  const percent = clampPercent(student.progress);

                  return (
                    <li
                      key={student.enrollment_id}
                      className="rounded-2xl border border-[#dce3ef] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7edf7] text-sm font-extrabold text-[#0a1f4a]"
                          aria-hidden="true"
                        >
                          {getInitials(student.student_name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-extrabold">
                                {student.student_name}
                              </p>

                              <p className="break-all text-xs text-[#56627c]">
                                {student.student_email}
                              </p>
                            </div>

                            <span className="shrink-0 text-sm font-extrabold">
                              {percent}%
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold">
                            {student.course_title}
                          </p>

                          <div className="mt-2">
                            <ProgressBar
                              value={percent}
                              label={`Progres ${student.student_name}`}
                            />
                          </div>

                          <p className="mt-2 text-xs text-[#56627c]">
                            {student.completed_contents} dari{" "}
                            {student.total_contents} materi selesai.
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <a
              href="/teacher/student-progress"
              className={`${secondaryButton} mt-6`}
            >
              Lihat semua progress siswa
            </a>
          </section>
        </div>
      )}

      {/* HAPUS AKUN (selalu tampil di semua tab) */}
      {["student", "teacher"].includes(user.role) && (
        <section className="rounded-3xl border border-red-200 bg-white p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-lg font-extrabold text-red-700 md:text-xl">
                Hapus akun
              </h2>

              <p className="mt-1 text-sm leading-relaxed text-[#56627c]">
                Penghapusan akun bersifat permanen dan tidak dapat
                dibatalkan. Pastikan kamu sudah mempertimbangkan
                keputusan ini.
              </p>
            </div>

            {!showDeleteForm && (
              <button
                type="button"
                onClick={() => {
                  setDeleteMessage("");
                  setShowDeleteForm(true);
                }}
                className="shrink-0 rounded-full border border-red-300 px-5 py-2.5 text-sm font-bold text-red-700 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
              >
                Hapus akun saya
              </button>
            )}
          </div>

          {user.role === "teacher" && (
            <p className="mt-5 rounded-2xl bg-[#FFF8E5] p-4 text-sm leading-relaxed text-[#5c4300]">
              Sebagai Teacher, kamu hanya dapat menghapus akun
              setelah tidak memiliki course yang dikelola.
              Course harus dipindahkan atau dihapus terlebih dahulu.
            </p>
          )}

          {showDeleteForm && (
            <form onSubmit={handleDeleteAccount} className="mt-6">
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800">
                <p className="font-bold">
                  Apakah kamu yakin ingin menghapus akun?
                </p>

                <p className="mt-2">
                  {user.role === "student"
                    ? "Akun, riwayat enrollment, progres belajar, dan komentar milikmu akan dihapus secara permanen."
                    : "Akun dan komentar milikmu akan dihapus. Penghapusan hanya bisa dilakukan jika kamu sudah tidak memiliki course."}
                </p>
              </div>

              <Field
                id="delete-password"
                label="Masukkan password saat ini"
              >
                <PasswordField
                  id="delete-password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  show={showDeletePassword}
                  onToggle={() => setShowDeletePassword((prev) => !prev)}
                  autoComplete="current-password"
                  placeholder="Masukkan password untuk konfirmasi"
                  required
                />
              </Field>

              {deleteMessage && (
                <div
                  role="alert"
                  className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800"
                >
                  {deleteMessage}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={deleting}
                  className="inline-flex items-center justify-center rounded-full bg-red-600 px-7 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? "Menghapus akun..." : "Ya, hapus akun"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  className={secondaryButton}
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
