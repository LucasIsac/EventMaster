// src/utils/generators.js
// Equivalente a seriat/utils/generators.py

export class Generator {
  next() { throw new Error("Abstract method"); }
  getDesc() { return ""; }
}

/**
 * Genera siempre el mismo valor constante.
 * Equivalente a ConstantGenerator de Seriat.
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
 * Equivalente a ListGenerator de Seriat (repeat_last: true).
 * Uso: new ListGenerator([30, 45, 60]) → 30, 45, 60, 60, 60, ...
 * Esto permite reproducir exactamente las tablas manuales del TP.
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
 * Genera valores con distribución exponencial. Para simulaciones M/M/1 reales.
 * Uso: new ExponentialGenerator(45) → valores aleatorios con media 45
 */
export class ExponentialGenerator extends Generator {
  constructor(mean = 1) {
    super();
    this.mean = mean;
  }
  next() {
    return -this.mean * Math.log(1 - Math.random());
  }
  getDesc() { return `(exponencial, media: ${this.mean})`; }
}

/**
 * Factory para crear generadores desde un string de tipo.
 * type: 'constant' | 'list' | 'exponential'
 * value: número para constant/exponential, array para list
 */
export function createGenerator(type, value) {
  switch (type) {
    case 'constant':    return new ConstantGenerator(value);
    case 'list':        return new ListGenerator(Array.isArray(value) ? value : [value]);
    case 'exponential': return new ExponentialGenerator(value);
    default:            return new ConstantGenerator(value);
  }
}