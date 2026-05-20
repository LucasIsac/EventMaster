import { ConstantGenerator, ListGenerator, UniformGenerator, ExponentialGenerator } from '../utils/generators.js';
import { parseTimeInput } from '../utils/timeParser.js';

// Posibles estados del servidor
export const ServerState = {
  IDLE: 'LIBRE',
  BUSY: 'OCUPADO',
  BREAK: 'AUSENTE'
};

// Topologías del sistema
export const SystemTopology = {
  ISOLATED: 'AISLADOS', // Sistemas independientes en paralelo
  SINGLE_QUEUE: 'COLA_UNICA', // Cola única, múltiples servidores (Supermercado)
  CHAINED: 'ENCADENADOS' // Puestos sucesivos (Secuencial)
};

// Prioridades de los clientes
export const ClientPriority = {
  NORMAL: 'A',
  VIP: 'B'
};

// Tipos de eventos para la Lista de Eventos Futuros (FEL)
export const EventType = {
  ARRIVAL: 'LLEGADA',
  ARRIVAL_VIP: 'LLEGADA_VIP',
  SERVICE_END: 'FIN_SERVICIO',
  SERVER_BREAK_START: 'SALIDA_SERVIDOR',
  SERVER_BREAK_END: 'LLEGADA_SERVIDOR',
  ABANDONMENT: 'ABANDONO',
  ENTER_SZ: 'ENTER_SZ', // Entrada a Zona de Seguridad
  ARRIVAL_PS: 'LLEGADA_PS' // Llegada al Punto de Servicio
};

let clientIdCounter = 0;
let eventIdCounter = 0;

// Reinicia los contadores globales
export function resetCounters() {
  clientIdCounter = 0;
  eventIdCounter = 0;
}

/**
 * Crea un evento para la FEL.
 */
function createEvent(time, type, data = {}) {
  const priorities = {
    [EventType.SERVICE_END]: 1,
    [EventType.SERVER_BREAK_END]: 2,
    [EventType.ARRIVAL_VIP]: 3,
    [EventType.ARRIVAL]: 4,
    [EventType.SERVER_BREAK_START]: 5,
    [EventType.ABANDONMENT]: 5
  };
  return {
    id: ++eventIdCounter,
    time,
    type,
    data,
    priority: priorities[type] || 99
  };
}

/**
 * Representa un puesto de servicio (servidor).
 */
class Server {
  constructor(id, generators) {
    this.id = id;
    this.state = ServerState.IDLE;
    this.present = true;
    this.clientInService = null;
    this.serviceEndTime = null;
    this.nextBreakTime = null;
    this.nextWorkTime = null;
    this.pausedServiceRemaining = null;
    this.pausedClient = null;
    this.generators = generators;
    this.clientsServed = 0;
    this.busyTime = 0;
    this.lastStateChange = 0;
    this.queue = [];
  }

  updateBusyTime(currentTime) {
    if (this.state === ServerState.BUSY) {
      this.busyTime += (currentTime - this.lastStateChange);
    }
    this.lastStateChange = currentTime;
  }

  setState(newState, currentTime) {
    this.updateBusyTime(currentTime);
    this.state = newState;
  }
}

/**
 * Clase principal que gestiona la lógica de la simulación por eventos discretos.
 */
