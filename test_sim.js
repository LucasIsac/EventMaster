import { Simulator } from './src/engine/Simulator.js';
import { academicPresets } from './src/presets.js';

const preset = academicPresets.aeropuerto;
const sim = new Simulator(preset.config, preset.flags, preset.initialState);

// Set seed for consistent testing? No, Math.random is used, we'll just run it once.
const results = sim.run();

let lastSzBusy = null;
for (const step of results.history) {
    if (step.szBusy !== lastSzBusy) {
        console.log(`Time ${step.time}: szBusy changed to ${step.szBusy ? 'C' + step.securityZoneClient?.id : '0'} (Event: ${step.eventType} ${step.action})`);
        lastSzBusy = step.szBusy;
    }
    if (step.eventType === 'FIN_SERVICIO') {
        console.log(`Time ${step.time}: FIN_SERVICIO. Queue length: VIP=${step.vipQueueLength}, Normal=${step.commonQueueLength}`);
    }
}
console.log("Stats:", results.stats);
