"use client";

import React, { useState, useEffect } from "react";
import { SystemStatus } from "@/lib/types/models";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Cpu, Database, ExternalLink } from "lucide-react";

export function SystemStatusBanner() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch((err) => console.warn("Status check notice:", err));
  }, []);

  if (!status) return null;

  return (
    <div className="rounded-2xl border border-border bg-[#121B2D]/60 backdrop-blur-sm p-4 text-xs shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {status.isSupabaseConfigured ? (
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          ) : (
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400" />
          )}
          <span className="font-semibold text-white">
            {status.isSupabaseConfigured
              ? "Base de datos y Storage Supabase conectados"
              : "Modo Demostración / Desarrollo Local"}
          </span>
          {!status.isSupabaseConfigured && (
            <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono font-semibold">
              Mock Activo
            </span>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-[#8391A9] hover:text-[#FF7A50] transition-colors self-start sm:self-auto font-medium"
        >
          <span>{isExpanded ? "Ocultar detalles técnicos" : "Ver estado de servicios"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-border space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Supabase status */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0B1220]/60 border border-border">
              <Database className="w-4 h-4 text-[#FF7A50] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  Supabase PostgreSQL + Storage
                  {status.isSupabaseConfigured ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <p className="text-[#8391A9] text-[11px] mt-0.5">
                  {status.isSupabaseConfigured
                    ? `Conectado a ${status.supabaseUrl}`
                    : "No configurado en .env.local. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."}
                </p>
              </div>
            </div>

            {/* Blender Worker status */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0B1220]/60 border border-border">
              <Cpu className="w-4 h-4 text-[#FF7A50] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  Worker de Conversión Blender (.blend &rarr; .glb)
                  {status.isBlenderAvailable ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <p className="text-[#8391A9] text-[11px] mt-0.5">
                  {status.isBlenderAvailable
                    ? `Blender detectado: ${status.blenderPath}`
                    : "Blender no detectado en PATH. Ejecuta 'worker\\run_local_worker.bat' o despliega 'worker/Dockerfile'."}
                </p>
              </div>
            </div>
          </div>

          {!status.isSupabaseConfigured && (
            <div className="p-3 rounded-xl bg-[#FF6433]/10 border border-[#FF6433]/25 text-[#FFB59A] text-[11px] flex items-center justify-between">
              <span>
                Para activar la persistencia real, aplica la migración SQL en Supabase y define las credenciales en <code>.env.local</code>.
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#FF7A50] hover:underline ml-2 shrink-0 font-semibold"
              >
                Dashboard Supabase <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