export class Simulator {
  constructor(config, flags, initialState = {}, generators = {}) {
    this.config = { ...config };
    this.flags = { ...flags };
    this.disableArrivals = flags.disableArrivals || false;
    this.topology = config.topology || SystemTopology.SINGLE_QUEUE;
    this.numServers = parseInt(config.numServers) || 1;

    /**
     * Helper para obtener un generador basado en un valor de entrada.
     */
    const getGenerator = (inputValue, distType = 'uniform') => {
      const parsed = parseTimeInput(String(inputValue));
      
      if (!parsed || parsed.error) {
        return new ConstantGenerator(parseFloat(inputValue) || 0);
      }

      switch (parsed.mode) {
        case 'constant':
          return new ConstantGenerator(parsed.value);
        case 'list':
          return new ListGenerator(parsed.values);
        case 'range':
          if (distType === 'exponential') {
            const mean = (parsed.min + parsed.max) / 2;
            return new ExponentialGenerator(mean);
          }
          return new UniformGenerator(parsed.min, parsed.max);
        default:
          return new ConstantGenerator(0);
      }
    };

    const arrIntervals = Array.isArray(this.config.arrivalInterval) ? this.config.arrivalInterval : [this.config.arrivalInterval];
    const srvIntervals = Array.isArray(this.config.serviceTime) ? this.config.serviceTime : [this.config.serviceTime];

    this.arrivalGenerators = arrIntervals.map((val) => getGenerator(val || this.config.arrivalInterval, this.config.arrivalDistType || 'uniform'));
    this.serviceGenerators = srvIntervals.map((val) => getGenerator(val || this.config.serviceTime, this.config.serviceDistType || 'uniform'));

    this.generators = {
      arrival: this.arrivalGenerators[0],
      service: this.serviceGenerators[0],
      breakDuration: generators.breakDuration || getGenerator(this.config.restTime, this.config.restDistType || 'uniform'),
      travel: generators.travel || getGenerator(this.config.travelTime, this.config.travelDistType || 'uniform'),
      workDuration: getGenerator(this.config.workTime, this.config.workDistType || 'uniform'),
      patience: getGenerator(this.config.maxWaitTime, this.config.patienceDistType || 'uniform'),
    };

    this.initialState = initialState;
    this.clock = this.config.startTime;
    this.fel = [];
    
    // En topología CHAINED o ISOLATED, podríamos tener múltiples colas.
    // Para simplificar esta versión inicial, mantendremos colas globales que se usan según topología.
    this.queues = {
      default: [],
      vip: []
    };

    // Inicializar servidores
    this.servers = Array.from({ length: this.numServers }, (_, i) => new Server(i + 1, this.generators));
    
    this.szBusy = false; // Zona de Seguridad

    this.stats = {
      clientsServed: 0,
      clientsAbandoned: 0,
      abandonmentsFirstHour: 0,
      clientsServedUntilSecondBreak: 0,
      workCycles: 0,
      restCycles: 0,
      totalArrivals: 0
    };

    this.history = [];
    this.checkpoints = [];
    this.checkpointSnapshots = [];
    this.firstArrivalScheduled = false;
    this.firstVipArrivalScheduled = false;

    this.#initialize();
  }

