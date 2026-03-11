import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "arXiv Research Analyzer | AI-Powered Academic Research Tool",
  description: "Automatyczne pobieranie i analiza artykułów naukowych z arXiv z wykorzystaniem AI. Przeszukuj, analizuj i syntetyzuj badania naukowe pod zadanym kątem.",
  keywords: ["arXiv", "AI", "research", "academic", "papers", "analysis", "machine learning", "NLP", "scientific papers", "literature review"],
  authors: [{ name: "Coding Logisticians", url: "https://vercel.com/codinglogisticians-projects" }],
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "arXiv Research Analyzer",
    description: "AI-powered academic research analysis tool for arXiv papers",
    type: "website",
    images: ["/icon.png"],
  },
  twitter: {
    card: "summary",
    title: "arXiv Research Analyzer",
    description: "AI-powered academic research analysis tool",
    images: ["/icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
