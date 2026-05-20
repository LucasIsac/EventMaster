import { describe, it, expect, beforeEach } from 'vitest';
import { Simulator, SystemTopology, ServerState } from './Simulator.js';

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
});
