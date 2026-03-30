import type { Metadata } from "next";
import { Outfit, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlex = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DealScout AI",
  description:
    "AI-powered property scouting for real estate wholesalers and fix-and-flip investors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${ibmPlex.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-ds-bg text-ds-text selection:bg-ds-amber/20">
        <TooltipProvider>
          <NavBar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}
