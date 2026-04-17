import { ConstantGenerator, ListGenerator, UniformGenerator, ExponentialGenerator } from '../utils/generators.js';

export const ServerState = {
  IDLE: 'LIBRE',
  BUSY: 'OCUPADO',
  BREAK: 'AUSENTE'
};

export const ClientPriority = {
  NORMAL: 'A',
  VIP: 'B'
};

export const EventType = {
  ARRIVAL: 'LLEGADA',
  ARRIVAL_VIP: 'LLEGADA_VIP',
  SERVICE_END: 'FIN_SERVICIO',
  SERVER_BREAK_START: 'SALIDA_SERVIDOR',
  SERVER_BREAK_END: 'LLEGADA_SERVIDOR',
  ABANDONMENT: 'ABANDONO',
  ENTER_SZ: 'ENTER_SZ',
  ARRIVAL_PS: 'LLEGADA_PS'
};

let clientIdCounter = 0;
let eventIdCounter = 0;

export function resetCounters() {
  clientIdCounter = 0;
  eventIdCounter = 0;
}

function createClient(arrivalTime, config, flags, isVip = false) {
  const vip = isVip || (flags.hasPriority && Math.random() < 0.3);
  return {
    id: ++clientIdCounter,
    arrivalTime,
    patienceTime: config.maxWaitTime,
    priority: vip ? ClientPriority.VIP : ClientPriority.NORMAL
  };
}

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

export class Simulator {
  constructor(config, flags, initialState = {}, generators = {}) {
    this.config = { ...config };
    this.flags = { ...flags };

    // Helper to parse value and detect type
    const parseInputValue = (value, distType = 'uniform') => {
      if (typeof value !== 'string') {
        return { mode: 'constant', value: Number(value) || 0 };
      }
      
      const trimmed = value.trim();
      
      // Lista: contiene coma
      if (trimmed.includes(',')) {
        const arr = trimmed.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        if (arr.length > 0) {
          return { mode: 'list', values: arr };
        }
      }
      
      // Rango: contiene guion (como "10-20" o "10 - 20")
      if (trimmed.includes('-')) {
        const parts = trimmed.split('-').map(v => parseFloat(v.trim()));
        const min = parts[0];
        const max = parts[1];
        if (!isNaN(min) && !isNaN(max) && max > min) {
          if (distType === 'exponential') {
            // Exponencial: usar promedio como media
            const mean = (min + max) / 2;
            return { mode: 'exponential', value: mean };
          }
          return { mode: 'uniform', min, max };
        }
      }
      
      // Constante: número simple
      const num = Number(trimmed);
      if (!isNaN(num)) {
        return { mode: 'constant', value: num };
      }
      
      return { mode: 'constant', value: 0 }; // Fallback
    };

    // Factory para arrival
    const createArrivalGen = () => {
      const parsed = parseInputValue(this.config.arrivalInterval, this.config.arrivalDistType || 'uniform');
      switch (parsed.mode) {
        case 'list':
          return new ListGenerator(parsed.values);
        case 'uniform':
          return new UniformGenerator(parsed.min, parsed.max);
        case 'exponential':
          return new ExponentialGenerator(parsed.value);
        default:
          return new ConstantGenerator(parsed.value);
      }
    };

    // Factory para service
    const createServiceGen = () => {
      const parsed = parseInputValue(this.config.serviceTime, this.config.serviceDistType || 'uniform');
      switch (parsed.mode) {
        case 'list':
          return new ListGenerator(parsed.values);
        case 'uniform':
          return new UniformGenerator(parsed.min, parsed.max);
        case 'exponential':
          return new ExponentialGenerator(parsed.value);
        default:
          return new ConstantGenerator(parsed.value);
      }
    };

    this.generators = {
      arrival: generators.arrival || createArrivalGen(),
      service: generators.service || createServiceGen(),
      breakDuration: generators.breakDuration || new ConstantGenerator(Number(this.config.restTime) || 0),
      travel: generators.travel || new ConstantGenerator(Number(this.config.travelTime) || 0),
    };

    // Historial de tiempos de servicio para estadísticas
    this._serviceTimeHistory = [];

    this.initialState = initialState;

    this.workTime = config.workTime || 0;
    this.restTime = config.restTime || 0;

    this.clock = this.config.startTime;
    this.fel = [];
    this.queue = [];
    this.vipQueue = [];
    this.serverState = ServerState.IDLE;
    this.serverPresent = true;
    this.clientInService = null;
    this.serviceEndTime = null;
    this.nextBreakTime = null;
    this.nextWorkTime = null;
    this.szBusy = false; // Zona de Seguridad

    this.stats = {
      clientsServed: 0,
      clientsAbandoned: 0,
      clientsInQueueAtStart: 0,
      vipClientsInQueueAtStart: 0,
      workCycles: 0,
      restCycles: 0
    };

    this.history = [];
    this.pausedServiceRemaining = null;
    this.pausedClient = null;
    this.firstArrivalScheduled = false;
    this.firstVipArrivalScheduled = false;
    this._serviceTimeHistory = [];

    this.#initialize();
  }

