/**
 * Validates a Blender .blend file by extension, size, and binary headers.
 * Official Blender files can be:
 *  1. Uncompressed: starts with ASCII 'BLENDER' (7 bytes)
 *  2. Gzip compressed: starts with magic bytes 0x1F, 0x8B
 *  3. Zstandard compressed (Blender 3.0+ default): starts with magic bytes 0x28, 0xB5, 0x2F, 0xFD
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  isBlenderMagic?: boolean;
  compression?: "none" | "gzip" | "zstd";
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

  // 3. Binary header inspection
  try {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Case A: Uncompressed Blender file ('BLENDER')
    const headerString = String.fromCharCode(...Array.from(bytes.slice(0, 7)));
    if (headerString === "BLENDER") {
      return { valid: true, isBlenderMagic: true, compression: "none" };
    }

    // Case B: Gzip-compressed Blender file (0x1F, 0x8B)
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      return { valid: true, isBlenderMagic: true, compression: "gzip" };
    }

    // Case C: Zstandard-compressed Blender file (0x28, 0xB5, 0x2F, 0xFD)
    if (bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd) {
      return { valid: true, isBlenderMagic: true, compression: "zstd" };
    }

    // Case D: Git LFS Pointer detector (common issue when downloading from GitHub)
    const textPreview = new TextDecoder().decode(bytes);
    if (textPreview.startsWith("version https://")) {
      return {
        valid: false,
        error: "El archivo parece ser un puntero de Git LFS (texto de pocos bytes), no el archivo binario real de Blender.",
      };
    }

    // If it has .blend extension, allow it and let Blender handle or report errors
    return {
      valid: true,
      isBlenderMagic: false,
    };
  } catch (err) {
    console.warn("Could not inspect binary header:", err);
    return { valid: true };
  }
}
