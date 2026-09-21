import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Location Tracker Admin · Sri Lanka",
  description: "Internal dashboard for Android location tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
