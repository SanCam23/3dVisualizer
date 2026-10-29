"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Model3D } from "@/lib/types/models";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import { validateBlendFile } from "@/lib/utils/blendValidator";
import { formatBytes } from "@/lib/utils/formatters";
import { RefreshCw, FileBox, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight, X } from "lucide-react";

interface UpdateModalProps {
  model: Model3D | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSuccess: () => void;
}

export function UpdateModal({ model, open, onOpenChange, onUpdateSuccess }: UpdateModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!model) return null;

  const resetState = () => {
    setFile(null);
    setErrorMessage(null);
    setSuccessNotice(null);
    setUploadProgress(0);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileSelected = async (selectedFile: File) => {
    setErrorMessage(null);
    const validation = await validateBlendFile(selectedFile);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Archivo .blend no válido.");
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Por favor, selecciona un nuevo archivo .blend.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
      }, 300);

      const res = await fetch(`/api/models/${model.id}/update`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar la versión del modelo");
      }

      setSuccessNotice(
        `Actualización iniciada a v${model.version + 1}. La versión anterior (v${model.version}) continuará activa hasta que el nuevo archivo .glb se confirme.`
      );

      setTimeout(() => {
        onUpdateSuccess();
        handleClose();
      }, 1800);
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || "Fallo durante la actualización.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-[#FF6433]/20 border border-[#FF6433]/30">
            <CheatCookLogo className="w-5 h-5" />
          </div>
          Actualizar modelo (v{model.version} &rarr; v{model.version + 1})
        </DialogTitle>
        <DialogDescription>
          Sube una versión más moderna de <strong className="text-white font-semibold">{model.name}</strong>. Se conservará el identificador permanente en Cheat Cook.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Version Transition Banner */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0B1220]/70 border border-border text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono bg-[#18233A] px-2.5 py-1 rounded-full border border-border text-white font-semibold">
              v{model.version} (Activa)
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#8391A9]" />
            <span className="font-mono bg-[#FF6433]/20 text-[#FF7A50] px-2.5 py-1 rounded-full border border-[#FF6433]/30 font-semibold">
              v{model.version + 1} (Nueva versión)
            </span>
          </div>
          <span className="text-[#8391A9] font-mono">{formatBytes(model.file_size)}</span>
        </div>

        {/* Safe Update Guarantee Card (Cheat Cook Sage Accent) */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          <div>
            <strong className="block font-semibold">Garantía de actualización atómica:</strong>
            La versión actual seguirá en línea e intacta. Solo se reemplazará y limpiará tras verificar que el nuevo archivo .glb se ha generado correctamente.
          </div>
        </div>

        {/* File Picker */}
        <div
          onClick={() => !file && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] ${
            file
              ? "border-[#FF6433] bg-[#FF6433]/10"
              : "border-border hover:border-[#FF6433]/50 bg-[#0B1220]/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".blend"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelected(e.target.files[0]);
              }
            }}
            disabled={isSubmitting}
          />

          {file ? (
            <div className="flex flex-col items-center">
              <FileBox className="w-8 h-8 text-[#FF7A50] mb-1.5" />
              <div className="text-sm font-bold text-white">{file.name}</div>
              <div className="text-xs text-[#8391A9]">{formatBytes(file.size)}</div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                disabled={isSubmitting}
                className="mt-2 inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300"
              >
                <X className="w-3.5 h-3.5" /> Cambiar archivo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <RefreshCw className="w-8 h-8 text-[#FF7A50] mb-1.5" />
              <div className="text-sm font-semibold text-white">
                Selecciona el nuevo archivo <span className="font-mono text-[#FF7A50]">.blend</span>
              </div>
              <div className="text-xs text-[#8391A9] mt-0.5">
                Se validará la cabecera BLENDER antes de subir
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        {isSubmitting && (
          <div className="space-y-1.5 animate-in fade-in">
            <div className="flex justify-between text-xs text-[#A7B3C6]">
              <span>Subiendo nueva versión persistente...</span>
              <span className="font-mono font-semibold text-[#FF7A50]">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-[#18233A] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#FF6433] h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-500/15 border border-rose-500/25 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!file || isSubmitting}
            className="gap-2 font-semibold"
          >
            Confirmar actualización
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
