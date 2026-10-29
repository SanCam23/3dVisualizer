"use client";

import React from "react";
import Link from "next/link";
import { Model3D } from "@/lib/types/models";
import { StatusBadge } from "@/components/library/StatusBadge";
import { Button } from "@/components/ui/Button";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import { formatBytes, formatDate } from "@/lib/utils/formatters";
import { ArrowLeft, Layers, Download, HardDrive } from "lucide-react";

interface ViewerToolbarProps {
  model: Model3D;
  meshStats?: { meshCount: number; vertexCount: number } | null;
}

export function ViewerToolbar({ model, meshStats }: ViewerToolbarProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-[#0B1220]/95 via-[#0B1220]/75 to-transparent backdrop-blur-[3px]">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-[#121B2D]/80 backdrop-blur-md border-border text-white hover:bg-secondary font-medium"
          >
            <ArrowLeft className="w-4 h-4 text-[#FF7A50]" />
            <span className="hidden sm:inline">Biblioteca 3D</span>
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center justify-center p-2 rounded-2xl bg-[#FF6433]/20 border border-[#FF6433]/35 shadow-sm">
            <CheatCookLogo className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-black text-lg sm:text-xl text-white tracking-tight drop-shadow-sm">
                {model.name}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#18233A] px-2.5 py-0.5 text-xs font-mono font-semibold text-white border border-border">
                <Layers className="w-3 h-3 text-[#FF7A50]" />
                v{model.version}
              </span>
              <StatusBadge status={model.status} className="hidden sm:inline-flex" />
            </div>

            <div className="flex items-center gap-3 text-xs text-[#8391A9] mt-0.5 font-medium">
              <span>Actualizado: {formatDate(model.updated_at)}</span>
              {model.file_size ? (
                <span className="hidden md:inline-flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  {formatBytes(model.file_size)}
                </span>
              ) : null}
              {meshStats ? (
                <span className="hidden lg:inline-flex items-center gap-1 font-mono text-[11px] text-[#A7B3C6]">
                  • {meshStats.meshCount} mallas / {meshStats.vertexCount.toLocaleString()} vértices
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {model.viewer_url && (
          <a
            href={model.viewer_url}
            download={`${model.name.toLowerCase().replace(/\s+/g, "_")}.glb`}
            target="_blank"
            rel="noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 bg-[#121B2D]/80 backdrop-blur-md text-xs border-border text-white hover:border-[#FF6433]/50 font-semibold"
              title="Descargar archivo GLB compilado"
            >
              <Download className="w-3.5 h-3.5 text-[#FF7A50]" />
              <span className="hidden sm:inline">Descargar .glb</span>
            </Button>
          </a>
        )}
      </div>
    </header>
  );
}
