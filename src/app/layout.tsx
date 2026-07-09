import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://campeonato-portugal-orc-2026.vercel.app"),
  title: {
    default: "Campeonato de Portugal ORC 2026",
    template: "%s · Campeonato de Portugal ORC 2026",
  },
  description:
    "Portal oficial do Campeonato de Portugal ORC 2026, organizado pela AVELAS na Marina da Figueira da Foz.",
  openGraph: {
    title: "Campeonato de Portugal ORC 2026",
    description:
      "Programa, avisos oficiais, inscritos, resultados, media e tracking demo do campeonato.",
    locale: "pt_PT",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
