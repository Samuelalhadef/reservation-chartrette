import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import HelpChat from "@/components/HelpChat";
import SessionProvider from "@/components/SessionProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Réservation Chartrettes - Système de réservation de salles",
  description:
    "Application de gestion et réservation des salles pour les associations de Chartrettes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="antialiased">
        <SessionProvider>
          {children}
          <HelpChat />
        </SessionProvider>
      </body>
    </html>
  );
}
