/**
 * Validates a GLB (Binary glTF 2.0) file by extension, size, and binary magic bytes.
 * Binary glTF files start with 4-byte ASCII magic: 'glTF' (0x67, 0x6C, 0x54, 0x46).
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  isGlbMagic?: boolean;
}

export const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250 MB

export async function validateGlbFile(file: File): Promise<ValidationResult> {
  // 1. Extension check
  if (!file.name.toLowerCase().endsWith(".glb")) {
    return {
      valid: false,
      error: `Extensión no válida (${file.name}). Se requiere un archivo en formato 3D compilado .glb (Binary glTF).`,
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

  // 3. Binary header inspection (glTF 2.0 magic: 0x67 0x6C 0x54 0x46)
  try {
    const slice = file.slice(0, 12);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (magic === "glTF") {
      return { valid: true, isGlbMagic: true };
    }

    return {
      valid: false,
      error: "El archivo no contiene la cabecera binaria válida de glTF ('glTF'). Asegúrate de exportar como .glb desde tu software 3D.",
    };
  } catch (err) {
    console.warn("Could not inspect GLB header:", err);
    return { valid: true };
  }
}

