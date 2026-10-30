"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CheatCookLogo } from "@/components/ui/CheatCookLogo";
import { validateGlbFile } from "@/lib/utils/glbValidator";
import { generateGlbThumbnail } from "@/lib/utils/thumbnailGenerator";
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
    const validation = await validateGlbFile(selectedFile);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Archivo .glb no válido.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    if (!modelName.trim()) {
      const baseName = selectedFile.name.replace(/\.glb$/i, "");
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
      setErrorMessage("Por favor, selecciona un archivo .glb.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setUploadProgress(15);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const finalName = modelName.trim() || file.name.replace(/\.glb$/i, "");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", finalName);

      // Generación automática de miniatura en el navegador con Three.js
      setUploadProgress(30);
      try {
        const thumbnailBlob = await generateGlbThumbnail(file);
        if (thumbnailBlob) {
          formData.append("thumbnail", thumbnailBlob, "thumbnail.png");
        }
      } catch (thumbErr) {
        console.warn("Could not generate client thumbnail:", thumbErr);
      }

      setUploadProgress(50);
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 250);

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
        `¡Modelo '${finalName}' subido y disponible inmediatamente en el visor 3D!`
      );

      setTimeout(() => {
        onUploadSuccess();
        handleClose();
      }, 1200);
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
          Subir nuevo modelo 3D (.glb)
        </DialogTitle>
        <DialogDescription>
          Selecciona un archivo compilado .glb con materiales y texturas integradas. Se publicará inmediatamente para su visualización interactiva.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Model Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#0F172A]">
            Nombre del modelo
          </label>
          <Input
            placeholder="Ej: Nevera Inteligente Cheat Cook V1"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            disabled={isSubmitting}
            className="rounded-xl bg-[#FFF8F4] border-[#F0E4DD] text-[#0F172A] placeholder:text-[#94A3B8] focus-visible:ring-[#FF6433]"
          />
          <span className="text-[11px] text-[#64748B]">
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
              ? "border-[#FF6433] bg-[#FF6433]/10 scale-[1.01]"
              : file
              ? "border-emerald-500/50 bg-emerald-50"
              : "border-[#F0E4DD] hover:border-[#FF6433]/50 bg-[#FFF8F4]/70"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,model/gltf-binary"
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
              <FileBox className="w-10 h-10 text-emerald-600 mb-2" />
              <div className="text-sm font-bold text-[#0F172A]">{file.name}</div>
              <div className="text-xs text-[#64748B] mt-0.5">
                {formatBytes(file.size)}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                disabled={isSubmitting}
                className="mt-3 inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                <X className="w-3.5 h-3.5" /> Quitar archivo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="w-10 h-10 text-[#FF6433] mb-2" />
              <div className="text-sm font-semibold text-[#0F172A]">
                Arrastra tu archivo <span className="font-mono text-[#C2410C]">.glb</span> aquí
              </div>
              <div className="text-xs text-[#64748B] mt-1">
                o haz clic para explorar tus archivos (hasta 250 MB)
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isSubmitting && (
          <div className="space-y-1.5 animate-in fade-in">
            <div className="flex justify-between text-xs text-[#475569]">
              <span>Subiendo archivo y procesando miniatura...</span>
              <span className="font-mono font-semibold text-[#C2410C]">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-[#F0E4DD] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#FF6433] h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success message */}
        {successNotice && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
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
            className="gap-2 font-semibold shadow-md shadow-[#FF6433]/20"
          >
            Subir modelo .glb
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
