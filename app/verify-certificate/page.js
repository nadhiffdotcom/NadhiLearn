
import Link from "next/link";
import pool from "@/lib/db";

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
// MAIN PAGE
// ========================================
export default async function VerifyCertificatePage({ searchParams }) {
  const params = await searchParams;
  const code = (params?.code || "").trim();

  let certificate = null;
  let searched = false;

  // ========================================
  // CEK SERTIFIKAT
  // ========================================
  if (code) {
    searched = true;

    const result = await pool.query(
      `SELECT
         certificate_code,
         student_name,
         course_title,
         issued_at
       FROM certificates
       WHERE UPPER(certificate_code) = UPPER($1)
       LIMIT 1`,
      [code]
    );

    certificate = result.rows[0] || null;
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10 sm:px-6">

      <div className="mx-auto max-w-3xl">

        {/* HEADER */}
        <div className="mb-8 text-center">

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2"
          >
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-transparent">
            <img
                src="/nadhilearn-logo.png"
                alt="Logo NadhiLearn"
                className="h-full w-full object-contain"
            />
            </div>

            <span className="text-2xl font-bold text-[#0B1F3A]">
              NadhiLearn
            </span>
          </Link>

          <h1 className="mt-8 text-2xl font-bold text-[#0B1F3A] sm:text-3xl">
            Verifikasi Sertifikat
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500 sm:text-base">
            Periksa keaslian sertifikat pembelajaran NadhiLearn
            menggunakan Certificate ID.
          </p>

        </div>

        {/* SEARCH FORM */}
        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">

          <form
            action="/verify-certificate"
            method="GET"
            className="space-y-4"
          >

            <label
              htmlFor="code"
              className="block text-sm font-semibold text-[#0B1F3A]"
            >
              Certificate ID
            </label>

            <input
              id="code"
              name="code"
              type="text"
              defaultValue={code}
              placeholder="Contoh: NDH-TEST-HAI-001"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#0B1F3A] focus:ring-2 focus:ring-[#0B1F3A]/10"
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-[#0B1F3A] px-5 py-3 font-semibold text-white transition hover:bg-[#18395F]"
            >
              Verifikasi Sertifikat
            </button>

          </form>

          {/* INITIAL MESSAGE */}
          {!searched && (
            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">
                Masukkan Certificate ID untuk memeriksa
                keaslian sertifikat.
              </p>
            </div>
          )}

          {/* VALID CERTIFICATE */}
          {searched && certificate && (
            <div className="mt-8 overflow-hidden rounded-xl border border-green-200">

              <div className="flex items-center gap-3 bg-green-50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <span className="text-xl text-green-700">✓</span>
                </div>

                <div>
                  <h2 className="font-bold text-green-800">
                    Sertifikat Valid
                  </h2>
                  <p className="text-xs text-green-700">
                    Sertifikat terdaftar di database NadhiLearn.
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-5 sm:p-6">

                <div>
                  <p className="text-xs text-gray-500">
                    Nama Siswa
                  </p>
                  <p className="mt-1 font-semibold text-[#0B1F3A]">
                    {certificate.student_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Course
                  </p>
                  <p className="mt-1 font-semibold text-[#0B1F3A]">
                    {certificate.course_title}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Certificate ID
                  </p>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-[#0B1F3A]">
                    {certificate.certificate_code}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Tanggal Penerbitan
                  </p>
                  <p className="mt-1 font-semibold text-[#0B1F3A]">
                    {formatDate(certificate.issued_at)}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* INVALID CERTIFICATE */}
          {searched && !certificate && (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <span className="text-xl font-bold text-red-700">
                    !
                  </span>
                </div>

                <div>
                  <h2 className="font-bold text-red-800">
                    Sertifikat Tidak Ditemukan
                  </h2>

                  <p className="mt-1 text-sm text-red-700">
                    Certificate ID yang dimasukkan tidak terdaftar
                    di database NadhiLearn.
                  </p>
                </div>

              </div>

              <p className="mt-4 break-all text-xs text-red-700">
                ID yang diperiksa: {code}
              </p>

            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="mt-8 text-center">

          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} NadhiLearn.
            All rights reserved.
          </p>

          <Link
            href="/"
            className="mt-3 inline-block text-sm font-semibold text-[#0B1F3A] hover:underline"
          >
            ← Kembali ke Beranda
          </Link>

        </div>

      </div>

    </main>
  );
}
