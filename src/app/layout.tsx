import type { Metadata } from "next";
import { Chatbot } from "@/components/Chatbot";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { cafe } from "@/lib/content";
import { getChatbotSettings } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: cafe.name,
    template: `%s | ${cafe.name}`
  },
  description: cafe.tagline
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const chatbotSettings = await getChatbotSettings();

  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        {chatbotSettings.enabled ? <Chatbot /> : null}
      </body>
    </html>
  );
}
