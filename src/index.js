// src/index.js
// Archivo de barril para facilitar las exportaciones de la lógica del motor

// Exportación del simulador y sus tipos
export { Simulator } from './engine/Simulator.js';
export { ServerState, ClientPriority, EventType } from './engine/Simulator.js';

// Exportación de los generadores de números aleatorios
export {
  Generator,
  ConstantGenerator,
  ListGenerator,
  ExponentialGenerator,
  createGenerator
} from './utils/generators.js';