import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Cinzel, Outfit } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/components/game/GameContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-heading",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-numbers",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PropEmpire - Build. Trade. Dominate.",
  description: "A premium online multiplayer strategy game. Acquire properties, negotiate trades, win auctions, and build your real estate empire in a gorgeous luxury dashboard.",
  keywords: ["PropEmpire", "board game", "online multiplayer", "property trading", "real estate strategy", "business game"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${cinzel.variable} ${outfit.variable} h-full dark`}>
      <body className="min-h-full flex flex-col font-sans text-foreground bg-background">
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
