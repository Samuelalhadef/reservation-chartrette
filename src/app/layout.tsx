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

// Évite le flash de thème (FOUC) : applique la classe `dark` avant le rendu.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    var isDark = t === 'dark' || ((!t || t === 'system') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased theme-transition">
        <SessionProvider>
          {children}
          <HelpChat />
        </SessionProvider>
      </body>
    </html>
  );
}
