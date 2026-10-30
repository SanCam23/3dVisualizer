"use client";

import React from "react";
import { Search, Plus, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ModelSearchFilterProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onOpenUpload: () => void;
  totalModels: number;
}

export function ModelSearchFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenUpload,
  totalModels,
}: ModelSearchFilterProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-4 rounded-2xl border border-border shadow-sm">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8391A9] pointer-events-none" />
        <Input
          type="text"
          placeholder="Buscar modelos por nombre..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-8 bg-[#FFF8F4] border-border text-sm text-[#0F172A] placeholder:text-[#94A3B8] rounded-full focus-visible:ring-[#FF6433]"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8391A9] hover:text-[#0F172A]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter and Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-2 bg-[#FFF8F4] border border-border rounded-full px-3.5 py-1.5">
          <Filter className="w-3.5 h-3.5 text-[#FF6433]" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-transparent text-xs font-medium text-[#0F172A] focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-white text-[#0F172A]">Todos los estados</option>
            <option value="available" className="bg-white text-[#0F172A]">Disponibles</option>
            <option value="processing" className="bg-white text-[#0F172A]">En procesamiento</option>
            <option value="updating" className="bg-white text-[#0F172A]">Actualizando</option>
            <option value="error" className="bg-white text-[#0F172A]">Con error</option>
          </select>
        </div>

        {/* Counter badge */}
        <span className="hidden sm:inline-block text-xs font-mono font-medium text-[#64748B] border-l border-border pl-3">
          {totalModels} {totalModels === 1 ? "modelo" : "modelos"}
        </span>

        {/* Subir Modelo Button (Cheat Cook Brand Coral Pill) */}
        <Button
          onClick={onOpenUpload}
          className="gap-2 shrink-0 font-semibold shadow-md shadow-[#FF6433]/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Subir modelo
        </Button>
      </div>
    </div>
  );
}
