import "./globals.css";

export const metadata = {
  title: "NadhiLearn — Online Learning Platform",
  description: "Belajar keterampilan baru bersama NadhiLearn.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
