import { describe, it, expect, beforeEach } from 'vitest';
import { Simulator, SystemTopology, ServerState } from './Simulator.js';
import { createGenerator, ConstantGenerator, ListGenerator, ExponentialGenerator, UniformGenerator } from '../utils/generators.js';

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
    // clientsServed cuenta cada fin de servicio (1 por etapa)
    expect(sim.stats.clientsServed).toBe(2);
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
});
