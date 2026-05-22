// src/utils/generators.js
// Clase base abstracta para generadores de valores
export class Generator {
  next() { throw new Error("Método abstracto no implementado"); }
  getDesc() { return ""; }
}

/**
 * Genera siempre el mismo valor constante.
 * Uso: new ConstantGenerator(45) → siempre devuelve 45
 */
export class ConstantGenerator extends Generator {
  constructor(value = 0) {
    super();
    this.value = value;
  }
  next() { return this.value; }
  getDesc() { return `(constante: ${this.value})`; }
}

/**
 * Recorre una lista de valores. Al terminar, repite el último.
 * Esto permite reproducir exactamente las tablas manuales de ejercicios prácticos.
 * Uso: new ListGenerator([30, 45, 60]) → 30, 45, 60, 60, 60, ...
 */
export class ListGenerator extends Generator {
  constructor(values = []) {
    super();
    this.values = values;
    this.index = 0;
  }
  next() {
    if (this.index < this.values.length) {
      return this.values[this.index++];
    }
    return this.values.length > 0 ? this.values[this.values.length - 1] : 0;
  }
  reset() { this.index = 0; }
  getDesc() { return `(lista: [${this.values.join(', ')}])`; }
}

/**
 * Genera valores con distribución exponencial. Para simulaciones M/M/1.
 * Uso: new ExponentialGenerator(45) → valores aleatorios con media 45
 */
export class ExponentialGenerator extends Generator {
  constructor(mean = 1) {
    super();
    this.mean = mean;
  }
  next() {
    // Transformada inversa para distribución exponencial
    return -this.mean * Math.log(1 - Math.random());
  }
  getDesc() { return `(exponencial, media: ${this.mean})`; }
}

/**
 * Genera valores con distribución uniforme en un rango [min, max].
 * Uso: new UniformGenerator(10, 20) → valores aleatorios entre 10 y 20
 */
export class UniformGenerator extends Generator {
  constructor(min = 0, max = 0) {
    super();
    this.min = min;
    this.max = max;
  }
  next() {
    return this.min + Math.random() * (this.max - this.min);
  }
  getDesc() { return `(uniforme: ${this.min} - ${this.max})`; }
}

/**
 * Fábrica para crear generadores desde un tipo y un valor.
 * @param {string} type - 'constant' | 'list' | 'exponential' | 'uniform'
 * @param {number|array|object} value - Valor único, array de valores, o un objeto/rango {min, max}
 * @returns {Generator} Una instancia de una subclase de Generator.
 */
export function createGenerator(type, value) {
  switch (type) {
    case 'constant':    return new ConstantGenerator(value);
    case 'list':        return new ListGenerator(Array.isArray(value) ? value : [value]);
    case 'exponential': return new ExponentialGenerator(value);
    case 'uniform':
      if (Array.isArray(value)) {
        return new UniformGenerator(value[0], value[1]);
      } else if (value && typeof value === 'object') {
        return new UniformGenerator(value.min, value.max);
      }
      return new UniformGenerator(0, value);
    default:            return new ConstantGenerator(value);
  }
}