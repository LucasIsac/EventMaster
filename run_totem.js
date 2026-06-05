import { Simulator } from './src/engine/Simulator.js';
import { academicPresets } from './src/presets.js';

const preset = academicPresets.nuevo_ejercicio_totem;

const sim = new Simulator(
  preset.config,
  preset.flags,
  preset.initialState,
  {}
);

sim.run();
const results = sim.getResults();

console.log("=== RESULTADOS DEL EJERCICIO ===");
console.log(`Llegadas totales: ${results.stats.totalArrivals}`);
console.log(`Atendidos: ${results.stats.clientsServed}`);
console.log(`Abandonos totales: ${results.stats.clientsAbandoned}`);
console.log(`Abandonos en Fila del Tótem: ${results.stats.abandonedTotem}`);
console.log(`Abandonos en Sala de Espera: ${results.stats.abandonedWaitingRoom}`);
console.log("================================");
