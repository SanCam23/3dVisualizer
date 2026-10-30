"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Model3D, ModelStatus } from "@/lib/types/models";
import { StatusBadge } from "@/components/library/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import { formatBytes, formatDate } from "@/lib/utils/formatters";
import { ArrowLeft, Layers, Download, HardDrive, Lock, CheckCircle2, AlertCircle } from "lucide-react";

interface ViewerToolbarProps {
  model: Model3D;
  meshStats?: { meshCount: number; vertexCount: number } | null;
}

export function ViewerToolbar({ model, meshStats }: ViewerToolbarProps) {
  const [currentStatus, setCurrentStatus] = useState<ModelStatus>(model.status);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);

  const handleToggleStatus = async () => {
    if (isChangingStatus) return;
    const nextStatus: ModelStatus = currentStatus === "available" ? "processing" : "available";
    try {
      setIsChangingStatus(true);
      setCurrentStatus(nextStatus);
      const res = await fetch(`/api/models/${model.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al actualizar estado");
      }
      if (data.model) {
        setCurrentStatus(data.model.status);
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      setCurrentStatus(currentStatus);
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleOpenDownload = () => {
    setPasswordInput("");
    setAuthError(null);
    setAuthSuccess(false);
    setIsAuthOpen(true);
  };

  const handleVerifyAndDownload = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (passwordInput === "CheatCook2026") {
      setAuthSuccess(true);
      // Trigger download
      if (model.viewer_url) {
        const link = document.createElement("a");
        link.href = model.viewer_url;
        link.download = `${model.name.toLowerCase().replace(/\s+/g, "_")}.glb`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => {
        setIsAuthOpen(false);
      }, 1200);
    } else {
      setAuthError("Contraseña incorrecta. Solo usuarios autorizados de Cheat Cook pueden descargar este archivo.");
    }
  };

  return (
    <>
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
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={isChangingStatus}
                  title={
                    currentStatus === "available"
                      ? "Pulsar para cambiar a 'En proceso'"
                      : "Pulsar para cambiar a 'Disponible'"
                  }
                  className="hidden sm:inline-flex cursor-pointer transition-transform duration-150 active:scale-95 outline-none focus:outline-none"
                >
                  <StatusBadge
                    status={currentStatus}
                    className={
                      currentStatus === "available"
                        ? "hover:ring-2 hover:ring-amber-400/60 hover:shadow-[0_0_12px_rgba(251,191,36,0.35)] transition-all cursor-pointer"
                        : "hover:ring-2 hover:ring-emerald-400/60 hover:shadow-[0_0_12px_rgba(52,211,153,0.35)] transition-all cursor-pointer"
                    }
                  />
                </button>
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

        {/* Right: Protected Download Button */}
        <div className="flex items-center gap-2">
          {model.viewer_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDownload}
              className="gap-1.5 bg-[#121B2D]/80 backdrop-blur-md text-xs border-border text-white hover:border-[#FF6433]/50 font-semibold"
              title="Descargar archivo GLB compilado (Requiere autorización)"
            >
              <Lock className="w-3.5 h-3.5 text-[#FF7A50]" />
              <Download className="w-3.5 h-3.5 text-[#FF7A50]" />
              <span className="hidden sm:inline">Descargar .glb</span>
            </Button>
          )}
        </div>
      </header>

      {/* Password Authorization Dialog */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FF6433]/20 border border-[#FF6433]/30">
              <Lock className="w-5 h-5 text-[#FF7A50]" />
            </div>
            Descarga protegida de modelo 3D
          </DialogTitle>
          <DialogDescription>
            Introduce la contraseña de acceso autorizada para descargar el archivo <strong className="text-white font-mono">{model.name}.glb</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerifyAndDownload} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white">
              Contraseña de descarga
            </label>
            <Input
              type="password"
              placeholder="Introduce la contraseña..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              disabled={authSuccess}
              className="rounded-xl bg-[#0B1220]/70 border-border focus-visible:ring-[#FF6433]"
              autoFocus
            />
          </div>

          {authError && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-500/15 border border-rose-500/25 rounded-xl animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 rounded-xl animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Contraseña correcta. Iniciando descarga del archivo...</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAuthOpen(false)}
              disabled={authSuccess}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!passwordInput || authSuccess}
              className="gap-2 font-semibold"
            >
              <Download className="w-4 h-4" />
              Confirmar y descargar
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
