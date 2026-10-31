import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import { Layers } from "lucide-react";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://3d-visualizer-sancam23s-projects.vercel.app"
  ),
  title: "Cheat Cook | Estudio 3D y Visor Interactivo",
  description: "Biblioteca y visor interactivo de modelos 3D oficial de Cheat Cook: visualización de alimentos, nevera y despensa en WebGL en tiempo real.",
  applicationName: "Cheat Cook 3D Studio",
  authors: [{ name: "Cheat Cook" }],
  generator: "Next.js",
  keywords: [
    "Cheat Cook",
    "3D Studio",
    "Visor 3D",
    "WebGL",
    "Three.js",
    "Modelos 3D",
    "Nevera Inteligente",
    "Alimentos 3D",
    "GLB",
  ],
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon", type: "image/png" },
    ],
    shortcut: "/logo.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: "Cheat Cook 3D Studio",
    title: "Cheat Cook | Estudio 3D y Visor Interactivo",
    description: "Biblioteca y visor interactivo de modelos 3D oficial de Cheat Cook: inventario visual en 3D, modelos GLB y renderizado WebGL en tiempo real.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cheat Cook | Estudio 3D y Visor Interactivo",
    description: "Biblioteca y visor interactivo de modelos 3D oficial de Cheat Cook: inventario visual en 3D y renderizado WebGL en tiempo real.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col antialiased selection:bg-[#FF6433]/30 selection:text-white bg-background text-foreground">
        {/* Global Cheat Cook Header (Prominent & Spacious, Light Theme) */}
        <header className="sticky top-0 z-40 border-b border-[#F0E4DD] bg-[#FFF8F4]/90 backdrop-blur-md">
          <div className="container mx-auto px-4 h-20 sm:h-24 flex items-center justify-between">
            {/* Logo & Brand (Bigger & Bolder) */}
            <Link href="/" className="flex items-center gap-4 group">
              <div className="relative flex items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-[#FF6433]/20 via-[#FF6433]/10 to-[#FFF1EA] border border-[#FF6433]/30 group-hover:scale-105 group-hover:border-[#FF6433]/60 transition-all duration-300 shadow-[0_4px_16px_rgba(255,100,51,0.15)]">
                <CheatCookLogo className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2.5">
                  <span className="font-black text-2xl sm:text-3xl tracking-tight text-[#0F172A] group-hover:text-[#FF6433] transition-colors">
                    Cheat Cook
                  </span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FF6433]/15 text-[#C2410C] border border-[#FF6433]/30">
                    3D Studio
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-[#64748B] hidden sm:block font-medium mt-0.5">
                  Visualización y gestión de activos 3D
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-3 sm:gap-4 text-sm font-semibold text-[#475569]">
              <Link
                href="/"
                className="hover:text-[#0F172A] transition-colors flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-[#FFF1EA] border border-[#F0E4DD] text-xs sm:text-sm shadow-sm"
              >
                <Layers className="w-4 h-4 text-[#FF6433]" />
                Biblioteca 3D
              </Link>
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Cheat Cook Footer */}
        <footer className="border-t border-[#F0E4DD] py-6 bg-white/70 text-xs text-[#64748B]">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <CheatCookLogo className="w-5 h-5 opacity-90" />
              <span>
                <strong className="text-[#0F172A]">Cheat Cook</strong> · Visor 3D Interactivo
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#94A3B8]">
              <span>Next.js App Router</span>
              <span>•</span>
              <span>Three.js / WebGL</span>
              <span>•</span>
              <span>Formato GLB Nativo</span>
              <span>•</span>
              <span>Supabase Cloud</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
