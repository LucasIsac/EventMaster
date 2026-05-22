/**
 * Parsea un string de entrada que representa tiempos (constante, lista o rango).
 * @param {string} raw - El string crudo de entrada.
 * @returns {object|null} El objeto parseado con el modo y valores, o un error.
 */
export function parseTimeInput(raw) {
  if (!raw || typeof raw !== 'string') return null;
  
  const str = raw.trim();
  if (str === '') return null;
  if (str === '∞') return { mode: 'constant', value: Infinity };
  const numberPattern = /^(?:Infinity|\d+(?:\.\d+)?|\.\d+)$/;

  // Manejo de rangos (ej: "10 - 20" o "10-20")
  const rangeMatch = str.match(/^(\d+(?:\.\d+)?|\.\d+)\s*-\s*(\d+(?:\.\d+)?|\.\d+)$/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (max > min) {
      return { mode: 'range', min, max };
    }
    return { error: 'El mínimo debe ser menor al máximo' };
  }

  if (str.includes('-') && !str.startsWith('-')) {
    return { error: 'Formato de rango inválido' };
  }

  // Manejo de listas de valores (ej: "10, 20, 30")
  if (str.includes(',')) {
    const parts = str.split(',').map(s => s.trim());
    const values = parts.map(s => parseFloat(s));
    if (values.length > 0 && values.every((n, idx) => numberPattern.test(parts[idx]) && !isNaN(n) && n >= 0)) {
      return { mode: 'list', values };
    }
    return { error: 'Formato inválido' };
  }

  // Manejo de valor constante (ej: "15")
  const num = parseFloat(str);
  if (numberPattern.test(str) && !isNaN(num) && num >= 0) return { mode: 'constant', value: num };
  
  return { error: 'Formato inválido' };
}

/**
 * Crea una función generadora basada en la entrada parseada.
 * @param {object} parsed - El resultado de parseTimeInput.
 * @param {string} distType - Tipo de distribución para rangos ('uniform' o 'exponential').
 * @returns {function} Una función que devuelve el siguiente valor.
 */
export function createValueGenerator(parsed, distType = 'uniform') {
  if (!parsed || parsed.error) return () => 0;
  
  switch (parsed.mode) {
    case 'constant':
      return () => parsed.value;
    
    case 'list': {
      let index = 0;
      return () => {
        const val = parsed.values[index];
        // Repite el último valor si se acaba la lista
        if (index < parsed.values.length - 1) index++;
        return val;
      };
    }
    
    case 'range': {
      if (distType === 'exponential') {
        const mean = (parsed.min + parsed.max) / 2;
        return () => -mean * Math.log(1 - Math.random());
      }
      return () => parsed.min + Math.random() * (parsed.max - parsed.min);
    }
    
    default:
      return () => 0;
  }
}

/**
 * Obtiene una etiqueta descriptiva del modo detectado.
 * @param {object} parsed - El resultado de parseTimeInput.
 * @returns {object|null} Un objeto con el texto de la etiqueta y su tipo.
 */
export function getModeLabel(parsed) {
  if (!parsed) return null;
  if (parsed.error) return { text: parsed.error, type: 'error' };
  
  switch (parsed.mode) {
    case 'constant': {
      const displayVal = parsed.value === Infinity ? '∞' : parsed.value;
      return { text: `Constante: ${displayVal}`, type: 'constant' };
    }
    case 'list':
      return { text: `Lista: ${parsed.values.length} valores`, type: 'list' };
    case 'range':
      return { text: `Rango: ${parsed.min} - ${parsed.max}`, type: 'range' };
    default:
      return null;
  }
}
