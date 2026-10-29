import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import { Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Cheat Cook · 3D Studio & Visualizer",
  description: "Biblioteca y visor interactivo de modelos 3D oficial de Cheat Cook, con Three.js y conversión headless de Blender.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen flex flex-col antialiased selection:bg-[#FF6433]/30 selection:text-white">
        {/* Global Cheat Cook Header (Prominent & Spacious) */}
        <header className="sticky top-0 z-40 border-b border-border bg-[#0B1220]/90 backdrop-blur-md">
          <div className="container mx-auto px-4 h-20 sm:h-24 flex items-center justify-between">
            {/* Logo & Brand (Bigger & Bolder) */}
            <Link href="/" className="flex items-center gap-4 group">
              <div className="relative flex items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-[#FF6433]/25 via-[#FF6433]/15 to-[#FF6433]/5 border border-[#FF6433]/40 group-hover:scale-105 group-hover:border-[#FF6433]/70 transition-all duration-300 shadow-[0_4px_20px_rgba(255,100,51,0.25)]">
                <CheatCookLogo className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2.5">
                  <span className="font-black text-2xl sm:text-3xl tracking-tight text-white group-hover:text-[#FF7A50] transition-colors">
                    Cheat Cook
                  </span>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FF6433]/20 text-[#FF7A50] border border-[#FF6433]/35">
                    3D Studio
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-[#8391A9] hidden sm:block font-medium mt-0.5">
                  Visualización y gestión de activos 3D
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-3 sm:gap-4 text-sm font-semibold text-[#A7B3C6]">
              <Link
                href="/"
                className="hover:text-white transition-colors flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 hover:bg-secondary border border-border text-xs sm:text-sm shadow-sm"
              >
                <Layers className="w-4 h-4 text-[#FF7A50]" />
                Biblioteca 3D
              </Link>
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Cheat Cook Footer */}
        <footer className="border-t border-border py-6 bg-[#0B1220]/60 text-xs text-[#8391A9]">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <CheatCookLogo className="w-5 h-5 opacity-80" />
              <span>
                <strong className="text-white">Cheat Cook</strong> · Visor 3D Interactivo
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span>Next.js App Router</span>
              <span>•</span>
              <span>Three.js / WebGL</span>
              <span>•</span>
              <span>Blender Headless</span>
              <span>•</span>
              <span>Supabase Cloud</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
