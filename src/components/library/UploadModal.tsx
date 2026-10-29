"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import { validateBlendFile } from "@/lib/utils/blendValidator";
import { formatBytes } from "@/lib/utils/formatters";
import { UploadCloud, FileBox, AlertCircle, CheckCircle2, X } from "lucide-react";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

export function UploadModal({ open, onOpenChange, onUploadSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [modelName, setModelName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetState = () => {
    setFile(null);
    setModelName("");
    setErrorMessage(null);
    setSuccessNotice(null);
    setUploadProgress(0);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
    if (!modelName.trim()) {
      const baseName = selectedFile.name.replace(/\.blend$/i, "");
      const formatted = baseName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      setModelName(formatted);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Por favor, selecciona un archivo .blend.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setUploadProgress(10);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const finalName = modelName.trim() || file.name.replace(/\.blend$/i, "");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", finalName);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
      }, 300);

      const res = await fetch("/api/models", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al subir el modelo");
      }

      setSuccessNotice(
        `Modelo '${finalName}' subido a Cheat Cook. Registro en cola de conversión .glb.`
      );

      setTimeout(() => {
        onUploadSuccess();
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        setErrorMessage("Subida cancelada por el usuario.");
      } else {
        setErrorMessage((err as Error)?.message || "Fallo inesperado durante la subida.");
      }
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
          Subir nuevo modelo Blender (.blend)
        </DialogTitle>
        <DialogDescription>
          Selecciona un archivo .blend de Cheat Cook. Se almacenará de forma persistente y se iniciará la conversión a .glb para Three.js.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Model Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white">
            Nombre del modelo
          </label>
          <Input
            placeholder="Ej: Nevera Inteligente Cheat Cook V1"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            disabled={isSubmitting}
            className="rounded-xl bg-[#0B1220]/70 border-border focus-visible:ring-[#FF6433]"
          />
          <span className="text-[11px] text-[#8391A9]">
            Si se deja en blanco, se utilizará el nombre del archivo.
          </span>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${
            isDragging
              ? "border-[#FF6433] bg-[#FF6433]/15 scale-[1.01]"
              : file
              ? "border-emerald-500/50 bg-emerald-500/10"
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
              <FileBox className="w-10 h-10 text-emerald-400 mb-2" />
              <div className="text-sm font-bold text-white">{file.name}</div>
              <div className="text-xs text-[#8391A9] mt-0.5">
                {formatBytes(file.size)}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                disabled={isSubmitting}
                className="mt-3 inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300"
              >
                <X className="w-3.5 h-3.5" /> Quitar archivo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="w-10 h-10 text-[#FF7A50] mb-2" />
              <div className="text-sm font-semibold text-white">
                Arrastra tu archivo <span className="font-mono text-[#FF7A50]">.blend</span> aquí
              </div>
              <div className="text-xs text-[#8391A9] mt-1">
                o haz clic para explorar tus archivos (hasta 250 MB)
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isSubmitting && (
          <div className="space-y-1.5 animate-in fade-in">
            <div className="flex justify-between text-xs text-[#A7B3C6]">
              <span>Subiendo archivo a Supabase Storage...</span>
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

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-500/15 border border-rose-500/25 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success message */}
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
            Subir y procesar
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
