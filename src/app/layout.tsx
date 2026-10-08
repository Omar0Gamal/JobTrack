import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JobTrack — Career Command Center",
  description:
    "Production-grade job application tracker with Kanban pipeline, interview scheduling, analytics, and resume version intelligence.",
  keywords: [
    "job search",
    "application tracker",
    "kanban board",
    "interview preparation",
    "career analytics",
  ],
  authors: [{ name: "JobTrack Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans min-h-screen bg-background text-foreground antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
