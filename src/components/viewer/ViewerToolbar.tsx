"use client";

import React from "react";
import Link from "next/link";
import { Model3D } from "@/lib/types/models";
import { StatusBadge } from "@/components/library/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatBytes, formatDate } from "@/lib/utils/formatters";
import { ArrowLeft, Layers, Download, HardDrive } from "lucide-react";

interface ViewerToolbarProps {
  model: Model3D;
  meshStats?: { meshCount: number; vertexCount: number } | null;
}

export function ViewerToolbar({ model, meshStats }: ViewerToolbarProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-background/90 via-background/60 to-transparent backdrop-blur-[2px]">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-card/60 backdrop-blur-md border-border text-foreground hover:bg-card"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Biblioteca</span>
          </Button>
        </Link>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-base sm:text-lg text-foreground tracking-tight drop-shadow-sm">
              {model.name}
            </h1>
            <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5 text-xs font-mono font-medium text-foreground border border-border">
              <Layers className="w-3 h-3 text-muted-foreground" />
              v{model.version}
            </span>
            <StatusBadge status={model.status} className="hidden sm:inline-flex" />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>Actualizado: {formatDate(model.updated_at)}</span>
            {model.file_size ? (
              <span className="hidden md:inline-flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatBytes(model.file_size)}
              </span>
            ) : null}
            {meshStats ? (
              <span className="hidden lg:inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground/80">
                • {meshStats.meshCount} mallas / {meshStats.vertexCount.toLocaleString()} vértices
              </span>
            ) : null}
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
              className="gap-1.5 bg-card/60 backdrop-blur-md text-xs border-border"
              title="Descargar archivo GLB compilado"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar .glb</span>
            </Button>
          </a>
        )}
      </div>
    </header>
  );
}

