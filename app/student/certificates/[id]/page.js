
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";

import pool from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import PrintButton from "./PrintButton";

function formatDate(date) {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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

export default async function CertificatePage({ params }) {
  const { id } = await params;
  const certificateId = Number(id);

  if (!Number.isSafeInteger(certificateId) || certificateId <= 0) {
    notFound();
  }

  const student = await getStudent();

  const result = await pool.query(
  `SELECT
     cert.id,
     cert.certificate_code,
     COALESCE(
       NULLIF(BTRIM(u.display_name), ''),
       'Nama belum diatur'
     ) AS student_name,
     c.title AS course_title,
     cert.issued_at
   FROM certificates cert
   JOIN enrollments e
     ON e.id = cert.enrollment_id
   JOIN users u
     ON u.id = e.student_id
   JOIN courses c
     ON c.id = e.course_id
   WHERE cert.id = $1
     AND e.student_id = $2
   LIMIT 1`,
  [certificateId, student.id]
);

  if (result.rows.length === 0) {
    notFound();
  }

  const certificate = result.rows[0];

  const verificationUrl = `/verify-certificate?code=${encodeURIComponent(
    certificate.certificate_code
  )}`;

  return (
    <div className="certificate-page min-h-screen bg-gray-100 px-3 py-5 sm:px-4 sm:py-8 md:px-8">
      <div className="no-print mx-auto mb-6 flex max-w-5xl flex-col justify-between gap-3 sm:flex-row">
        <Link
          href="/student/my-courses"
          className="inline-flex items-center justify-center rounded-lg border border-[#0B1F3A] px-5 py-3 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-white"
        >
          ← Kembali ke My Courses
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={verificationUrl}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#0B1F3A] bg-white px-5 py-3 text-sm font-semibold text-[#0B1F3A] transition hover:bg-gray-100"
          >
            <span>✓</span>
            Verifikasi Sertifikat
          </Link>

          <PrintButton />
        </div>
      </div>

      <div className="certificate-paper mx-auto aspect-auto min-h-[720px] w-full max-w-5xl bg-white p-1 shadow-xl sm:p-2 md:aspect-[297/210] md:min-h-0 md:p-5">
        <div className="flex min-h-[700px] h-full w-full items-center justify-center border-[3px] border-[#0B1F3A] p-1 md:min-h-0">
          <div className="flex min-h-[680px] h-full w-full flex-col items-center justify-between border border-[#0B1F3A] px-2 py-4 text-center text-[#0B1F3A] sm:px-4 sm:py-5 md:min-h-0 md:px-12 md:py-4">
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5 sm:h-10 sm:w-10 md:h-14 md:w-14">
                <img
                  src="/nadhilearn-logo.png"
                  alt="Logo NadhiLearn"
                  className="h-full w-full object-contain"
                />
              </div>

              <h2 className="text-lg font-bold tracking-wide text-[#0B1F3A] sm:text-xl md:text-3xl">
                NadhiLearn
              </h2>
            </div>

            <div className="mt-2">
              <p className="text-[8px] font-semibold uppercase tracking-[0.25em] text-[#0B1F3A] sm:text-[9px] sm:tracking-[0.35em] md:text-xs">
                Certificate of Completion
              </p>

              <h1 className="mt-1 text-xl font-bold uppercase tracking-[0.15em] text-[#0B1F3A] sm:text-2xl md:text-4xl">
                Sertifikat
              </h1>
            </div>

            <div className="mt-3 w-full">
              <p className="text-xs text-gray-600 sm:text-sm">
                Dengan bangga diberikan kepada
              </p>

              <h2
                className="mt-4 text-4xl leading-tight text-[#0B1F3A] sm:text-5xl md:text-7xl"
                style={{ fontFamily: "'Great Vibes', cursive" }}
              >
                {certificate.student_name}
              </h2>

              <div className="mx-auto mt-2 h-px w-2/3 max-w-md bg-[#0B1F3A]" />
            </div>

            <div className="mt-3 w-full">
              <p className="mx-auto max-w-2xl text-xs leading-5 text-gray-600 sm:text-sm sm:leading-6">
                Telah berhasil menyelesaikan seluruh materi pembelajaran
                pada course:
              </p>

              <h3 className="mt-2 break-words text-base font-bold text-[#0B1F3A] sm:text-lg md:text-2xl">
                {certificate.course_title}
              </h3>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-600">Diterbitkan pada</p>

              <p className="mt-1 text-sm font-semibold text-[#0B1F3A] sm:text-base">
                {formatDate(certificate.issued_at)}
              </p>
            </div>

            <div className="mt-3 flex flex-col items-center">
              <div className="relative flex h-20 w-64 items-end justify-center sm:w-72 md:h-24">
                <img
                  src="/nadhilearn-signature.png"
                  alt="Tanda tangan Alisya Nadhifa Raihani"
                  className="absolute bottom-[-60px] z-10 h-32 w-48 object-contain md:bottom-[-64px] md:h-40 md:w-56"
                />
              </div>

              <div className="w-52 border-t border-[#0B1F3A] sm:w-60" />

              <p className="mt-1 text-xs font-bold text-[#0B1F3A] sm:text-sm">
                Alisya Nadhifa Raihani
              </p>

              <p className="mt-0.5 text-[10px] text-gray-600 sm:text-xs">
                Administrator
              </p>
            </div>

            <div className="mt-3 w-full border-t border-gray-200 pt-2">
              <p className="text-[8px] text-gray-400 sm:text-[9px]">
                Certificate ID
              </p>

              <p className="mt-1 break-all font-mono text-[8px] tracking-wide text-gray-500 sm:text-[9px]">
                {certificate.certificate_code}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="no-print mt-5 text-center text-xs text-gray-500">
        Gunakan tombol Cetak / Simpan PDF untuk menyimpan sertifikat.
      </p>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

       
            @media print {
            @page {
                size: 297mm 210mm;
                margin: 0;
            }

            *,
            *::before,
            *::after {
                box-sizing: border-box !important;
            }

            html,
            body {
                display: block !important;
                width: 297mm !important;
                height: 210mm !important;
                min-height: 0 !important;
                max-height: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            /* Ratakan wrapper aplikasi yang menjadi induk sertifikat */
            body *:has(.certificate-page) {
                display: contents !important;
            }

            /* Sembunyikan elemen lain di luar sertifikat */
            body *:not(:has(.certificate-page)):not(.certificate-page):not(.certificate-page *) {
                display: none !important;
            }

            /* Hilangkan tombol */
            .no-print {
                display: none !important;
            }

            /* Area sertifikat */
            .certificate-page {
                position: relative !important;
                display: block !important;
                width: 297mm !important;
                height: 210mm !important;
                min-height: 0 !important;
                max-height: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: white !important;
                break-after: avoid !important;
                page-break-after: avoid !important;
            }

            /* Kertas sertifikat */
            .certificate-paper {
                position: relative !important;
                display: block !important;
                width: 297mm !important;
                height: 210mm !important;
                min-height: 0 !important;
                max-height: 210mm !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 5mm !important;
                aspect-ratio: auto !important;
                overflow: hidden !important;
                background: white !important;
                box-shadow: none !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }

            /* Border luar */
            .certificate-paper > div {
                display: flex !important;
                width: 100% !important;
                height: 100% !important;
                min-height: 0 !important;
                max-height: 100% !important;
                padding: 1mm !important;
                overflow: hidden !important;
            }

            /* Border dalam */
            .certificate-paper > div > div {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: space-between !important;
                width: 100% !important;
                height: 100% !important;
                min-height: 0 !important;
                max-height: 100% !important;
                padding: 3mm 10mm !important;
                gap: 0 !important;
                overflow: hidden !important;
            }

            .certificate-paper > div > div > * {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                flex-shrink: 1 !important;
            }

            /* Logo */
            .certificate-paper img[alt="Logo NadhiLearn"] {
                width: 12mm !important;
                height: 12mm !important;
            }

            /* Nama student */
            .certificate-paper h2 {
                line-height: 1.1 !important;
            }

            /* Tanda tangan */
            .certificate-paper img[alt^="Tanda tangan"] {
                bottom: -8mm !important;
                height: 30mm !important;
                width: 45mm !important;
            }

            /* Nama course */
            .certificate-paper h3 {
                margin-top: 1mm !important;
            }

            /* Certificate ID */
            .certificate-paper > div > div > div:last-child {
                padding-top: 1mm !important;
            }
            }

      `}</style>
    </div>
  );
}
