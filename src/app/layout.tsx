import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { cafe } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: cafe.name,
    template: `%s | ${cafe.name}`
  },
  description: cafe.tagline
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
