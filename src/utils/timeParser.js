export function parseTimeInput(raw) {
  if (!raw || typeof raw !== 'string') return null;
  
  const str = raw.trim();
  if (str === '') return null;

  if (str.includes(' - ')) {
    const parts = str.split(' - ').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > parts[0]) {
      return { mode: 'range', min: parts[0], max: parts[1] };
    }
    return { error: 'El mínimo debe ser menor al máximo' };
  }

  if (str.includes(',')) {
    const values = str.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (values.length > 0) return { mode: 'list', values };
    return { error: 'Formato inválido' };
  }

  const num = parseFloat(str);
  if (!isNaN(num)) return { mode: 'constant', value: num };
  
  return { error: 'Formato inválido' };
}

export function createValueGenerator(parsed, distType = 'uniform') {
  if (!parsed || parsed.error) return () => 0;
  
  switch (parsed.mode) {
    case 'constant':
      return () => parsed.value;
    
    case 'list': {
      let index = 0;
      return () => {
        const val = parsed.values[index];
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