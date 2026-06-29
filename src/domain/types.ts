/**
 * Modelo de dominio del editor de baños.
 *
 * Principio rector: la geometría de la habitación se define por un CONTORNO
 * de puntos (un polígono cerrado). Las paredes y el piso NO se almacenan como
 * geometría: se DERIVAN del contorno. Esto hace que un baño en L (o cualquier
 * forma) sea el caso general, no una excepción.
 */

/** Punto en el plano de planta (top-down). Unidades: metros. */
export interface Point2 {
  x: number;
  y: number;
}

/** Dimensiones reales de un objeto, en metros (caja contenedora). */
export interface Size {
  width: number;
  height: number;
  depth: number;
}

/** Posición del desagüe de un plato de ducha. */
export type DrainPosition = "center" | "back" | "corner";

/** Forma de un espejo. */
export type MirrorShape = "square" | "round";

/**
 * Un hueco en una pared: puerta o ventana. No es un objeto encima de la pared,
 * es la AUSENCIA de pared en un tramo. La geometría maciza se deriva de esto
 * (ver wallParts en geometry.ts).
 */
export interface Opening {
  /** Distancia del borde del hueco desde el inicio (start) de la pared, en m. */
  offset: number;
  /** Ancho del hueco, en metros. */
  width: number;
  /** Alto del hueco, en metros. */
  height: number;
  /** Altura del antepecho: 0 = puerta (llega al piso); >0 = ventana. */
  sill: number;
}

/**
 * Una ZONA de revestimiento: un rectángulo de la cara de la pared con su propio
 * azulejo. Es el dual de un Opening: el opening QUITA pared en un tramo; la
 * región AGREGA un revestimiento distinto sobre un tramo. La pared conserva su
 * material base; la región lo pisa solo en su rectángulo (ej. la piedra de la
 * ducha sin teñir toda la pared). Coordenadas LOCALes a la pared, en metros.
 */
export interface TileRegion {
  /** Distancia del borde izquierdo de la zona desde el inicio de la pared. */
  offset: number;
  /** Ancho de la zona, a lo largo de la pared. */
  width: number;
  /** Base de la zona desde el piso (0 = arranca en el suelo). */
  bottom: number;
  /** Alto de la zona. */
  height: number;
  /** Azulejo (Material) que reviste esta zona. */
  materialId: string;
}

/**
 * Propiedades de una pared. Una pared es la ARISTA entre el punto `i` y el
 * punto `i+1` del contorno. Por eso `walls[i]` describe el lado que arranca en
 * `points[i]`. Un "murito" es simplemente una pared con `height` chico.
 */
export interface Wall {
  /** Altura de la pared en metros. Un murito = altura baja (ej. 1.1). */
  height: number;
  /** Grosor de la pared en metros. */
  thickness: number;
  /** Material aplicado a la cara interior (textura de azulejos), o null. */
  materialId: string | null;
  /** Huecos en esta pared (puertas/ventanas). */
  openings: Opening[];
  /** Zonas de revestimiento parcial (azulejo distinto en un rectángulo). */
  tileRegions?: TileRegion[];
  /** Forzar transparencia (además del desvanecido automático por cámara). */
  transparent?: boolean;
}

/** Un objeto colocado en la escena: inodoro, mampara, mueble, etc. */
export interface Item {
  id: string;
  /** Referencia al modelo glTF/GLB del catálogo. */
  modelRef: string;
  /** Posición en el espacio (x,z = planta; y = altura). */
  position: { x: number; y: number; z: number };
  /** Rotación alrededor del eje vertical, en radianes. */
  rotationY: number;
  /** Tamaño real en metros. El render escala el modelo para entrar en esta caja. */
  size: Size;
  /**
   * Solo mampara: altura del murete macizo inferior, en metros (el resto es
   * cristal). 0 o ausente = mampara de cristal completa.
   */
  baseHeight?: number;
  /** Solo mampara: azulejo (Material) que reviste el murete, o ausente. */
  baseMaterialId?: string;
  /** Solo plato de ducha: posición del desagüe (default "center"). */
  drainPosition?: DrainPosition;
  /** Solo espejo: forma (default "square"). */
  mirrorShape?: MirrorShape;
  /** Solo mueble/estantería: textura de madera (Material) aplicada, o ausente. */
  materialId?: string;
  /** Solo estantería: dibujar puertas que tapan el frente (default false). */
  doors?: boolean;
}

/**
 * Material basado en una foto subida por el usuario (ej. azulejos).
 * `src` es un object URL / data URL de la imagen.
 */
export interface Material {
  id: string;
  src: string;
  /** Ancho real de UN azulejo, en metros (eje horizontal). */
  tileWidth: number;
  /** Largo/alto real de UN azulejo, en metros (eje vertical). */
  tileHeight: number;
}

/**
 * El diseño completo del baño. Es 100% serializable a JSON: este objeto es lo
 * que guardás / cargás / exportás. El 3D es solo una proyección de esto.
 *
 * Invariante: `walls.length === points.length`. La pared `i` conecta
 * `points[i]` con `points[(i + 1) % points.length]`, cerrando el polígono.
 */
export interface Design {
  points: Point2[];
  walls: Wall[];
  items: Item[];
  materials: Record<string, Material>;
  /** Material del piso (textura), o null. */
  floorMaterialId: string | null;
}
