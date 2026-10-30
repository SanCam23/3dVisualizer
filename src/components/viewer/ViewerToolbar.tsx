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
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-[#FFF8F4]/95 via-[#FFF8F4]/80 to-transparent backdrop-blur-[4px] border-b border-[#F0E4DD]/60">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-white/90 backdrop-blur-md border-[#F0E4DD] text-[#0F172A] hover:bg-[#FFF1EA] font-medium shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#FF6433]" />
              <span className="hidden sm:inline">Biblioteca 3D</span>
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center justify-center p-2 rounded-2xl bg-[#FFF1EA] border border-[#FF6433]/30 shadow-xs">
              <CheatCookLogo className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-black text-lg sm:text-xl text-[#0F172A] tracking-tight">
                  {model.name}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-mono font-semibold text-[#0F172A] border border-[#F0E4DD] shadow-xs">
                  <Layers className="w-3 h-3 text-[#FF6433]" />
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
                        ? "hover:ring-2 hover:ring-amber-400/60 hover:shadow-[0_0_12px_rgba(251,191,36,0.25)] transition-all cursor-pointer"
                        : "hover:ring-2 hover:ring-emerald-400/60 hover:shadow-[0_0_12px_rgba(52,211,153,0.25)] transition-all cursor-pointer"
                    }
                  />
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#64748B] mt-0.5 font-medium">
                <span>Actualizado: {formatDate(model.updated_at)}</span>
                {model.file_size ? (
                  <span className="hidden md:inline-flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    {formatBytes(model.file_size)}
                  </span>
                ) : null}
                {meshStats ? (
                  <span className="hidden lg:inline-flex items-center gap-1 font-mono text-[11px] text-[#475569]">
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
              className="gap-1.5 bg-white/90 backdrop-blur-md text-xs border-[#F0E4DD] text-[#0F172A] hover:bg-[#FFF1EA] hover:border-[#FF6433]/50 font-semibold shadow-xs"
              title="Descargar archivo GLB compilado (Requiere autorización)"
            >
              <Lock className="w-3.5 h-3.5 text-[#FF6433]" />
              <Download className="w-3.5 h-3.5 text-[#FF6433]" />
              <span className="hidden sm:inline">Descargar .glb</span>
            </Button>
          )}
        </div>
      </header>

      {/* Password Authorization Dialog */}
      <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FFF1EA] border border-[#FF6433]/30">
              <Lock className="w-5 h-5 text-[#FF6433]" />
            </div>
            Descarga protegida de modelo 3D
          </DialogTitle>
          <DialogDescription>
            Introduce la contraseña de acceso autorizada para descargar el archivo <strong className="text-[#0F172A] font-mono">{model.name}.glb</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerifyAndDownload} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#0F172A]">
              Contraseña de descarga
            </label>
            <Input
              type="password"
              placeholder="Introduce la contraseña..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              disabled={authSuccess}
              className="rounded-xl bg-[#FFF8F4] border-[#F0E4DD] text-[#0F172A] placeholder:text-[#94A3B8] focus-visible:ring-[#FF6433]"
              autoFocus
            />
          </div>

          {authError && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
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
              className="gap-2 font-semibold shadow-md shadow-[#FF6433]/20"
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
