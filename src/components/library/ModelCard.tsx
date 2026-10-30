"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Model3D, ModelStatus } from "@/lib/types/models";
import { StatusBadge } from "@/components/library/StatusBadge";
import { Button } from "@/components/ui/Button";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import { formatDate, formatBytes } from "@/lib/utils/formatters";
import { Eye, RefreshCw, Trash2, Layers, HardDrive } from "lucide-react";

interface ModelCardProps {
  model: Model3D;
  onUpdate: (model: Model3D) => void;
  onDelete: (model: Model3D) => void;
  onStatusChange?: (modelId: string, newStatus: ModelStatus) => void;
}

export function ModelCard({ model, onUpdate, onDelete, onStatusChange }: ModelCardProps) {
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const isUpdating = model.status === "updating";

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isChangingStatus) return;

    // Toggle between available and processing
    const nextStatus: ModelStatus = model.status === "available" ? "processing" : "available";

    try {
      setIsChangingStatus(true);
      if (onStatusChange) {
        onStatusChange(model.id, nextStatus);
      }

      const res = await fetch(`/api/models/${model.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al actualizar estado");
      }

      if (onStatusChange && data.model) {
        onStatusChange(model.id, data.model.status);
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      if (onStatusChange) {
        onStatusChange(model.id, model.status);
      }
    } finally {
      setIsChangingStatus(false);
    }
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-border bg-[#121B2D]/80 backdrop-blur-sm transition-all duration-300 hover:border-[#FF6433]/50 hover:shadow-[0_8px_24px_rgba(255,100,51,0.12)] overflow-hidden">
      {/* 3D Preview / Thumbnail Area */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-b from-[#18233A] to-[#0F1828] flex items-center justify-center border-b border-border">
        {(model.thumbnail_url || model.thumbnail_path) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.thumbnail_url || model.thumbnail_path || ""}
            alt={model.name}
            className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105 drop-shadow-md"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground transition-transform duration-300 group-hover:scale-110">
            <div className="relative flex items-center justify-center">
              <CheatCookLogo className="w-14 h-14 drop-shadow-lg opacity-85" />
              <div className="absolute inset-0 blur-2xl bg-[#FF6433]/20 rounded-full" />
            </div>
            <span className="text-[10px] mt-2.5 font-mono font-semibold text-[#8391A9] tracking-widest uppercase">
              Modelo 3D GLB
            </span>
          </div>
        )}

        {/* Top Badges overlay: botón interactivo para alternar estado */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={isChangingStatus}
            title={
              model.status === "available"
                ? "Pulsar para cambiar a 'En proceso'"
                : "Pulsar para cambiar a 'Disponible'"
            }
            className="cursor-pointer group/badge transition-transform duration-150 active:scale-95 outline-none focus:outline-none"
          >
            <StatusBadge
              status={model.status}
              className={
                model.status === "available"
                  ? "group-hover/badge:ring-2 group-hover/badge:ring-amber-400/60 group-hover/badge:shadow-[0_0_12px_rgba(251,191,36,0.35)] transition-all cursor-pointer"
                  : "group-hover/badge:ring-2 group-hover/badge:ring-emerald-400/60 group-hover/badge:shadow-[0_0_12px_rgba(52,211,153,0.35)] transition-all cursor-pointer"
              }
            />
          </button>

          <span className="inline-flex items-center gap-1 rounded-full bg-[#0B1220]/80 backdrop-blur-md px-2.5 py-0.5 text-xs font-mono font-semibold text-white border border-border shadow-sm pointer-events-none">
            <Layers className="w-3 h-3 text-[#FF7A50]" />
            v{model.version}
          </span>
        </div>

        {/* Interactive Quick View overlay: siempre disponible */}
        <div className="absolute inset-0 bg-[#0B1220]/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <Link href={`/models/${model.id}`}>
            <Button size="sm" className="shadow-lg gap-1.5 font-semibold">
              <Eye className="w-4 h-4" />
              Abrir Visor
            </Button>
          </Link>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title & Metadata */}
        <div className="flex-1">
          <h3 className="font-bold text-base text-white tracking-tight line-clamp-1 group-hover:text-[#FF7A50] transition-colors">
            {model.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8391A9]">
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
            <p className="mt-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2 line-clamp-2">
              {model.last_error}
            </p>
          )}
        </div>

        {/* Action Buttons: Visualizar (siempre activo), Actualizar y Eliminar */}
        <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
          {/* Visualizar */}
          <Link href={`/models/${model.id}`} className="flex-1">
            <Button
              variant="default"
              size="sm"
              className="w-full gap-1.5 text-xs font-semibold"
            >
              <Eye className="w-3.5 h-3.5" />
              Visualizar
            </Button>
          </Link>

          {/* Actualizar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate(model)}
            disabled={isUpdating}
            className="gap-1.5 text-xs hover:border-[#FF6433]/50 font-medium px-3"
            title="Subir nueva versión conservando el mismo identificador"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#A7B3C6]" />
            <span>Actualizar</span>
          </Button>

          {/* Eliminar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(model)}
            disabled={isUpdating}
            className="text-xs hover:bg-rose-500/15 hover:text-rose-400 text-[#8391A9] p-2 h-8 w-8 rounded-xl shrink-0"
            title="Eliminar modelo y archivos asociados"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
