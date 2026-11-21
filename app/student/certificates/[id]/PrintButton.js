
"use client";

import { useState } from "react";

export default function PrintButton() {
  const [showOptions, setShowOptions] = useState(false);
  const [sheets, setSheets] = useState(1);

  async function handlePrint() {
    const total = Math.max(1, Math.min(10, Number(sheets) || 1));

    const original = document.querySelector(
      ".certificate-page .certificate-paper:not(.certificate-paper-copy)"
    );

    if (!original) {
      alert("Sertifikat tidak ditemukan.");
      return;
    }

    // Buka jendela cetak khusus
    const printFrame = document.createElement("iframe");

    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "1px";
    printFrame.style.height = "1px";
    printFrame.style.border = "0";
    printFrame.style.opacity = "0";

    document.body.appendChild(printFrame);

    const printWindow = printFrame.contentWindow;
    const printDocument = printWindow.document;

    // Ambil stylesheet aplikasi agar desain tetap sama
    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((item) => item.outerHTML)
      .join("\n");

    // Buat salinan sertifikat sesuai jumlah pilihan
    const certificates = Array.from({ length: total }, (_, index) => {
      const copy = original.cloneNode(true);

      if (index > 0) {
        copy.classList.add("certificate-paper-copy");
      }

      return copy.outerHTML;
    }).join("\n");

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Cetak Sertifikat NadhiLearn</title>

          ${styles}

          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: 297mm !important;
              background: white !important;
            }

            body {
              display: block !important;
            }

            .certificate-page {
              display: block !important;
              width: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            .certificate-paper {
              display: block !important;
              position: relative !important;
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
              box-sizing: border-box !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
              break-after: page !important;
              page-break-after: always !important;
            }

            .certificate-paper:last-child {
              break-after: auto !important;
              page-break-after: auto !important;
            }

            .certificate-paper > div {
              display: flex !important;
              width: 100% !important;
              height: 100% !important;
              min-height: 0 !important;
              max-height: 100% !important;
              padding: 1mm !important;
              overflow: hidden !important;
            }

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

            .certificate-paper img[alt="Logo NadhiLearn"] {
              width: 12mm !important;
              height: 12mm !important;
            }

            .certificate-paper h1 {
              font-size: 25pt !important;
            }

            .certificate-paper h2 {
              line-height: 1.1 !important;
            }

            .certificate-paper h3 {
              margin-top: 1mm !important;
              font-size: 17pt !important;
            }

            .certificate-paper img[alt^="Tanda tangan"] {
              bottom: -8mm !important;
              height: 30mm !important;
              width: 45mm !important;
            }

            .certificate-paper > div > div > div:last-child {
              padding-top: 1mm !important;
            }

            @media screen {
              body {
                padding: 10px !important;
              }

              .certificate-paper {
                margin: 0 auto !important;
              }
            }
          </style>
        </head>

        <body>
          <main class="certificate-page">
            ${certificates}
          </main>
        </body>
      </html>
    `);

    printWindow.document.close();

    setShowOptions(false);

    // Tunggu stylesheet, gambar, dan font siap
    try {
      await printWindow.document.fonts.ready;

      const images = Array.from(
        printWindow.document.images
      );

      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();

          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error("Gagal menyiapkan sertifikat:", error);
    }
  }

  return (
    <div className="no-print">
      <button
        type="button"
        onClick={() => setShowOptions(true)}
        className="rounded-lg bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#18395F]"
      >
        🖨️ Cetak / Simpan PDF
      </button>

      {showOptions && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#0B1F3A]">
              Pilih Jumlah Sertifikat
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Setiap lembar berisi satu sertifikat utuh.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 10].map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setSheets(number)}
                  className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                    sheets === number
                      ? "border-[#0B1F3A] bg-[#0B1F3A] text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:border-[#0B1F3A]"
                  }`}
                >
                  {number} Lembar
                </button>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowOptions(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 rounded-lg bg-[#0B1F3A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#18395F]"
              >
                Lanjut Cetak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
