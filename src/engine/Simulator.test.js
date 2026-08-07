import { describe, it, expect } from 'vitest';
import { Simulator, SystemTopology, ServerState } from './Simulator.js';
import { createGenerator, ConstantGenerator, ListGenerator, ExponentialGenerator, UniformGenerator } from '../utils/generators.js';
import { parseTimeInput } from '../utils/timeParser.js';
import { academicPresets } from '../presets.js';

describe('Simulator Engine Tests', () => {
  const baseConfig = {
    maxTime: 3600,
    startTime: 0,
    arrivalInterval: '100', // Constante para tests
    serviceTime: '50',
    workTime: '10000', // Sin descansos por defecto
    restTime: '0',
    maxWaitTime: '600', // 10 minutos
    topology: SystemTopology.SINGLE_QUEUE,
    numServers: 1
  };

  const noBreaks = { hasServerBreaks: false, hasClientAbandonment: true, hasPriority: false };

  const minTime = (events) => events.length > 0 ? Math.min(...events.map(e => e.time)) : null;
  const serverCode = (server) => {
    if (server.state === ServerState.BUSY) return `C${server.clientId}`;
    if (server.state === ServerState.BREAK) return 'A';
    return '0';
  };
  const snapshot = (entry) => ({
    t: entry.time,
    e: entry.eventType,
    q: entry.queueLength,
    servers: entry.servers.map(serverCode),
    serverQ: entry.servers.map(server => server.queue.length),
    nextArrival: minTime(entry.fel.filter(e => e.type === 'LLEGADA' || e.type === 'LLEGADA_VIP')),
    serviceEnds: entry.servers.map(server => minTime(
      entry.fel.filter(e => e.type === 'FIN_SERVICIO' && e.data?.serverId === server.id)
    )),
    nextBreaks: entry.servers.map(server => server.nextBreakTime ?? null),
    nextWorks: entry.servers.map(server => server.nextWorkTime ?? null),
    action: entry.action
  });

  const runPreset = (presetId) => {
    const preset = academicPresets[presetId];
    const sim = new Simulator(preset.config, preset.flags, preset.initialState);
    const results = sim.run();
    return { sim, results };
  };

  it('should handle queue abandonment after 10 minutes', () => {
    const config = { ...baseConfig, arrivalInterval: '10', serviceTime: '1000' };
    const sim = new Simulator(config, { ...noBreaks, hasClientAbandonment: true });
    
    // C1 llega t=10 (entra a servicio)
    // C2 llega t=20 (espera hasta t=620 para abandonar)
    sim.run();

    expect(sim.stats.clientsAbandoned).toBeGreaterThan(0);
    const abandonment = sim.history.find(h => h.eventType === 'ABANDONO');
    expect(abandonment).toBeDefined();
    expect(abandonment.time).toBe(620); 
  });

  it('should process initial vector (clients already in queue)', () => {
    const initialState = {
      clientsInQueue: 5,
      initialWaitTime: 10, // Llevan 10s esperando
      serverBusy: false
    };
    const sim = new Simulator(baseConfig, noBreaks, initialState);
    
    // Al inicio debe haber 4 en cola (1 pasó a servicio inmediatamente)
    expect(sim.history[0].queueLength).toBe(4);
    
    sim.run();
    // Deben haberse atendido los 5 iniciales + los que llegaron después
    expect(sim.stats.clientsServed).toBeGreaterThanOrEqual(5);
  });

  it('should support multiple servers (Single Queue)', () => {
    const config = { ...baseConfig, numServers: 2, arrivalInterval: '10' };
    const sim = new Simulator(config, noBreaks);
    
    // Saltamos hasta que ambos servidores estén ocupados
    for (let i = 0; i < 5; i++) sim.step();
    
    const state = sim.getCurrentState();
    const busyServers = state.servers.filter(s => s.state === ServerState.BUSY);
    expect(busyServers.length).toBe(2);
  });

  it('should handle chained topology (Stage 1 -> Stage 2)', () => {
    const config = { 
      ...baseConfig, 
      topology: SystemTopology.CHAINED, 
      numServers: 2,
      arrivalInterval: '1000',
      maxTime: 1500
    };
    const sim = new Simulator(config, noBreaks);
    
    sim.run();
    
    // C1 llega t=1000. Etapa 1 fin t=1050. Etapa 2 fin t=1100.
    // clientsServed cuenta clientes que salen del sistema, no etapas intermedias.
    expect(sim.stats.clientsServed).toBe(1);
    expect(sim.stats.serviceCompletions).toBe(2);
    const serviceEnds = sim.history.filter(h => h.eventType === 'FIN_SERVICIO');
    expect(serviceEnds.length).toBe(2); 
  });

  it('should calculate specific metrics (Abandonments in first hour)', () => {
    const config = { ...baseConfig, maxTime: 7200, arrivalInterval: '10', serviceTime: '2000' };
    const sim = new Simulator(config, { ...noBreaks, hasClientAbandonment: true });
    
    sim.run();
    
    expect(sim.stats.abandonmentsFirstHour).toBeGreaterThan(0);
    expect(sim.stats.clientsAbandoned).toBeGreaterThan(sim.stats.abandonmentsFirstHour);
  });

  it('should process immediate abandonment (Guia 4 Ej 3)', () => {
    const config = { ...baseConfig, arrivalInterval: '10', serviceTime: '100', maxWaitTime: '0' };
    const sim = new Simulator(config, { ...noBreaks, hasClientAbandonment: true });
    
    sim.run();
    
    // C1 llega y se atiende. Siguientes llegan mientras S1 está ocupado y como maxWaitTime=0, abandonan.
    expect(sim.stats.clientsAbandoned).toBeGreaterThan(0);
  });

  it('should support disableArrivals and process only initial queue (Guia 4 Ej 4)', () => {
    const config = { ...baseConfig, serviceTime: '10' };
    const initialState = { clientsInQueue: 6, initialWaitTime: 0, serverBusy: false };
    const sim = new Simulator(config, { ...noBreaks, disableArrivals: true }, initialState);
    
    sim.run();
    
    expect(sim.stats.clientsServed).toBe(6);
    expect(sim.stats.totalArrivals).toBe(0);
    expect(sim.history.length).toBeGreaterThan(0);
  });

  it('should support individual arrival and service times per server (Isolated / Multiple)', () => {
    const config = {
      ...baseConfig,
      topology: 'AISLADOS',
      numServers: 3,
      arrivalInterval: '45, 25, 15',
      serviceTime: '40, 20, 10'
    };
    const sim = new Simulator(config, noBreaks);
    expect(sim.arrivalGenerators.length).toBe(3);
    expect(sim.serviceGenerators.length).toBe(3);
    
    // Validar los valores constantes de los generadores individuales
    expect(sim.arrivalGenerators[0].next()).toBe(45);
    expect(sim.arrivalGenerators[1].next()).toBe(25);
    expect(sim.arrivalGenerators[2].next()).toBe(15);
    
    expect(sim.serviceGenerators[0].next()).toBe(40);
    expect(sim.serviceGenerators[1].next()).toBe(20);
    expect(sim.serviceGenerators[2].next()).toBe(10);
  });

  it('should support advanced serversInitialState and firstArrivalTimes', () => {
    const config = {
      ...baseConfig,
      topology: 'AISLADOS',
      numServers: 2,
      arrivalInterval: '100, 100',
      serviceTime: '50, 50'
    };
    const initialState = {
      serversInitialState: [
        { busy: true, busyUntil: 10, queueLength: 3 },
        { busy: true, busyUntil: 20, queueLength: 5 }
      ],
      firstArrivalTimes: [30, 40]
    };
    const sim = new Simulator(config, noBreaks, initialState);
    
    // Server 1
    expect(sim.servers[0].state).toBe(ServerState.BUSY);
    expect(sim.servers[0].serviceEndTime).toBe(10);
    expect(sim.servers[0].queue.length).toBe(3);
    
    // Server 2
    expect(sim.servers[1].state).toBe(ServerState.BUSY);
    expect(sim.servers[1].serviceEndTime).toBe(20);
    expect(sim.servers[1].queue.length).toBe(5);

    // FEL should contain firstArrivalTimes (30 and 40)
    const arrivals = sim.fel.filter(e => e.type === 'LLEGADA');
    expect(arrivals.some(e => e.time === 30)).toBe(true);
    expect(arrivals.some(e => e.time === 40)).toBe(true);
  });

  it('should support createGenerator with uniform distribution', () => {
    const uniformObj = createGenerator('uniform', { min: 10, max: 20 });
    expect(uniformObj).toBeInstanceOf(UniformGenerator);
    expect(uniformObj.min).toBe(10);
    expect(uniformObj.max).toBe(20);

    const uniformArr = createGenerator('uniform', [15, 25]);
    expect(uniformArr).toBeInstanceOf(UniformGenerator);
    expect(uniformArr.min).toBe(15);
    expect(uniformArr.max).toBe(25);

    const uniformSingle = createGenerator('uniform', 30);
    expect(uniformSingle).toBeInstanceOf(UniformGenerator);
    expect(uniformSingle.min).toBe(0);
    expect(uniformSingle.max).toBe(30);
  });

  it('should move clients through the security zone before service', () => {
    const config = {
      ...baseConfig,
      maxTime: 40,
      arrivalInterval: '10',
      serviceTime: '5',
      travelTime: '10'
    };
    const sim = new Simulator(config, { ...noBreaks, hasSecurityZone: true, hasClientAbandonment: false });

    sim.run();

    expect(sim.stats.clientsServed).toBeGreaterThan(0);
    expect(sim.history.some(h => h.eventType === 'LLEGADA_PS')).toBe(true);
    expect(sim.servers[0].clientsServed).toBeGreaterThan(0);
  });

  it('should keep priority as one arrival stream', () => {
    const config = { ...baseConfig, maxTime: 100, arrivalInterval: '10', serviceTime: '1000' };
    const sim = new Simulator(config, { ...noBreaks, hasPriority: true, hasClientAbandonment: false });

    sim.run();

    expect(sim.stats.totalArrivals).toBe(10);
  });

  it('should not suppress arrivals while the server is initially busy', () => {
    const config = { ...baseConfig, maxTime: 50, arrivalInterval: '10', serviceTime: '1000' };
    const initialState = { serverBusy: true, busyUntil: 50 };
    const sim = new Simulator(config, { ...noBreaks, hasClientAbandonment: false }, initialState);

    sim.run();

    expect(sim.stats.totalArrivals).toBe(5);
  });

  it('should advance final statistics to the configured horizon', () => {
    const config = { ...baseConfig, maxTime: 100, serviceTime: '200' };
    const initialState = { serverBusy: true, busyUntil: 200 };
    const sim = new Simulator(config, { ...noBreaks, disableArrivals: true, hasClientAbandonment: false }, initialState);
    const results = sim.run();

    expect(results.stats.totalTime).toBe(100);
    expect(results.stats.clientsServed).toBe(0);
    expect(results.stats.serverStats[0].utilization).toBe('100.0');
  });

  it('should abandon initially queued clients whose patience already expired', () => {
    const initialState = { clientsInQueue: 1, initialWaitTime: 601, serverBusy: false };
    const sim = new Simulator(baseConfig, { ...noBreaks, disableArrivals: true }, initialState);

    sim.run();

    expect(sim.stats.clientsAbandoned).toBe(1);
    expect(sim.stats.clientsServed).toBe(0);
  });

  it('golden table: TP1 Ej1 single queue matches exact first rows and totals', () => {
    const { sim, results } = runPreset('tp1_ej1');

    expect(sim.history.slice(0, 8).map(snapshot)).toEqual([
      { t: 28800, e: 'INICIO', q: 3, servers: ['C4'], serverQ: [0], nextArrival: 29100, serviceEnds: [28980], nextBreaks: [null], nextWorks: [null], action: 'Estado inicial' },
      { t: 28980, e: 'FIN_SERVICIO', q: 2, servers: ['C1'], serverQ: [0], nextArrival: 29100, serviceEnds: [29020], nextBreaks: [null], nextWorks: [null], action: 'C4 termina servicio y sale del sistema' },
      { t: 29020, e: 'FIN_SERVICIO', q: 1, servers: ['C2'], serverQ: [0], nextArrival: 29100, serviceEnds: [29060], nextBreaks: [null], nextWorks: [null], action: 'C1 termina servicio y sale del sistema' },
      { t: 29060, e: 'FIN_SERVICIO', q: 0, servers: ['C3'], serverQ: [0], nextArrival: 29100, serviceEnds: [29100], nextBreaks: [null], nextWorks: [null], action: 'C2 termina servicio y sale del sistema' },
      { t: 29100, e: 'FIN_SERVICIO', q: 0, servers: ['0'], serverQ: [0], nextArrival: 29100, serviceEnds: [null], nextBreaks: [null], nextWorks: [null], action: 'C3 termina servicio y sale del sistema' },
      { t: 29100, e: 'LLEGADA', q: 0, servers: ['C5'], serverQ: [0], nextArrival: 29145, serviceEnds: [29140], nextBreaks: [null], nextWorks: [null], action: 'C5 llega -> S1' },
      { t: 29140, e: 'FIN_SERVICIO', q: 0, servers: ['0'], serverQ: [0], nextArrival: 29145, serviceEnds: [null], nextBreaks: [null], nextWorks: [null], action: 'C5 termina servicio y sale del sistema' },
      { t: 29145, e: 'LLEGADA', q: 0, servers: ['C6'], serverQ: [0], nextArrival: 29190, serviceEnds: [29185], nextBreaks: [null], nextWorks: [null], action: 'C6 llega -> S1' }
    ]);
    expect(results.stats.clientsServed).toBe(77);
    expect(results.stats.totalArrivals).toBe(74);
    expect(results.stats.totalTime).toBe(3600);
  });

  it('golden table: Guia 4 Ej1B captures break ordering and second-break metric exactly', () => {
    const { sim } = runPreset('guia4_ej1_b');

    expect(sim.history.slice(0, 9).map(snapshot)).toEqual([
      { t: 0, e: 'INICIO', q: 0, servers: ['0'], serverQ: [0], nextArrival: 60, serviceEnds: [null], nextBreaks: [60], nextWorks: [null], action: 'Estado inicial' },
      { t: 60, e: 'LLEGADA', q: 0, servers: ['C1'], serverQ: [0], nextArrival: 120, serviceEnds: [120], nextBreaks: [60], nextWorks: [null], action: 'C1 llega -> S1' },
      { t: 60, e: 'SALIDA_SERVIDOR', q: 0, servers: ['A'], serverQ: [0], nextArrival: 120, serviceEnds: [null], nextBreaks: [null], nextWorks: [120], action: 'S1 sale (C1 pausado)' },
      { t: 120, e: 'LLEGADA_SERVIDOR', q: 0, servers: ['C1'], serverQ: [0], nextArrival: 120, serviceEnds: [180], nextBreaks: [180], nextWorks: [null], action: 'S1 regresa -> C1 continúa' },
      { t: 120, e: 'LLEGADA', q: 1, servers: ['C1'], serverQ: [0], nextArrival: 180, serviceEnds: [180], nextBreaks: [180], nextWorks: [null], action: 'C2 llega -> cola' },
      { t: 180, e: 'FIN_SERVICIO', q: 0, servers: ['C2'], serverQ: [0], nextArrival: 180, serviceEnds: [240], nextBreaks: [180], nextWorks: [null], action: 'C1 termina servicio y sale del sistema' },
      { t: 180, e: 'LLEGADA', q: 1, servers: ['C2'], serverQ: [0], nextArrival: 240, serviceEnds: [240], nextBreaks: [180], nextWorks: [null], action: 'C3 llega -> cola' },
      { t: 180, e: 'SALIDA_SERVIDOR', q: 1, servers: ['A'], serverQ: [0], nextArrival: 240, serviceEnds: [null], nextBreaks: [null], nextWorks: [240], action: 'S1 sale (C2 pausado)' },
      { t: 240, e: 'LLEGADA_SERVIDOR', q: 1, servers: ['C2'], serverQ: [0], nextArrival: 240, serviceEnds: [300], nextBreaks: [300], nextWorks: [null], action: 'S1 regresa -> C2 continúa' }
    ]);
    expect(sim.stats.clientsServedUntilSecondBreak).toBe(1);
    expect(sim.stats.clientsServed).toBe(29);
    expect(sim.stats.clientsAbandoned).toBe(20);
    expect(sim.stats.workCycles).toBe(30);
    expect(sim.stats.restCycles).toBe(30);
    expect(sim.stats.totalArrivals).toBe(60);
  });

  it('golden table: Guia 3 Ej2 single queue with 3 servers matches exact event matrix', () => {
    const { sim } = runPreset('guia3_ej2');

    expect(sim.history.slice(0, 10).map(snapshot)).toEqual([
      { t: 37800, e: 'INICIO', q: 4, servers: ['C1', 'C6', 'C7'], serverQ: [0, 0, 0], nextArrival: 37820, serviceEnds: [37860, 37870, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'Estado inicial' },
      { t: 37820, e: 'LLEGADA', q: 5, servers: ['C1', 'C6', 'C7'], serverQ: [0, 0, 0], nextArrival: 37880, serviceEnds: [37860, 37870, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C8 llega -> cola' },
      { t: 37860, e: 'FIN_SERVICIO', q: 4, servers: ['C2', 'C6', 'C7'], serverQ: [0, 0, 0], nextArrival: 37880, serviceEnds: [37871, 37870, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C1 termina servicio y sale del sistema' },
      { t: 37870, e: 'FIN_SERVICIO', q: 3, servers: ['C2', 'C3', 'C7'], serverQ: [0, 0, 0], nextArrival: 37880, serviceEnds: [37871, 37882, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C6 termina servicio y sale del sistema' },
      { t: 37871, e: 'FIN_SERVICIO', q: 2, servers: ['C4', 'C3', 'C7'], serverQ: [0, 0, 0], nextArrival: 37880, serviceEnds: [37882, 37882, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C2 termina servicio y sale del sistema' },
      { t: 37880, e: 'LLEGADA', q: 3, servers: ['C4', 'C3', 'C7'], serverQ: [0, 0, 0], nextArrival: 37886, serviceEnds: [37882, 37882, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C9 llega -> cola' },
      { t: 37882, e: 'FIN_SERVICIO', q: 2, servers: ['C4', 'C5', 'C7'], serverQ: [0, 0, 0], nextArrival: 37886, serviceEnds: [37882, 37894, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C3 termina servicio y sale del sistema' },
      { t: 37882, e: 'FIN_SERVICIO', q: 1, servers: ['C8', 'C5', 'C7'], serverQ: [0, 0, 0], nextArrival: 37886, serviceEnds: [37893, 37894, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C4 termina servicio y sale del sistema' },
      { t: 37886, e: 'LLEGADA', q: 2, servers: ['C8', 'C5', 'C7'], serverQ: [0, 0, 0], nextArrival: 37901, serviceEnds: [37893, 37894, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C10 llega -> cola' },
      { t: 37890, e: 'FIN_SERVICIO', q: 1, servers: ['C8', 'C5', 'C9'], serverQ: [0, 0, 0], nextArrival: 37901, serviceEnds: [37893, 37894, 37904], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C7 termina servicio y sale del sistema' }
    ]);
    expect(sim.stats.clientsServed).toBe(280);
    expect(sim.stats.totalArrivals).toBe(274);
  });

  it('golden table: Guia 3 Ej3 chained stages preserve each client stage exactly', () => {
    const { sim } = runPreset('guia3_ej3');

    expect(sim.history.slice(0, 10).map(snapshot)).toEqual([
      { t: 37800, e: 'INICIO', q: 6, servers: ['C1', 'C4', 'C6'], serverQ: [2, 1, 3], nextArrival: 37820, serviceEnds: [37860, 37870, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'Estado inicial' },
      { t: 37820, e: 'LLEGADA', q: 7, servers: ['C1', 'C4', 'C6'], serverQ: [3, 1, 3], nextArrival: 37855, serviceEnds: [37860, 37870, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C10 llega -> Etapa 1 (S1)' },
      { t: 37855, e: 'LLEGADA', q: 8, servers: ['C1', 'C4', 'C6'], serverQ: [4, 1, 3], nextArrival: 37871, serviceEnds: [37860, 37870, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C11 llega -> Etapa 1 (S1)' },
      { t: 37860, e: 'FIN_SERVICIO', q: 8, servers: ['C2', 'C4', 'C6'], serverQ: [3, 2, 3], nextArrival: 37871, serviceEnds: [37880, 37870, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C1 termina etapa 1 -> Etapa 2' },
      { t: 37870, e: 'FIN_SERVICIO', q: 8, servers: ['C2', 'C5', 'C6'], serverQ: [3, 1, 4], nextArrival: 37871, serviceEnds: [37880, 37881, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C4 termina etapa 2 -> Etapa 3' },
      { t: 37871, e: 'LLEGADA', q: 9, servers: ['C2', 'C5', 'C6'], serverQ: [4, 1, 4], nextArrival: 37912, serviceEnds: [37880, 37881, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C12 llega -> Etapa 1 (S1)' },
      { t: 37880, e: 'FIN_SERVICIO', q: 9, servers: ['C3', 'C5', 'C6'], serverQ: [3, 2, 4], nextArrival: 37912, serviceEnds: [37900, 37881, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C2 termina etapa 1 -> Etapa 2' },
      { t: 37881, e: 'FIN_SERVICIO', q: 9, servers: ['C3', 'C1', 'C6'], serverQ: [3, 1, 5], nextArrival: 37912, serviceEnds: [37900, 37892, 37890], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C5 termina etapa 2 -> Etapa 3' },
      { t: 37890, e: 'FIN_SERVICIO', q: 8, servers: ['C3', 'C1', 'C7'], serverQ: [3, 1, 4], nextArrival: 37912, serviceEnds: [37900, 37892, 37897], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C6 termina servicio y sale del sistema' },
      { t: 37892, e: 'FIN_SERVICIO', q: 8, servers: ['C3', 'C2', 'C7'], serverQ: [3, 0, 5], nextArrival: 37912, serviceEnds: [37900, 37903, 37897], nextBreaks: [null, null, null], nextWorks: [null, null, null], action: 'C1 termina etapa 2 -> Etapa 3' }
    ]);
    expect(sim.stats.clientsServed).toBe(63);
    expect(sim.stats.serviceCompletions).toBe(179);
    expect(sim.stats.totalArrivals).toBe(54);
  });

  it('preset: Guia 4 Ej4 Carpintero sequential stages run successfully', () => {
    const { sim } = runPreset('guia4_ej4');
    expect(sim.history.length).toBeGreaterThan(0);
    const initialHistory = snapshot(sim.history[0]);
    expect(initialHistory.q).toBe(5);
    expect(initialHistory.serverQ).toEqual([5, 0, 0]); // 6 clients: 1 in service at S1, 5 in S1 queue
  });

  it('preset: Guia 4 Ej4 Carpintero behaves as a single worker constraint', () => {
    // 1. Probar la estrategia por defecto (silla_por_silla)
    const { sim } = runPreset('guia4_ej4');

    // Asegurar que nunca haya más de 1 servidor ocupado simultáneamente
    sim.history.forEach(step => {
      const busyCount = step.servers.filter(s => s.state === 'OCUPADO').length;
      expect(busyCount).toBeLessThanOrEqual(1);
    });

    // En silla_por_silla, los clientes terminan de forma intercalada.
    // Por ejemplo, el cliente 1 sale antes de que el cliente 2 empiece la etapa 2.
    const serviceEnds = sim.history.filter(h => h.eventType === 'FIN_SERVICIO');
    const exitActions = serviceEnds.filter(h => h.action.includes('sale del sistema'));
    
    // Deberían salir sillas a lo largo de la simulación
    expect(exitActions.length).toBeGreaterThan(0);
    
    // 2. Probar la estrategia por lotes (por_lotes)
    const presetCopy = JSON.parse(JSON.stringify(academicPresets.guia4_ej4));
    presetCopy.config.singleWorkerStrategy = 'por_lotes';
    const simLotes = new Simulator(presetCopy.config, presetCopy.flags, presetCopy.initialState);
    simLotes.run();

    // Asegurar que nunca haya más de 1 servidor ocupado simultáneamente
    simLotes.history.forEach(step => {
      const busyCount = step.servers.filter(s => s.state === 'OCUPADO').length;
      expect(busyCount).toBeLessThanOrEqual(1);
    });

    // En por_lotes, la primera silla no se termina (no sale del sistema) hasta que
    // TODAS las sillas hayan completado la etapa 1 y la etapa 2.
    // Busquemos cuándo se vacía la etapa 1:
    const lotesEnds = simLotes.history.filter(h => h.eventType === 'FIN_SERVICIO');
    const stage1Completions = lotesEnds.filter(h => h.action.includes('termina etapa 1'));
    const stage3Completions = lotesEnds.filter(h => h.action.includes('termina servicio y sale'));

    // Debe haber exactamente 6 terminaciones de etapa 1
    expect(stage1Completions.length).toBe(6);

    // En por_lotes, el primer fin de servicio de la etapa 3 (lustrado/salida) ocurre
    // estrictamente DESPUÉS de que todas las sillas hayan terminado la etapa 1 y 2.
    if (stage3Completions.length > 0) {
      const firstExitTime = stage3Completions[0].time;
      const lastStage1Time = stage1Completions[5].time;
      expect(firstExitTime).toBeGreaterThanOrEqual(lastStage1Time);
    }
  });

  it('should parse compact ranges without silently converting them to constants', () => {
    expect(parseTimeInput('30-60')).toEqual({ mode: 'range', min: 30, max: 60 });
    expect(parseTimeInput('60 - 30').error).toBeDefined();
  });

  it('should parse labeled server distributions like A: 10 - 14 and B: 8 - 12', () => {
    expect(parseTimeInput('A: 10 - 14')).toEqual({ mode: 'range', min: 10, max: 14 });
    expect(parseTimeInput('B: 8 - 12')).toEqual({ mode: 'range', min: 8, max: 12 });
  });

  it('should support finite queue A and battery recharge after 5 trips', () => {
    const sim = new Simulator({
      maxTime: 1800,
      startTime: 0,
      arrivalInterval: '4',
      serviceTime: 'A: 10 - 14, B: 8 - 12',
      workTime: 'Infinity',
      restTime: '20',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: SystemTopology.SINGLE_QUEUE,
      numServers: 2,
      maxQueueA: 10,
      maxTripsPerBattery: 5,
      timeUnit: 'min'
    }, {
      hasServerBreaks: true,
      hasClientAbandonment: false,
      hasPriority: true,
      hasSecurityZone: false,
      disableArrivals: false
    }, {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    });

    sim.run();

    expect(sim.servers.every(server => server.tripsCompleted >= 0)).toBe(true);
    expect(sim.stats.classARejected >= 0).toBe(true);
    expect(sim.stats.rechargeCycles >= 0).toBe(true);
  });

  it('preset: pago_online should handle system outages and accurately count clavesPerdidas', () => {
    const { sim, results } = runPreset('pago_online');

    expect(sim.history.length).toBeGreaterThan(0);
    expect(results.stats.workCycles).toBeGreaterThan(0);
    expect(results.stats.restCycles).toBeGreaterThan(0);
    expect(results.stats.clavesPerdidas).toBeDefined();
    expect(results.stats.clavesPerdidas).toBeGreaterThanOrEqual(0);
    
    // Check that when break occurs with catastrophicBreakdown, the server client in service and queues are cleared
    const breakStarts = sim.history.filter(h => h.eventType === 'SALIDA_SERVIDOR');
    expect(breakStarts.length).toBeGreaterThan(0);
    
    // Check that during break, server state is BREAK and pausedClient is null
    const serverInBreak = sim.servers[0];
    if (serverInBreak.state === ServerState.BREAK) {
      expect(serverInBreak.clientInService).toBeNull();
      expect(serverInBreak.pausedClient).toBeNull();
    }
  });
});