  #createClient(arrivalTime, isVip = false, initialWait = 0) {
    const vip = isVip || (this.flags.hasPriority && Math.random() < 0.3);
    const patience = this.generators.patience.next();
    return {
      id: ++clientIdCounter,
      arrivalTime: arrivalTime - initialWait, // Ajuste para clientes que ya estaban esperando
      patienceTime: patience,
      priority: vip ? ClientPriority.VIP : ClientPriority.NORMAL,
      currentStage: 0 // Para topología CHAINED
    };
  }

  #initialize() {
    resetCounters();

    const { clientsInQueue, vipClientsInQueue, initialWaitTime, serverBusy, busyUntil } = this.initialState;
    const waitTime = parseFloat(initialWaitTime) || 0;

    // Poblar colas iniciales con clientes que ya llevan tiempo esperando
    const pushToQueue = (client, isVip) => {
      if (this.topology === SystemTopology.SINGLE_QUEUE) {
        if (isVip) this.queues.vip.push(client);
        else this.queues.default.push(client);
      } else {
        this.servers[0].queue.push(client);
      }
      this.#scheduleAbandonment(client);
    };

    for (let i = 0; i < (vipClientsInQueue || 0); i++) {
      const client = this.#createClient(this.clock, true, waitTime);
      pushToQueue(client, true);
    }
    for (let i = 0; i < (clientsInQueue || 0); i++) {
      const client = this.#createClient(this.clock, false, waitTime);
      pushToQueue(client, false);
    }

    // Estado inicial de servidores
    if (serverBusy && busyUntil) {
      // Por defecto, ocupamos el primer servidor si se indica en el estado inicial global
      const s1 = this.servers[0];
      s1.setState(ServerState.BUSY, this.clock);
      s1.clientInService = this.#createClient(this.clock, false, 0);
      s1.serviceEndTime = this.clock + parseFloat(busyUntil);
      this.fel.push(createEvent(s1.serviceEndTime, EventType.SERVICE_END, {
        serverId: s1.id,
        clientId: s1.clientInService.id
      }));
    }

    this.#scheduleFirstArrivals(serverBusy, busyUntil);
    
    this.servers.forEach(server => {
      this.#scheduleWorkCycle(server);
      if (server.state === ServerState.IDLE) {
        this.#selectNextClientForServer(server);
      }
    });

    this.#recordHistory('INICIO', 'Estado inicial');
  }

  #scheduleFirstArrivals(serverBusy, busyUntil) {
    if (this.disableArrivals) return;
    const busyUntilAbs = this.config.startTime + (parseFloat(busyUntil) || 0);
    
    if (this.topology === SystemTopology.ISOLATED) {
      for (let i = 0; i < this.numServers; i++) {
        const gen = this.arrivalGenerators[i] || this.arrivalGenerators[0];
        let time = this.clock + gen.next();
        if (serverBusy && i === 0 && time < busyUntilAbs) time = busyUntilAbs + gen.next();
        if (time <= this.config.startTime + this.config.maxTime) {
          this.fel.push(createEvent(time, EventType.ARRIVAL, { serverId: this.servers[i].id }));
        }
      }
    } else {
      if (this.flags.hasPriority && !this.firstVipArrivalScheduled) {
        this.firstVipArrivalScheduled = true;
        let time = this.clock + this.generators.arrival.next();
        if (serverBusy && time < busyUntilAbs) time = busyUntilAbs + this.generators.arrival.next();
        if (time <= this.config.startTime + this.config.maxTime) {
          this.fel.push(createEvent(time, EventType.ARRIVAL_VIP, {}));
        }
      }

      if (!this.firstArrivalScheduled) {
        this.firstArrivalScheduled = true;
        let time = this.clock + this.generators.arrival.next();
        if (serverBusy && time < busyUntilAbs) time = busyUntilAbs + this.generators.arrival.next();
        if (time <= this.config.startTime + this.config.maxTime) {
          this.fel.push(createEvent(time, EventType.ARRIVAL, {}));
        }
      }
    }
  }

  #scheduleWorkCycle(server) {
    if (!this.flags.hasServerBreaks) return;
    if (server.present && server.nextBreakTime === null) {
      const duration = this.generators.workDuration.next();
      if (duration > 0) {
        server.nextBreakTime = this.clock + duration;
        this.fel.push(createEvent(server.nextBreakTime, EventType.SERVER_BREAK_START, { serverId: server.id }));
      }
    }
  }

  #scheduleNextArrival(isVip = false, serverId = null) {
    if (this.disableArrivals) return;
    const type = isVip ? EventType.ARRIVAL_VIP : EventType.ARRIVAL;
    
    if (this.topology === SystemTopology.ISOLATED && serverId !== null) {
      const serverIdx = serverId - 1;
      const gen = this.arrivalGenerators[serverIdx] || this.arrivalGenerators[0];
      const time = this.clock + gen.next();
      if (time <= this.config.startTime + this.config.maxTime) {
        this.fel.push(createEvent(time, type, { serverId }));
      }
    } else {
      if (!this.fel.some(e => e.type === type)) {
        const time = this.clock + this.generators.arrival.next();
        if (time <= this.config.startTime + this.config.maxTime) {
          this.fel.push(createEvent(time, type, {}));
        }
      }
    }
  }

  #scheduleAbandonment(client) {
    if (this.flags.hasClientAbandonment && client.patienceTime < Infinity) {
      const time = client.arrivalTime + client.patienceTime;
      // Programar abandono
      if (time >= this.clock) {
        this.fel.push(createEvent(time, EventType.ABANDONMENT, { clientId: client.id }));
      } else {
        // Si ya debería haber abandonado según el vector inicial, lo sacamos en t=0
        this.fel.push(createEvent(this.clock, EventType.ABANDONMENT, { clientId: client.id }));
      }
    }
  }

  #getNextEvent() {
    if (this.fel.length === 0) return null;
    return this.fel.reduce((min, e) =>
      e.time < min.time || (e.time === min.time && e.priority < min.priority) ? e : min
    );
  }

  #handleArrival(event, isVip = false) {
    this.stats.totalArrivals++;
    const serverId = event?.data?.serverId || null;
    const client = this.#createClient(this.clock, isVip);
    this.#scheduleNextArrival(isVip, serverId);

    // Lógica según topología
    if (this.topology === SystemTopology.SINGLE_QUEUE) {
      // Buscar servidor libre
      const freeServer = this.servers.find(s => s.state === ServerState.IDLE && s.present);
      
      if (freeServer && !this.flags.hasSecurityZone) {
        this.#startService(freeServer, client);
        this.#recordHistory(isVip ? EventType.ARRIVAL_VIP : EventType.ARRIVAL, `C${client.id} llega -> S${freeServer.id}`);
      } else {
        if (isVip) this.queues.vip.push(client);
        else this.queues.default.push(client);
        this.#scheduleAbandonment(client);
        this.#recordHistory(isVip ? EventType.ARRIVAL_VIP : EventType.ARRIVAL, `C${client.id} llega -> cola`);
      }
    } else if (this.topology === SystemTopology.ISOLATED) {
      // En aislados, el cliente va a un servidor específico
      const targetId = serverId ? serverId - 1 : Math.floor(Math.random() * this.numServers);
      const server = this.servers[targetId];
      if (server.state === ServerState.IDLE && server.present) {
        this.#startService(server, client);
      } else {
        server.queue.push(client);
        this.#scheduleAbandonment(client);
      }
      this.#recordHistory(EventType.ARRIVAL, `C${client.id} llega a Sistema Aislado ${server.id}`);
    } else if (this.topology === SystemTopology.CHAINED) {
      // Empieza en etapa 0 (Servidor 1)
      const s1 = this.servers[0];
      if (s1.state === ServerState.IDLE && s1.present) {
        this.#startService(s1, client);
      } else {
        s1.queue.push(client);
        this.#scheduleAbandonment(client);
      }
      this.#recordHistory(EventType.ARRIVAL, `C${client.id} llega -> Etapa 1 (S1)`);
    }
  }

  #startService(server, client) {
    server.setState(ServerState.BUSY, this.clock);
    server.clientInService = client;
    const gen = this.serviceGenerators[server.id - 1] || this.serviceGenerators[0];
    const duration = gen.next();
    server.serviceEndTime = this.clock + duration;
    this.fel.push(createEvent(server.serviceEndTime, EventType.SERVICE_END, { serverId: server.id, clientId: client.id }));
  }

  #handleServiceEnd(event) {
    const { serverId, clientId } = event.data;
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;

    this.stats.clientsServed++;
    server.clientsServed++;
    const client = server.clientInService;
    
    let nextAction = '';

    if (this.topology === SystemTopology.CHAINED && client.currentStage < this.numServers - 1) {
      // Pasa al siguiente servidor
      client.currentStage++;
      const nextServer = this.servers[client.currentStage];
      nextAction = `C${clientId} termina etapa ${client.currentStage} -> Etapa ${client.currentStage + 1}`;
      
      if (nextServer.state === ServerState.IDLE && nextServer.present) {
        this.#startService(nextServer, client);
      } else {
        // En chained real, habría una cola por etapa.
        nextServer.queue.push(client);
      }
    } else {
      nextAction = `C${clientId} termina servicio y sale del sistema`;
      if (this.stats.restCycles < 2) {
        this.stats.clientsServedUntilSecondBreak++;
      }
    }

    // El servidor busca nuevo cliente
    this.#selectNextClientForServer(server);
    this.#recordHistory(EventType.SERVICE_END, nextAction);
  }

  #selectNextClientForServer(server) {
    let nextClient = null;

    if (this.topology === SystemTopology.SINGLE_QUEUE) {
      nextClient = this.queues.vip.shift() || this.queues.default.shift();
    } else {
      nextClient = server.queue.shift();
    }

    if (nextClient && server.present) {
      this.#startService(server, nextClient);
    } else {
      server.setState(ServerState.IDLE, this.clock);
      server.clientInService = null;
      server.serviceEndTime = null;
    }
  }

  #handleServerBreakStart(event) {
    const server = this.servers.find(s => s.id === event.data.serverId);
    if (!server) return;

    server.updateBusyTime(this.clock);
    this.stats.workCycles++;
    server.present = false;

    if (server.state === ServerState.BUSY) {
      server.pausedServiceRemaining = server.serviceEndTime - this.clock;
      server.pausedClient = server.clientInService;
      this.fel = this.fel.filter(e => !(e.type === EventType.SERVICE_END && e.data.serverId === server.id));
      this.#recordHistory(EventType.SERVER_BREAK_START, `S${server.id} sale (C${server.pausedClient.id} pausado)`);
    } else {
      this.#recordHistory(EventType.SERVER_BREAK_START, `S${server.id} sale (LIBRE)`);
    }

    server.setState(ServerState.BREAK, this.clock);
    const breakDuration = this.generators.breakDuration.next();
    server.nextWorkTime = this.clock + breakDuration;
    this.fel.push(createEvent(server.nextWorkTime, EventType.SERVER_BREAK_END, { serverId: server.id }));
  }

  #handleServerBreakEnd(event) {
    const server = this.servers.find(s => s.id === event.data.serverId);
    if (!server) return;

    this.stats.restCycles++;
    server.present = true;
    server.nextWorkTime = null;

    if (server.pausedClient) {
      server.setState(ServerState.BUSY, this.clock);
      server.clientInService = server.pausedClient;
      server.serviceEndTime = this.clock + server.pausedServiceRemaining;
      server.pausedClient = null;
      server.pausedServiceRemaining = null;
      this.fel.push(createEvent(server.serviceEndTime, EventType.SERVICE_END, { serverId: server.id, clientId: server.clientInService.id }));
      this.#recordHistory(EventType.SERVER_BREAK_END, `S${server.id} regresa -> C${server.clientInService.id} continúa`);
    } else {
      this.#selectNextClientForServer(server);
      this.#recordHistory(EventType.SERVER_BREAK_END, `S${server.id} regresa`);
    }
    
    this.#scheduleWorkCycle(server);
  }

  #handleAbandonment(event) {
    const { clientId } = event.data;
    let client = null;
    
    const findAndRemove = (queue) => {
      const idx = queue.findIndex(c => c.id === clientId);
      if (idx !== -1) return queue.splice(idx, 1)[0];
      return null;
    };

    client = findAndRemove(this.queues.vip) || findAndRemove(this.queues.default);
    if (!client) {
      for (const server of this.servers) {
        client = findAndRemove(server.queue);
        if (client) break;
      }
    }

    if (client) {
      this.stats.clientsAbandoned++;
      if (this.clock - this.config.startTime <= 3600) {
        this.stats.abandonmentsFirstHour++;
      }
      this.#recordHistory(EventType.ABANDONMENT, `C${clientId} abandona cola`);
    }
  }

  step() {
    const event = this.#getNextEvent();
    if (!event) return false;

    const maxTimeAbs = this.config.startTime + this.config.maxTime;
    if (event.time > maxTimeAbs) return false;

    this.clock = event.time;
    this.fel = this.fel.filter(e => e.id !== event.id);

    switch (event.type) {
      case EventType.ARRIVAL: this.#handleArrival(event, false); break;
      case EventType.ARRIVAL_VIP: this.#handleArrival(event, true); break;
      case EventType.SERVICE_END: this.#handleServiceEnd(event); break;
      case EventType.SERVER_BREAK_START: this.#handleServerBreakStart(event); break;
      case EventType.SERVER_BREAK_END: this.#handleServerBreakEnd(event); break;
      case EventType.ABANDONMENT: this.#handleAbandonment(event); break;
    }

    this.#evaluateCheckpoints();

    return true;
  }

  #recordHistory(eventType, action) {
    const totalQueueLength = this.topology === SystemTopology.SINGLE_QUEUE 
      ? this.queues.default.length + this.queues.vip.length
      : this.servers.reduce((sum, s) => sum + s.queue.length, 0);
      
    const allClients = this.topology === SystemTopology.SINGLE_QUEUE 
      ? [...this.queues.vip, ...this.queues.default]
      : this.servers.flatMap(s => s.queue);

    this.history.push({
      step: this.history.length + 1,
      time: this.clock,
      eventType,
      servers: this.servers.map(s => ({
        id: s.id,
        state: s.state,
        clientId: s.clientInService?.id,
        present: s.present,
        nextBreakTime: s.nextBreakTime,
        nextWorkTime: s.nextWorkTime,
        queue: [...s.queue]
      })),
      queueLength: totalQueueLength,
      vipQueueLength: this.queues.vip.length,
      commonQueueLength: this.queues.default.length,
      queueClients: allClients.map(c => ({ ...c })),
      fel: this.fel.map(e => ({ ...e })),
      action
    });
  }

  addCheckpoint(name, condition, isEventBased = false) {
    this.checkpoints.push({ name, condition, isEventBased, triggered: false });
  }

  #evaluateCheckpoints() {
    for (const cp of this.checkpoints) {
      if (cp.isEventBased || !cp.triggered) {
        if (cp.condition(this)) {
          this.checkpointSnapshots.push({
            name: cp.name,
            time: this.clock,
            stats: { ...this.stats },
            queueLength: this.topology === SystemTopology.SINGLE_QUEUE ? this.queues.default.length + this.queues.vip.length : this.servers.reduce((sum, s) => sum + s.queue.length, 0),
            serverState: this.servers.length > 1 
              ? this.servers.map(s => s.state === 'OCUPADO' ? '1' : s.state === 'AUSENTE' ? 'A' : '0').join(' | ') 
              : this.servers[0].state
          });
          if (!cp.isEventBased) {
            cp.triggered = true;
          }
        }
      }
    }
  }

  /**
   * Ejecuta la simulación hasta el final.
   */
  run() {
    const MAX_STEPS = 100000;
    let steps = 0;
    while (this.step()) {
      if (++steps >= MAX_STEPS) {
        console.warn('Simulation halted: max steps limit reached.');
        break;
      }
    }
    return this.getResults();
  }

  getResults() {
    const totalTime = this.clock - this.config.startTime;
    return {
      history: this.history,
      stats: {
        ...this.stats,
        totalTime,
        serverStats: this.servers.map(s => {
          let bTime = s.busyTime;
          if (s.state === ServerState.BUSY) bTime += (this.clock - s.lastStateChange);
          return {
            id: s.id,
            utilization: totalTime > 0 ? (bTime / totalTime * 100).toFixed(1) : 0,
            clientsServed: s.clientsServed
          };
        })
      }
    };
  }

  getCurrentState() {
    const totalTime = this.clock - this.config.startTime;
    return {
      clock: this.clock,
      servers: this.servers.map(s => {
        let bTime = s.busyTime;
        if (s.state === ServerState.BUSY) bTime += (this.clock - s.lastStateChange);
        return { 
          ...s, 
          utilization: totalTime > 0 ? (bTime / totalTime * 100).toFixed(1) : 0 
        };
      }),
      queues: { ...this.queues },
      history: [...this.history],
      stats: { ...this.stats },
      checkpoints: [...this.checkpointSnapshots],
      isFinished: this.isFinished()
    };
  }

  isFinished() {
    const next = this.#getNextEvent();
    return !next || next.time > this.config.startTime + this.config.maxTime;
  }
}

export function formatTime(seconds, startTime = 0) {
  const abs = startTime + seconds;
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.floor(abs % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}