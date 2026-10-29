import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Box, Layers, HardDrive } from "lucide-react";

export const metadata: Metadata = {
  title: "3D Visualizer | Biblioteca y Visor Three.js",
  description: "Biblioteca y visor profesional de modelos 3D con Three.js, Blender headless y Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        {/* Global Navigation Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary group-hover:scale-105 transition-transform">
                <Box className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                  3D Visualizer
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">
                    Three.js + Blender
                  </span>
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <Link
                href="/"
                className="hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Biblioteca
              </Link>
              <a
                href="https://github.com/KhronosGroup/glTF"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors hidden sm:flex items-center gap-1.5"
              >
                <HardDrive className="w-3.5 h-3.5" />
                Estándar glTF/GLB
              </a>
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer */}
        <footer className="border-t border-border py-6 bg-card/30 text-xs text-muted-foreground">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <span>3D Model Management &amp; Interactive Viewer • Three.js + Blender Headless + Supabase</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Next.js App Router</span>
              <span>•</span>
              <span>Tailwind CSS</span>
              <span>•</span>
              <span>Vercel Ready</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

