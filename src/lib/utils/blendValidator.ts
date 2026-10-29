/**
 * Validates a Blender .blend file both by extension and binary magic bytes.
 * Official Blender files start with 'BLENDER' (7 bytes: 'B', 'L', 'E', 'N', 'D', 'E', 'R')
 * followed by pointer size ('_' for 32-bit, '-' for 64-bit) and endianness ('v' or 'V').
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  isBlenderMagic?: boolean;
}

export const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB

export async function validateBlendFile(file: File): Promise<ValidationResult> {
  // 1. Extension check
  if (!file.name.toLowerCase().endsWith(".blend")) {
    return {
      valid: false,
      error: `Extensión no válida (${file.name}). Se requiere un archivo .blend de Blender.`,
    };
  }

  // 2. Size check
  if (file.size <= 0) {
    return {
      valid: false,
      error: "El archivo seleccionado está vacío (0 bytes).",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo permitido de ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB.`,
    };
  }

  // 3. Magic bytes verification (first 7 bytes)
  try {
    const slice = file.slice(0, 12);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const headerString = String.fromCharCode(...Array.from(bytes.slice(0, 7)));

    if (headerString !== "BLENDER") {
      return {
        valid: false,
        error: "El contenido del archivo no coincide con un archivo binario válido de Blender (cabecera BLENDER ausente).",
        isBlenderMagic: false,
      };
    }

    return {
      valid: true,
      isBlenderMagic: true,
    };
  } catch (err) {
    // If reading slice fails, fallback to extension check
    console.warn("Could not inspect binary header:", err);
    return { valid: true };
  }
}

