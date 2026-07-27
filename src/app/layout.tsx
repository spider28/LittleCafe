import type { Metadata } from "next";
import { Chatbot } from "@/components/Chatbot";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { VisitTracker } from "@/components/VisitTracker";
import { getCurrentUser } from "@/lib/admin";
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
  const [chatbotSettings, user] = await Promise.all([getChatbotSettings(), getCurrentUser()]);

  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <VisitTracker />
        <Header initialEmail={user?.email ?? null} />
        <main>{children}</main>
        <Footer />
        {chatbotSettings.enabled ? <Chatbot /> : null}
      </body>
    </html>
  );
}