  #initialize() {
    resetCounters();

    const { clientsInQueue, vipClientsInQueue, serverBusy, busyUntil } = this.initialState;

    this.stats.clientsInQueueAtStart = clientsInQueue || 0;
    this.stats.vipClientsInQueueAtStart = vipClientsInQueue || 0;

    for (let i = 0; i < (vipClientsInQueue || 0); i++) {
      this.vipQueue.push(createClient(this.clock, this.config, this.flags, true));
    }
    for (let i = 0; i < (clientsInQueue || 0); i++) {
      this.queue.push(createClient(this.clock, this.config, this.flags, false));
    }

    if (serverBusy && busyUntil) {
      this.serverState = ServerState.BUSY;
      this.clientInService = createClient(this.config.startTime, this.config, this.flags, Math.random() < 0.3 && this.flags.hasPriority);
      this.serviceEndTime = this.config.startTime + busyUntil;
      this.fel.push(createEvent(this.serviceEndTime, EventType.SERVICE_END, {
        clientId: this.clientInService.id
      }));
    }

    this.#scheduleFirstArrivals(serverBusy, busyUntil);
    this.#scheduleWorkCycle();

    this.#recordHistory('INICIO', 'Estado inicial');
  }

  #scheduleFirstArrivals(serverBusy, busyUntil) {
    if (this.flags.hasPriority) {
      if (!this.firstVipArrivalScheduled) {
        this.firstVipArrivalScheduled = true;
        let firstVipArrival = this.clock + this.generators.arrival.next();
        if (serverBusy && busyUntil) {
          const busyUntilAbs = this.config.startTime + busyUntil;
          if (firstVipArrival < busyUntilAbs) {
            firstVipArrival = busyUntilAbs + this.generators.arrival.next();
          }
        }
        if (firstVipArrival <= this.config.startTime + this.config.maxTime) {
          this.fel.push(createEvent(firstVipArrival, EventType.ARRIVAL_VIP, {}));
        }
      }
    }

    if (!this.firstArrivalScheduled) {
      this.firstArrivalScheduled = true;
      let firstArrivalTime = this.clock + this.generators.arrival.next();
      if (serverBusy && busyUntil) {
        const busyUntilAbs = this.config.startTime + busyUntil;
        if (firstArrivalTime < busyUntilAbs) {
          firstArrivalTime = busyUntilAbs + this.generators.arrival.next();
        }
      }
      if (firstArrivalTime <= this.config.startTime + this.config.maxTime) {
        this.fel.push(createEvent(firstArrivalTime, EventType.ARRIVAL, {}));
      }
    }
  }

  #scheduleWorkCycle() {
    if (!this.flags.hasServerBreaks || this.workTime <= 0) return;

    if (this.serverPresent && this.nextBreakTime === null) {
      this.nextBreakTime = this.clock + this.workTime;
      this.fel.push(createEvent(this.nextBreakTime, EventType.SERVER_BREAK_START, {}));
    }
  }

  #scheduleNextWorkPeriod() {
    if (!this.flags.hasServerBreaks || this.workTime <= 0) return;

    this.nextWorkTime = this.clock + this.generators.breakDuration.next();
    this.fel.push(createEvent(this.nextWorkTime, EventType.SERVER_BREAK_END, {}));
  }

  #getNextEvent() {
    if (this.fel.length === 0) return null;
    return this.fel.reduce((min, e) =>
      e.time < min.time || (e.time === min.time && e.priority < min.priority) ? e : min
    );
  }

  #removeEvent(event) {
    this.fel = this.fel.filter(e => e.id !== event.id);
  }

  #advanceClock(newTime) {
    this.clock = newTime;
  }

  #handleAbandonment(event) {
    const { clientId } = event.data;

    // Buscar en vipQueue primero, luego en queue
    let clientIndex = this.vipQueue.findIndex(c => c.id === clientId);
    if (clientIndex !== -1) {
      const client = this.vipQueue[clientIndex];
      this.vipQueue.splice(clientIndex, 1);
      this.stats.clientsAbandoned++;
      this.#recordHistory(EventType.ABANDONMENT, `C${client.id} (VIP) abandona`);
      return;
    }

    clientIndex = this.queue.findIndex(c => c.id === clientId);
    if (clientIndex !== -1) {
      const client = this.queue[clientIndex];
      this.queue.splice(clientIndex, 1);
      this.stats.clientsAbandoned++;
      this.#recordHistory(EventType.ABANDONMENT, `C${client.id} abandona`);
    }
  }

  #handleEnterSZ() {
    this.szBusy = true;
    const travelTime = this.generators.travel.next();
    this.fel.push(createEvent(this.clock + travelTime, EventType.ARRIVAL_PS, {}));
    this.#recordHistory(EventType.ENTER_SZ, `C${this.clientInService?.id || '?'} entra a Zona de Seguridad`);
  }

  #handleArrivalPS() {
    this.szBusy = false;
    const clientId = this.clientInService?.id;
    this.#recordHistory(EventType.ARRIVAL_PS, `C${clientId} llega al Punto de Servicio`);

    // Seleccionar próximo cliente de la cola (respetando prioridades)
    let nextClient = null;
    if (this.flags.hasPriority) {
      nextClient = this.vipQueue.shift() || this.queue.shift();
    } else {
      nextClient = this.queue.shift();
    }

    if (nextClient) {
      // El cliente que estaba en servicio (ahora cruzó SZ) fue atendido
      this.stats.clientsServed++;
      this._serviceTimeHistory.push(this.generators.service.next()); // Ya se incluía en el travel

      // El siguiente cliente entra a servicio
      this.clientInService = nextClient;
      this.serverState = ServerState.BUSY;
      
      const serviceTime = this.generators.service.next();
      this.serviceEndTime = this.clock + serviceTime;
      this.fel.push(createEvent(this.serviceEndTime, EventType.SERVICE_END, { clientId: nextClient.id }));
      this.#recordHistory(EventType.SERVICE_END, `C${nextClient.id} entra en servicio (ΔtS=${serviceTime.toFixed(1)})`);
      
      // Programar siguiente llegada
      this.#scheduleNextArrival();
    } else {
      // No hay más clientes en cola
      this.stats.clientsServed++;
      this.serverState = ServerState.IDLE;
      this.clientInService = null;
      this.serviceEndTime = null;
      
      // Programar siguiente llegada
      this.#scheduleNextArrival();
    }
  }

  #handleArrival(isVip = false) {
    // Modo Zona de Seguridad
    if (this.flags.hasSecurityZone) {
      // Crear cliente
      const client = createClient(this.clock, this.config, this.flags, isVip);
      
      // Si SZ libre y PS libre, entrar inmediatamente a SZ
      if (!this.szBusy && this.serverState === ServerState.IDLE) {
        this.clientInService = client;
        this.serverState = ServerState.BUSY;
        this.szBusy = true;
        
        // Programar entrada a SZ (mismo instante)
        this.fel.push(createEvent(this.clock, EventType.ENTER_SZ, { clientId: client.id }));
        this.#recordHistory(EventType.ARRIVAL, `C${client.id} llega -> entra a ZS`);
      } else {
        // Algo ocupado, encolar
        if (isVip || this.flags.hasPriority) {
          this.vipQueue.push(client);
        } else {
          this.queue.push(client);
        }
        this.#recordHistory(EventType.ARRIVAL, `C${client.id} llega -> cola (ZS ocupa)`);
      }
      
      // Programar siguiente llegada
      this.#scheduleNextArrival(isVip);
      return;
    }

    // Modo normal (sin Zona de Seguridad)
    if (!this.serverPresent) {
      const client = createClient(this.clock, this.config, this.flags, isVip);
      if (isVip) {
        this.vipQueue.push(client);
        this.#recordHistory(EventType.ARRIVAL_VIP, `C${client.id} (VIP) llega (servidor ausente) -> cola VIP`);
      } else {
        this.queue.push(client);
        this.#recordHistory(EventType.ARRIVAL, `C${client.id} llega (servidor ausente) -> cola`);
      }
      this.#scheduleNextArrival(isVip);
      return;
    }

    const client = createClient(this.clock, this.config, this.flags, isVip);
    let action = '';

    if (this.serverState === ServerState.IDLE) {
      this.serverState = ServerState.BUSY;
      this.clientInService = client;
      const serviceTime = this.generators.service.next();
      this.serviceEndTime = this.clock + serviceTime;
      this.fel.push(createEvent(this.serviceEndTime, EventType.SERVICE_END, { clientId: client.id }));
      action = `C${client.id}${isVip ? ' (VIP)' : ''} entra en servicio (ΔtS=${serviceTime.toFixed(1)})`;
    } else if (this.serverState === ServerState.BUSY) {
      if (isVip) {
        this.vipQueue.push(client);
      } else {
        this.queue.push(client);
      }
      action = `C${client.id}${isVip ? ' (VIP)' : ''} entra a ${isVip ? 'cola VIP' : 'cola'}`;

      // Programar evento de abandono específico para este cliente
      if (this.flags.hasClientAbandonment && client.patienceTime < Infinity) {
        const abandonEvent = createEvent(
          this.clock + client.patienceTime,
          EventType.ABANDONMENT,
          { clientId: client.id }
        );
        this.fel.push(abandonEvent);
      }
    }

    this.#scheduleNextArrival(isVip);
    this.#recordHistory(isVip ? EventType.ARRIVAL_VIP : EventType.ARRIVAL, action);
  }

  #scheduleNextArrival(isVip = false) {
    const arrivalType = isVip ? EventType.ARRIVAL_VIP : EventType.ARRIVAL;
    if (!this.fel.some(e => e.type === arrivalType)) {
      const nextArrival = this.clock + this.generators.arrival.next();
      if (nextArrival <= this.config.startTime + this.config.maxTime) {
        this.fel.push(createEvent(nextArrival, arrivalType, {}));
      }
    }
  }

  #handleServiceEnd(event) {
    this.stats.clientsServed++;
    const servedClientId = event.data.clientId;
    const wasVip = this.clientInService?.priority === ClientPriority.VIP;
    let action = `C${servedClientId}${wasVip ? ' (VIP)' : ''} atendido`;

    // Guardar tiempo de servicio para estadísticas
    if (this.clientInService) {
      this._serviceTimeHistory.push(event.time - this.clock);
    }

    if (this.serverState === ServerState.BUSY && this.serverPresent) {
      this.#selectNextClient();
      
      if (this.clientInService) {
        const serviceTime = this.generators.service.next();
        this.serviceEndTime = this.clock + serviceTime;
        this.fel.push(createEvent(this.serviceEndTime, EventType.SERVICE_END, { clientId: this.clientInService.id }));
        action += ` -> C${this.clientInService.id}${this.clientInService.priority === ClientPriority.VIP ? ' (VIP)' : ''} en servicio (ΔtS=${serviceTime.toFixed(1)})`;
      } else {
        this.serverState = ServerState.IDLE;
        this.serviceEndTime = null;
      }
    } else {
      this.serverState = ServerState.IDLE;
      this.clientInService = null;
      this.serviceEndTime = null;
    }

    this.#recordHistory(EventType.SERVICE_END, action);
  }

  #selectNextClient() {
    if (this.vipQueue.length > 0) {
      this.clientInService = this.vipQueue.shift();
    } else if (this.queue.length > 0) {
      this.clientInService = this.queue.shift();
    } else {
      this.clientInService = null;
    }
  }

  #handleServerBreakStart() {
    this.nextBreakTime = null;
    this.stats.workCycles++;

    if (this.serverState === ServerState.BUSY) {
      this.serverPresent = false;
      this.pausedServiceRemaining = this.serviceEndTime - this.clock;
      this.pausedClient = this.clientInService; // Guardar cliente que estaba en servicio
      const tempClientId = this.clientInService ? this.clientInService.id : null;
      const wasVip = this.clientInService?.priority === ClientPriority.VIP;
      
      // Eliminar el evento SERVICE_END fantasma de la FEL
      this.fel = this.fel.filter(e => e.type !== EventType.SERVICE_END);
      
      this.serverState = ServerState.BREAK;
      this.clientInService = null;
      this.serviceEndTime = null;
      this.#scheduleNextWorkPeriod();
      this.#recordHistory(EventType.SERVER_BREAK_START, `Servidor sale (C${tempClientId}${wasVip ? ' (VIP)' : ''} atendido parcialmente)`);
      return;
    }

    this.serverPresent = false;
    this.serverState = ServerState.BREAK;
    this.#scheduleNextWorkPeriod();
    this.#recordHistory(EventType.SERVER_BREAK_START, `Servidor sale (IDLE)`);
  }

  #handleServerBreakEnd() {
    this.nextWorkTime = null;
    this.stats.restCycles++;

    if (this.serverState === ServerState.BREAK) {
      this.serverPresent = true;

      if (this.pausedServiceRemaining !== null && this.pausedServiceRemaining > 0) {
        // Restaurar el servicio que estaba en pausa
        this.serverState = ServerState.BUSY;
        this.clientInService = this.pausedClient; // Restaurar cliente
        this.serviceEndTime = this.clock + this.pausedServiceRemaining;
        this.pausedServiceRemaining = null;
        this.pausedClient = null;
        this.fel.push(createEvent(this.serviceEndTime, EventType.SERVICE_END, { clientId: this.clientInService.id }));
        this.#scheduleWorkCycle();
        this.#recordHistory(EventType.SERVER_BREAK_END, `Servidor regresa -> C${this.clientInService.id}${this.clientInService.priority === ClientPriority.VIP ? ' (VIP)' : ''} continúa servicio`);
      } else if (this.vipQueue.length > 0 || this.queue.length > 0) {
        // No había servicio pausado, atender nuevo cliente de la cola
        this.serverState = ServerState.BUSY;
        this.#selectNextClient();
        const serviceTime = this.generators.service.next();
        this.serviceEndTime = this.clock + serviceTime;
        this.fel.push(createEvent(this.serviceEndTime, EventType.SERVICE_END, { clientId: this.clientInService.id }));
        this.#scheduleWorkCycle();
        this.#recordHistory(EventType.SERVER_BREAK_END, `Servidor regresa -> C${this.clientInService.id}${this.clientInService.priority === ClientPriority.VIP ? ' (VIP)' : ''} en servicio`);
      } else {
        this.serverState = ServerState.IDLE;
        this.pausedServiceRemaining = null;
        this.pausedClient = null;
        this.#scheduleWorkCycle();
        this.#recordHistory(EventType.SERVER_BREAK_END, `Servidor regresa (IDLE)`);
      }
    }
  }

  #getTotalQueue() {
    return this.vipQueue.length + this.queue.length;
  }

  #recordHistory(eventType, action) {
    const nextBreak = this.fel.find(e => e.type === EventType.SERVER_BREAK_START);
    const nextWork = this.fel.find(e => e.type === EventType.SERVER_BREAK_END);

    this.history.push({
      step: this.history.length + 1,
      time: this.clock,
      eventType,
      serverState: this.serverState,
      serverPresent: this.serverPresent,
      queueLength: this.#getTotalQueue(),
      vipQueueLength: this.vipQueue.length,
      commonQueueLength: this.queue.length,
      queueIds: [...this.vipQueue.map(c => `V${c.id}`), ...this.queue.map(c => `C${c.id}`)].join(','),
      clientInService: this.clientInService ? { id: this.clientInService.id, priority: this.clientInService.priority } : null,
      fel: this.fel.map(e => ({ time: e.time, type: e.type })),
      queueClients: [...this.vipQueue, ...this.queue].map(c => ({ id: c.id, arrivalTime: c.arrivalTime, patienceTime: c.patienceTime, priority: c.priority })),
      nextBreakTime: nextBreak ? nextBreak.time : null,
      nextWorkTime: nextWork ? nextWork.time : null,
      action
    });
  }

  step() {
    const event = this.#getNextEvent();
    if (!event) return false;

    const maxTimeAbs = this.config.startTime + this.config.maxTime;
    if (event.time > maxTimeAbs) return false;

    this.#advanceClock(event.time);
    this.#removeEvent(event);

    switch (event.type) {
      case EventType.ARRIVAL:
        this.#handleArrival(false);
        break;
      case EventType.ARRIVAL_VIP:
        this.#handleArrival(true);
        break;
      case EventType.SERVICE_END:
        this.#handleServiceEnd(event);
        break;
      case EventType.SERVER_BREAK_START:
        this.#handleServerBreakStart();
        break;
      case EventType.SERVER_BREAK_END:
        this.#handleServerBreakEnd();
        break;
      case EventType.ABANDONMENT:
        this.#handleAbandonment(event);
        break;
      case EventType.ENTER_SZ:
        this.#handleEnterSZ();
        break;
      case EventType.ARRIVAL_PS:
        this.#handleArrivalPS();
        break;
    }

    return true;
  }

  run() {
    // eslint-disable-next-line no-empty
    while (this.step()) { }
    return this.getResults();
  }

  getResults() {
    const totalTime = this.clock - this.config.startTime;
    const avgServiceTime = this._serviceTimeHistory.length > 0
      ? (this._serviceTimeHistory.reduce((a, b) => a + b, 0) / this._serviceTimeHistory.length)
      : 0;
    const busyTime = this.stats.clientsServed * avgServiceTime;
    const utilization = totalTime > 0 ? (busyTime / totalTime * 100) : 0;

    return {
      history: this.history,
      stats: {
        ...this.stats,
        totalTime,
        utilization,
        avgServiceTime
      }
    };
  }

  getCurrentState() {
    return {
      clock: this.clock,
      serverState: this.serverState,
      serverPresent: this.serverPresent,
      queue: [...this.queue],
      vipQueue: [...this.vipQueue],
      queueLength: this.#getTotalQueue(),
      vipQueueLength: this.vipQueue.length,
      commonQueueLength: this.queue.length,
      clientInService: this.clientInService,
      fel: [...this.fel],
      history: [...this.history],
      stats: { ...this.stats },
      nextBreakTime: this.nextBreakTime,
      nextWorkTime: this.nextWorkTime
    };
  }

  getNextEventTime() {
    const event = this.#getNextEvent();
    return event ? event.time : null;
  }

  isFinished() {
    const nextEvent = this.#getNextEvent();
    if (!nextEvent) return true;
    return nextEvent.time > this.config.startTime + this.config.maxTime;
  }
}

export function formatTime(seconds, startTime = 0) {
  const absoluteTime = startTime + seconds;
  const totalSecs = Math.floor(absoluteTime);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}