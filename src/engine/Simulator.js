import { ConstantGenerator } from '../utils/generators.js';

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

function parseArrayInput(value) {
  if (typeof value === 'number') return [value];
  if (typeof value === 'string') {
    if (value.includes('-') && !value.includes(',')) {
      const [min, max] = value.split('-').map(v => parseFloat(v.trim()));
      if (!isNaN(min) && !isNaN(max)) {
        return { min, max, isRange: true };
      }
    }
    if (value.includes(',')) {
      const parsed = value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      return parsed.length > 0 ? parsed : [0];
    }
    const num = parseFloat(value);
    return isNaN(num) ? [0] : [num];
  }
return [0];
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

    // Si no se pasan generadores, crear constantes desde config (backwards compatible)
    const arrivalVal = typeof this.config.arrivalInterval === 'string' 
      ? parseFloat(this.config.arrivalInterval) || 0 
      : this.config.arrivalInterval;
    const serviceVal = typeof this.config.serviceTime === 'string'
      ? parseFloat(this.config.serviceTime) || 0
      : this.config.serviceTime;
    const vipArrivalVal = typeof this.config.vipArrivalInterval === 'string'
      ? parseFloat(this.config.vipArrivalInterval) || arrivalVal
      : (this.config.vipArrivalInterval || arrivalVal);
    
    this.generators = {
      arrival:       generators.arrival       || new ConstantGenerator(arrivalVal),
      vipArrival:    generators.vipArrival    || new ConstantGenerator(vipArrivalVal),
      service:       generators.service       || new ConstantGenerator(serviceVal),
      breakDuration: generators.breakDuration || new ConstantGenerator(this.config.restTime || 0),
      travel:        generators.travel        || new ConstantGenerator(this.config.travelTime || 0),
    };

    this.initialState = initialState;

    this.arrivalTimes = parseArrayInput(config.arrivalInterval);
    this.vipArrivalTimes = parseArrayInput(config.vipArrivalInterval);
    this.serviceTimes = parseArrayInput(config.serviceTime);
    this.indexArrival = { current: 0 };
    this.indexVipArrival = { current: 0 };
    this.indexService = { current: 0 };

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
    this.firstArrivalScheduled = false;
    this.firstVipArrivalScheduled = false;
    this.szBusy = false;

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
        let firstVipArrival = this.clock + this.generators.vipArrival.next();
        if (serverBusy && busyUntil) {
          const busyUntilAbs = this.config.startTime + busyUntil;
          if (firstVipArrival < busyUntilAbs) {
            firstVipArrival = busyUntilAbs + this.generators.vipArrival.next();
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

  #handleArrival(isVip = false) {
    // Programar próxima llegada
    const nextArrivalTime = this.clock + (isVip ? this.generators.vipArrival.next() : this.generators.arrival.next());
    this.fel.push(createEvent(nextArrivalTime, isVip ? EventType.ARRIVAL_VIP : EventType.ARRIVAL));

    if (!this.serverPresent) {
      const client = createClient(this.clock, this.config, this.flags, isVip);
      if (isVip) {
        this.vipQueue.push(client);
        this.#recordHistory(EventType.ARRIVAL_VIP, `C${client.id} (VIP) llega (servidor ausente) -> cola VIP`);
      } else {
        this.queue.push(client);
        this.#recordHistory(EventType.ARRIVAL, `C${client.id} llega (servidor ausente) -> cola`);
      }
      return;
    }

    // Modo Zona de Seguridad: flujo diferente
    if (this.flags.hasSecurityZone) {
      const client = createClient(this.clock, this.config, this.flags, isVip);
      const queueEmpty = this.#getTotalQueue() === 0;
      
      if (queueEmpty && !this.szBusy && this.serverState === ServerState.IDLE) {
        // Todo libre → entrar a SZ de inmediato
        this.fel.push(createEvent(this.clock, EventType.ENTER_SZ));
        this.#recordHistory(EventType.ARRIVAL, `C${client.id} llega -> entra a SZ inmediatamente`);
      } else {
        // Algo ocupado → encolar
        if (isVip) {
          this.vipQueue.push(client);
        } else {
          this.queue.push(client);
        }
        this.#recordHistory(EventType.ARRIVAL, `C${client.id}${isVip ? ' (VIP)' : ''} llega -> cola`);
      }
      return;
    }

    // Modo normal
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
      // Programar evento de abandono específico para este cliente
      if (this.flags.hasClientAbandonment && client.patienceTime < Infinity) {
        const abandonEvent = createEvent(
          this.clock + client.patienceTime,
          EventType.ABANDONMENT,
          { clientId: client.id }
        );
        this.fel.push(abandonEvent);
      }
      action = `C${client.id}${isVip ? ' (VIP)' : ''} entra a ${isVip ? 'cola VIP' : 'cola'}`;
    }

    this.#recordHistory(isVip ? EventType.ARRIVAL_VIP : EventType.ARRIVAL, action);
  }

  #handleServiceEnd(event) {
    this.stats.clientsServed++;
    const servedClientId = event.data.clientId;
    const wasVip = this.clientInService?.priority === ClientPriority.VIP;
    let action = `C${servedClientId}${wasVip ? ' (VIP)' : ''} atendido`;

    if (this.flags.hasSecurityZone) {
      // En modo SZ, después de terminar servicio, liberar servidor
      // y si hay clientes esperando, el siguiente entra a SZ (mismo instante)
      this.serverState = ServerState.IDLE;
      this.clientInService = null;
      this.serviceEndTime = null;
      
      // Seleccionar próximo cliente si hay en cola
      const nextClient = this.flags.hasPriority
        ? (this.vipQueue.shift() || this.queue.shift())
        : (this.queue.shift());
      
      if (nextClient) {
        this.fel.push(createEvent(this.clock, EventType.ENTER_SZ));
      }
      
      this.#recordHistory(EventType.SERVICE_END, action);
      return;
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
      const tempClientId = this.clientInService ? this.clientInService.id : null;
      const wasVip = this.clientInService?.priority === ClientPriority.VIP;
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

      if (this.vipQueue.length > 0 || this.queue.length > 0) {
        this.serverState = ServerState.BUSY;
        this.#selectNextClient();
        const serviceTime = this.pausedServiceRemaining
          ? this.pausedServiceRemaining
          : this.generators.service.next();
        this.serviceEndTime = this.clock + serviceTime;
        this.pausedServiceRemaining = null;
        this.fel.push(createEvent(this.serviceEndTime, EventType.SERVICE_END, { clientId: this.clientInService.id }));
        this.#scheduleWorkCycle();
        this.#recordHistory(EventType.SERVER_BREAK_END, `Servidor regresa -> C${this.clientInService.id}${this.clientInService.priority === ClientPriority.VIP ? ' (VIP)' : ''} en servicio`);
      } else {
        this.serverState = ServerState.IDLE;
        this.pausedServiceRemaining = null;
        this.#scheduleWorkCycle();
        this.#recordHistory(EventType.SERVER_BREAK_END, `Servidor regresa (IDLE)`);
      }
    }
  }

  /**
   * Procesa abandono de un cliente específico.
   * Solo abandona si el cliente todavía está en cola (puede haber sido atendido antes).
   */
  #handleAbandonment(event) {
    const { clientId } = event.data;
    
    // Buscar en vipQueue primero, luego en queue
    let idx = this.vipQueue.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      this.vipQueue.splice(idx, 1);
      this.stats.clientsAbandoned++;
      this.#recordHistory(EventType.ABANDONMENT, `C${clientId} (VIP) abandona`);
      return;
    }
    
    idx = this.queue.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      this.stats.clientsAbandoned++;
      this.#recordHistory(EventType.ABANDONMENT, `C${clientId} abandona`);
    }
    // Si no se encuentra en ninguna cola, ya fue atendido → ignorar
  }

  /**
   * Problema 5: Cliente entra a la Zona de Seguridad.
   */
  #handleEnterSZ() {
    this.szBusy = true;
    const travelTime = this.generators.travel.next();
    this.fel.push(createEvent(this.clock + travelTime, EventType.ARRIVAL_PS));
    this.#recordHistory(EventType.ENTER_SZ, `Cliente entra a SZ (Δt=${travelTime.toFixed(1)})`);
  }

  /**
   * Problema 5: Cliente llega al Punto de Servicio tras cruzar la SZ.
   * La SZ queda libre en este momento.
   */
  #handleArrivalPS() {
    this.szBusy = false;

    // Seleccionar próximo cliente (respetando prioridades)
    let nextClient = null;
    if (this.flags.hasPriority) {
      nextClient = this.vipQueue.shift() || this.queue.shift();
    } else {
      nextClient = this.queue.shift();
    }

    if (nextClient) {
      // Programar entrada a SZ del siguiente cliente (mismo instante)
      this.fel.push(createEvent(this.clock, EventType.ENTER_SZ));
    }

    // Iniciar servicio en PS
    this.serverState = ServerState.BUSY;
    this.clientInService = nextClient;
    const serviceTime = this.generators.service.next();
    this.serviceEndTime = this.clock + serviceTime;
    this.fel.push(createEvent(this.serviceEndTime, EventType.SERVICE_END, { clientId: nextClient?.id }));
    this.#recordHistory(EventType.ARRIVAL_PS, `Cliente llega a PS -> servicio (ΔtS=${serviceTime.toFixed(1)})`);
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
    const avgServiceTime = this.stats.clientsServed > 0
      ? (this.serviceTimes.slice(0, this.stats.clientsServed).reduce((a, b) => a + b, 0) / this.stats.clientsServed)
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