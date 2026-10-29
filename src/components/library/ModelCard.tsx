"use client";

import React from "react";
import Link from "next/link";
import { Model3D } from "@/lib/types/models";
import { StatusBadge } from "@/components/library/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatBytes } from "@/lib/utils/formatters";
import { Eye, RefreshCw, Trash2, Box, Layers, HardDrive } from "lucide-react";

interface ModelCardProps {
  model: Model3D;
  onUpdate: (model: Model3D) => void;
  onDelete: (model: Model3D) => void;
}

export function ModelCard({ model, onUpdate, onDelete }: ModelCardProps) {
  const isAvailable = model.status === "available";
  const isUpdating = model.status === "updating";
  const isProcessing = model.status === "processing";

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-border/80 hover:shadow-xl hover:shadow-primary/5 overflow-hidden">
      {/* 3D Preview / Thumbnail Area */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-b from-muted/40 to-muted/80 flex items-center justify-center border-b border-border">
        {model.thumbnail_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.thumbnail_path}
            alt={model.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground transition-transform duration-300 group-hover:scale-110">
            <div className="relative">
              <Box className="w-14 h-14 stroke-[1.2] text-primary/70" />
              <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full" />
            </div>
            <span className="text-xs mt-2 font-mono text-muted-foreground/70 uppercase tracking-widest">
              3D GLB Asset
            </span>
          </div>
        )}

        {/* Top Badges overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <StatusBadge status={model.status} />
          <span className="inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur-md px-2 py-0.5 text-xs font-mono font-medium text-foreground border border-border shadow-sm">
            <Layers className="w-3 h-3 text-muted-foreground" />
            v{model.version}
          </span>
        </div>

        {/* Interactive Quick View overlay if available */}
        {isAvailable && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
            <Link href={`/models/${model.id}`}>
              <Button size="sm" className="shadow-lg gap-1.5 font-medium">
                <Eye className="w-4 h-4" />
                Abrir Visor
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title & Metadata */}
        <div className="flex-1">
          <h3 className="font-semibold text-base text-foreground tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
            {model.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span title="Fecha de última actualización">
              {formatDate(model.updated_at)}
            </span>
            {model.file_size ? (
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 opacity-70" />
                {formatBytes(model.file_size)}
              </span>
            ) : null}
          </div>

          {model.last_error && (
            <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-1.5 line-clamp-2">
              {model.last_error}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
          {/* Visualizar */}
          {isAvailable ? (
            <Link href={`/models/${model.id}`} className="flex-1">
              <Button
                variant="default"
                size="sm"
                className="w-full gap-1.5 text-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                Visualizar
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex-1 gap-1.5 text-xs opacity-50 cursor-not-allowed"
            >
              <Eye className="w-3.5 h-3.5" />
              {isProcessing || isUpdating ? "Procesando..." : "No disponible"}
            </Button>
          )}

          {/* Actualizar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate(model)}
            disabled={isUpdating}
            className="gap-1.5 text-xs hover:border-primary/50"
            title="Subir nueva versión conservando el mismo identificador"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          {/* Eliminar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(model)}
            disabled={isUpdating}
            className="text-xs hover:bg-destructive/10 hover:text-red-400 text-muted-foreground p-2"
            title="Eliminar modelo y archivos asociados"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

