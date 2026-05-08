/**
 * Parsea un string de entrada que representa tiempos (constante, lista o rango).
 * @param {string} raw - El string crudo de entrada.
 * @returns {object|null} El objeto parseado con el modo y valores, o un error.
 */
export function parseTimeInput(raw) {
  if (!raw || typeof raw !== 'string') return null;
  
  const str = raw.trim();
  if (str === '') return null;

  // Manejo de rangos (ej: "10 - 20")
  if (str.includes(' - ')) {
    const parts = str.split(' - ').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > parts[0]) {
      return { mode: 'range', min: parts[0], max: parts[1] };
    }
    return { error: 'El mínimo debe ser menor al máximo' };
  }

  // Manejo de listas de valores (ej: "10, 20, 30")
  if (str.includes(',')) {
    const values = str.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (values.length > 0) return { mode: 'list', values };
    return { error: 'Formato inválido' };
  }

  // Manejo de valor constante (ej: "15")
  const num = parseFloat(str);
  if (!isNaN(num)) return { mode: 'constant', value: num };
  
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
    case 'constant':
      return { text: `Constante: ${parsed.value}`, type: 'constant' };
    case 'list':
      return { text: `Lista: ${parsed.values.length} valores`, type: 'list' };
    case 'range':
      return { text: `Rango: ${parsed.min} - ${parsed.max}`, type: 'range' };
    default:
      return null;
  }
}