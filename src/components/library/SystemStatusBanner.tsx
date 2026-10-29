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
    <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-4 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {status.isSupabaseConfigured ? (
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          ) : (
            <span className="flex h-2 w-2 rounded-full bg-amber-500" />
          )}
          <span className="font-semibold text-foreground">
            {status.isSupabaseConfigured
              ? "Base de datos y Storage Supabase conectados"
              : "Modo Demostración / Desarrollo Local"}
          </span>
          {!status.isSupabaseConfigured && (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-mono">
              Mock Activo
            </span>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto"
        >
          <span>{isExpanded ? "Ocultar detalles técnicos" : "Ver estado de servicios"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-border space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Supabase status */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 border border-border">
              <Database className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-foreground flex items-center gap-1.5">
                  Supabase PostgreSQL + Storage
                  {status.isSupabaseConfigured ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  {status.isSupabaseConfigured
                    ? `Conectado a ${status.supabaseUrl}`
                    : "No configurado en .env.local. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para persistencia en la nube."}
                </p>
              </div>
            </div>

            {/* Blender Worker status */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/50 border border-border">
              <Cpu className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-foreground flex items-center gap-1.5">
                  Worker de Conversión Blender (.blend &rarr; .glb)
                  {status.isBlenderAvailable ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  {status.isBlenderAvailable
                    ? `Blender detectado: ${status.blenderPath}`
                    : "Blender no detectado en PATH. Ejecuta 'worker\\run_local_worker.bat' o despliega 'worker/Dockerfile'."}
                </p>
              </div>
            </div>
          </div>

          {!status.isSupabaseConfigured && (
            <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-blue-300 text-[11px] flex items-center justify-between">
              <span>
                Para activar la persistencia real, aplica la migración SQL en Supabase (<code>supabase/migrations/</code>) y define las credenciales en <code>.env.local</code>.
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline ml-2 shrink-0 font-medium"
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

