import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Réservation Chartrettes - Système de réservation de salles",
  description: "Application de gestion et réservation des salles pour les associations de Chartrettes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
