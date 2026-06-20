/**
 * Carga una imagen de archivo, la REDUCE a un máximo de lado y la devuelve como
 * data URL (base64). A diferencia de un object URL (blob:), el data URL es
 * autocontenido: sobrevive al refresh y se puede serializar a localStorage.
 *
 * Reducir es clave: localStorage ronda los 5MB y base64 infla ~33%. Una foto
 * de azulejo a 1024px en JPEG q0.85 pesa decenas/cientos de KB, no megas.
 */
const MAX_SIZE = 1024;
const QUALITY = 0.85;

export interface LoadedImage {
  /** data URL (base64) listo para guardar y usar como textura. */
  src: string;
  /** Proporción alto/ancho de la imagen original (para el tamaño del azulejo). */
  ratio: number;
}

export function fileToDataURL(file: File, maxSize = MAX_SIZE): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: nw, naturalHeight: nh } = img;
      const scale = Math.min(1, maxSize / Math.max(nw, nh, 1));
      const w = Math.max(1, Math.round(nw * scale));
      const h = Math.max(1, Math.round(nh * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(objectUrl); // ya dibujamos; liberamos el blob temporal
      if (!ctx) {
        reject(new Error("No se pudo obtener el contexto 2D"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve({
        src: canvas.toDataURL("image/jpeg", QUALITY),
        ratio: nw ? nh / nw : 1,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo cargar la imagen"));
    };
    img.src = objectUrl;
  });
}
