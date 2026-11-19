
import "./globals.css";

export const metadata = {
  title: "NadhiLearn — Online Learning Platform",
  description: "Belajar keterampilan baru bersama NadhiLearn.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
