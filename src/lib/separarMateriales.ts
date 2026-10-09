import type { CatalogoProducto } from '../types';

// Detecta productos que mezclan Piqué y Algodón en el nombre ("Remera
// Algodon-Pique", "Chomba Pique/Algodon", "CHOMBA PIQUÉ Y ALGODÓN"...) y
// arma los dos productos en los que se dividen.

const PIQUE = 'piqu[eé]';
const ALGODON = 'algod[oó]n';
// Separadores entre los dos materiales: guión, barra, coma o la palabra "y".
const SEP = '\\s*(?:[-/,]|\\s+y\\s+)\\s*';
// \b no sirve con letras acentuadas ("piqué"): se delimita por letras Unicode.
const palabra = (p: string) => `(?<!\\p{L})${p}(?!\\p{L})`;

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const combinaPiqueYAlgodon = (nombre: string): boolean => {
  const n = sinAcentos(nombre);
  return /\bpique\b/.test(n) && /\balgodon\b/.test(n);
};

/** Quita del nombre el material que sobra, junto con el separador que lo une al otro. */
const quitarMaterial = (nombre: string, quitar: string): string => {
  const conSepAntes = new RegExp(`${SEP}${palabra(quitar)}`, 'iu');
  const conSepDespues = new RegExp(`${palabra(quitar)}${SEP}`, 'iu');
  const solo = new RegExp(palabra(quitar), 'iu');
  const resultado = conSepAntes.test(nombre)
    ? nombre.replace(conSepAntes, '')
    : conSepDespues.test(nombre)
      ? nombre.replace(conSepDespues, '')
      : nombre.replace(solo, '');
  return resultado.replace(/\s{2,}/g, ' ').trim();
};

export interface PropuestaSeparacion {
  original: CatalogoProducto;
  nombrePique: string;
  nombreAlgodon: string;
  /** Motivo por el que no se puede aplicar (p. ej. el nombre ya existe). */
  conflicto?: string;
}

export const detectarCombinados = (productos: CatalogoProducto[]): PropuestaSeparacion[] => {
  const existentes = new Set(productos.map(p => sinAcentos(p.nombre).trim()));
  return productos
    .filter(p => combinaPiqueYAlgodon(p.nombre))
    .map(original => {
      const nombrePique = quitarMaterial(original.nombre, ALGODON);
      const nombreAlgodon = quitarMaterial(original.nombre, PIQUE);
      const repetidos = [nombrePique, nombreAlgodon].filter(n => existentes.has(sinAcentos(n).trim()));
      return {
        original,
        nombrePique,
        nombreAlgodon,
        conflicto: repetidos.length
          ? `Ya existe un producto llamado ${repetidos.map(n => `"${n}"`).join(' y ')}`
          : undefined,
      };
    });
};
