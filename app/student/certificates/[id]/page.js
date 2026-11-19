
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";

import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import PrintButton from "./PrintButton";

// ========================================
// HELPER: FORMAT TANGGAL
// ========================================
function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ========================================
// HELPER: VALIDASI STUDENT
// ========================================
async function getStudent() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nadhi_student_token")?.value;

  if (!token) redirect("/login");

  const student = await verifyToken(token);

  if (!student || student.role !== "student" || !student.id) {
    redirect("/login");
  }

  return student;
}

// ========================================
// MAIN PAGE
// ========================================
export default async function CertificatePage({ params }) {
  const { id } = await params;
  const certificateId = Number(id);

  if (!Number.isSafeInteger(certificateId) || certificateId <= 0) {
    notFound();
  }

  const student = await getStudent();

  // GET CERTIFICATE
  const result = await pool.query(
    `SELECT
       cert.id,
       cert.certificate_code,
       cert.student_name,
       cert.course_title,
       cert.issued_at
     FROM certificates cert
     JOIN enrollments e ON e.id = cert.enrollment_id
     WHERE cert.id = $1
       AND e.student_id = $2
     LIMIT 1`,
    [certificateId, student.id]
  );

  if (result.rows.length === 0) {
    notFound();
  }

  const certificate = result.rows[0];

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 md:px-8">

      {/* ACTION BUTTONS */}
      <div className="no-print mx-auto mb-6 flex max-w-5xl flex-col justify-between gap-3 sm:flex-row">

        <Link
          href="/student/my-courses"
          className="inline-flex items-center justify-center rounded-lg border border-[#0B1F3A] px-5 py-3 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-white"
        >
          ← Kembali ke My Courses
        </Link>

        <PrintButton />
      </div>

      {/* CERTIFICATE */}
      <div className="certificate-paper mx-auto aspect-[297/210] w-full max-w-5xl bg-white p-3 shadow-xl md:p-5">

        {/* OUTER NAVY BORDER */}
        <div className="flex h-full w-full items-center justify-center border-[3px] border-[#0B1F3A] p-1">

          {/* INNER BORDER */}
          <div className="flex h-full w-full flex-col items-center justify-between border border-[#0B1F3A] px-5 py-3 text-center text-[#0B1F3A] md:px-12 md:py-4">

            {/* LOGO AND BRAND */}
            <div className="flex items-center justify-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5 md:h-14 md:w-14">
                <img
                  src="/nadhilearn-logo.png"
                  alt="Logo NadhiLearn"
                  className="h-full w-full object-contain"
                />
              </div>

              <h2 className="text-xl font-bold tracking-wide text-[#0B1F3A] md:text-3xl">
                NadhiLearn
              </h2>

            </div>

            {/* CERTIFICATE TITLE */}
            <div className="mt-1">

              <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#0B1F3A] md:text-xs">
                Certificate of Completion
              </p>

              <h1 className="mt-1 text-2xl font-bold uppercase tracking-[0.15em] text-[#0B1F3A] md:text-4xl">
                Sertifikat
              </h1>

            </div>

            {/* STUDENT NAME */}
            <div className="mt-1 w-full">

              <p className="text-xs text-gray-600 md:text-sm">
                Dengan bangga diberikan kepada
              </p>

              <h2
                className="mt-1 text-4xl leading-tight text-[#0B1F3A] md:text-6xl"
                style={{ fontFamily: "'Great Vibes', cursive" }}
              >
                {certificate.student_name}
              </h2>

              <div className="mx-auto mt-1 h-px w-2/3 max-w-md bg-[#0B1F3A]" />

            </div>

            {/* COURSE DESCRIPTION */}
            <div className="mt-1">

              <p className="mx-auto max-w-2xl text-xs leading-6 text-gray-600 md:text-sm">
                Telah berhasil menyelesaikan seluruh materi pembelajaran
                pada course:
              </p>

              <h3 className="mt-1 text-lg font-bold text-[#0B1F3A] md:text-2xl">
                {certificate.course_title}
              </h3>

            </div>

            {/* ISSUE DATE */}
            <div className="mt-1">

              <p className="text-xs text-gray-600">
                Diterbitkan pada
              </p>

              <p className="mt-1 text-sm font-semibold text-[#0B1F3A] md:text-base">
                {formatDate(certificate.issued_at)}
              </p>

            </div>

            {/* SIGNATURE */}
            <div className="mt-1 flex flex-col items-center">
            {/* Area tanda tangan dan nama */}
            <div className="relative flex h-20 w-64 items-end justify-center md:h-24 md:w-72">
                <img
                src="/nadhilearn-signature.png"
                alt="Tanda tangan Alisya Nadhifa Raihani"
                className="absolute bottom-[-52px] z-10 h-32 w-48 object-contain md:bottom-[-56px] md:h-40 md:w-56"
                />

                {/* Nama di bawah tanda tangan */}
                <p className="relative z-0 text-xs font-bold text-[#0B1F3A] md:text-sm">
                Alisya Nadhifa Raihani
                </p>
            </div>

            {/* Garis di bawah nama */}
            <div className="w-52 border-t border-[#0B1F3A] md:w-60" />

            <p className="mt-1 text-[10px] text-gray-600 md:text-xs">
                Administrator
            </p>
            </div>

            {/* CERTIFICATE ID */}
            <div className="mt-1 border-t border-gray-200 pt-1">

              <p className="text-[8px] text-gray-400 md:text-[9px]">
                Certificate ID
              </p>

              <p className="mt-0.5 break-all font-mono text-[8px] tracking-wide text-gray-500 md:text-[9px]">
                {certificate.certificate_code}
              </p>

            </div>

          </div>
          {/* END INNER BORDER */}

        </div>
        {/* END OUTER NAVY BORDER */}

      </div>
      {/* END CERTIFICATE */}

      {/* INFORMATION */}
      <p className="no-print mt-5 text-center text-xs text-gray-500">
        Gunakan tombol Cetak / Simpan PDF untuk menyimpan sertifikat.
      </p>

      {/* PRINT STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          html,
          body {
            width: 297mm;
            height: 210mm;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .certificate-paper {
            width: 297mm !important;
            height: 210mm !important;
            max-width: none !important;
            min-height: 0 !important;
            aspect-ratio: auto !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: white !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

    </div>
  );
}
