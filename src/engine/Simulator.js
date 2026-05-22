import { ConstantGenerator, ListGenerator, UniformGenerator, ExponentialGenerator } from '../utils/generators.js';
import { parseTimeInput } from '../utils/timeParser.js';

// ============================================================================
// ENUMS Y CONSTANTES DEL MOTOR DE SIMULACIÓN
// ============================================================================

/**
 * Representa los posibles estados en los que puede encontrarse un servidor (puesto de servicio).
 * - LIBRE (IDLE): Listo para atender a un nuevo cliente.
 * - OCUPADO (BUSY): Atendiendo activamente a un cliente.
 * - AUSENTE (BREAK): Fuera de servicio temporalmente por un descanso programado.
 */
export const ServerState = {
  IDLE: 'LIBRE',
  BUSY: 'OCUPADO',
  BREAK: 'AUSENTE'
};

/**
 * Define las topologías del sistema soportadas, que dictan el flujo de los clientes y
 * la estructura de las colas.
 * - AISLADOS: Cada servidor tiene su propia cola individual e independiente.
 * - COLA_UNICA: Todos los servidores comparten una única cola común.
 * - ENCADENADOS: Los servidores representan etapas secuenciales (línea de producción).
 */
export const SystemTopology = {
  ISOLATED: 'AISLADOS',
  SINGLE_QUEUE: 'COLA_UNICA',
  CHAINED: 'ENCADENADOS'
};

/**
 * Clasificación de la prioridad de los clientes para determinar el orden de atención en colas.
 * - NORMAL (A): Clientes estándar.
 * - VIP (B): Clientes preferenciales que se ubican al inicio de las colas.
 */
export const ClientPriority = {
  NORMAL: 'A',
  VIP: 'B'
};

/**
 * Tipos de eventos manejados por la Lista de Eventos Futuros (FEL - Future Event List).
 * Cada evento representa un cambio de estado discreto en el tiempo de simulación.
 */
export const EventType = {
  ARRIVAL: 'LLEGADA',                       // Llegada de un cliente normal
  ARRIVAL_VIP: 'LLEGADA_VIP',               // Llegada de un cliente VIP
  SERVICE_END: 'FIN_SERVICIO',              // Finalización de la atención de un cliente en un servidor
  SERVER_BREAK_START: 'SALIDA_SERVIDOR',    // Inicio del descanso programado de un servidor
  SERVER_BREAK_END: 'LLEGADA_SERVIDOR',     // Fin del descanso de un servidor y su retorno
  ABANDONMENT: 'ABANDONO',                  // Salida prematura de la cola por vencimiento de paciencia
  ENTER_SZ: 'ENTER_SZ',                     // Entrada a la Zona de Seguridad (Problema 5 - Reservado)
  ARRIVAL_PS: 'LLEGADA_PS'                  // Llegada al Punto de Servicio (Problema 5 - Reservado)
};

// Contadores globales auto-incrementales para identificar clientes y eventos de forma unívoca.
let clientIdCounter = 0;
let eventIdCounter = 0;

/**
 * Reinicia los contadores globales. Se ejecuta al iniciar una nueva simulación para evitar
 * que los IDs sigan creciendo indefinidamente entre ejecuciones consecutivas.
 */
export function resetCounters() {
  clientIdCounter = 0;
  eventIdCounter = 0;
}

/**
 * Crea una estructura estandarizada para un evento de la FEL.
 * @param {number} time - El instante de tiempo absoluto en segundos en que ocurrirá el evento.
 * @param {string} type - Tipo de evento (tomado de EventType).
 * @param {Object} [data={}] - Información contextual adicional del evento (ej. clientId, serverId).
 * @returns {Object} El objeto evento configurado con prioridad de desempate interna.
 */
function createEvent(time, type, data = {}) {
  // Las prioridades definen qué evento procesar primero si ocurren exactamente en el mismo segundo.
  // Un valor menor indica mayor prioridad de ejecución (ej. FIN_SERVICIO se procesa antes que una LLEGADA).
  const priorities = {
    [EventType.SERVICE_END]: 1,
    [EventType.SERVER_BREAK_END]: 2,
    [EventType.ARRIVAL_PS]: 2,
    [EventType.ARRIVAL_VIP]: 3,
    [EventType.ARRIVAL]: 4,
    [EventType.ENTER_SZ]: 4,
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

// ============================================================================
// CLASE SERVER (PUESTO DE SERVICIO)
// ============================================================================

/**
 * Representa un puesto de servicio (servidor) individual en la simulación.
 * Rastrea su estado de ocupación, presencia física, cliente actual y métricas de desempeño.
 */
class Server {
  /**
   * Crea un nuevo servidor con sus configuraciones y cola correspondiente.
   * @param {number} id - Identificador numérico del servidor (1-indexado).
   * @param {Object} generators - Mapeo de generadores de tiempos del sistema.
   */
  constructor(id, generators) {
    this.id = id;
    this.state = ServerState.IDLE; // Inicia desocupado (LIBRE)
    this.present = true;           // Indica si el servidor está trabajando (no está de descanso)
    this.clientInService = null;   // Cliente actualmente atendido (null si está libre o ausente)
    this.serviceEndTime = null;    // Instante absoluto en que terminará la atención actual
    
    // Tiempos planificados para descansos (control de ciclos)
    this.nextBreakTime = null;     // Instante absoluto para iniciar el siguiente descanso
    this.nextWorkTime = null;      // Instante absoluto en que finalizará el descanso actual
    
    // Variables para manejar la interrupción/pausa de servicio por descanso
    this.pausedServiceRemaining = null; // Segundos restantes de atención que faltaban cuando fue interrumpido
    this.pausedClient = null;           // Cliente cuyo servicio fue pausado
    
    this.generators = generators;  // Referencia a los generadores de tiempos
    
    // Métricas del servidor para reportes de desempeño final e intermedios
    this.clientsServed = 0;        // Cantidad acumulada de clientes que completaron su atención aquí
    this.busyTime = 0;             // Tiempo total acumulado (en segundos) que el servidor pasó ocupado
    this.lastStateChange = 0;      // Marca de tiempo de la última vez que cambió su estado (para cálculo de integrales de ocupación)
    
    this.queue = [];               // Cola local del servidor (utilizada en AISLADOS y ENCADENADOS)
  }

  /**
   * Actualiza el tiempo acumulado de ocupación (busyTime) en base al reloj actual.
   * @param {number} currentTime - El tiempo actual de la simulación.
   */
  updateBusyTime(currentTime) {
    if (this.state === ServerState.BUSY) {
      this.busyTime += (currentTime - this.lastStateChange);
    }
    this.lastStateChange = currentTime;
  }

  /**
   * Modifica el estado del servidor de forma segura, actualizando previamente
   * el acumulador de tiempo ocupado para garantizar la precisión de la métrica de utilización.
   * @param {string} newState - El nuevo estado a aplicar (ServerState).
   * @param {number} currentTime - El tiempo actual de la simulación.
   */
  setState(newState, currentTime) {
    this.updateBusyTime(currentTime);
    this.state = newState;
  }
}

// ============================================================================
// CLASE SIMULATOR (MOTOR PRINCIPAL)
// ============================================================================

/**
 * Motor de simulación de eventos discretos (DES).
 * Gestiona el paso del tiempo, el ciclo de eventos, el enrutamiento de clientes según
 * la topología, la lógica de descansos/abandonos y la recolección de estadísticas del sistema.
 */
export class Simulator {
  /**
   * Inicializa la instancia de simulación con las configuraciones y estados iniciales.
   * @param {Object} config - Configuración de tiempos y topología (startTime, maxTime, numServers, etc.).
   * @param {Object} flags - Flags funcionales (hasPriority, hasServerBreaks, hasClientAbandonment, hasSecurityZone).
   * @param {Object} [initialState={}] - Carga inicial de cola, tiempos remanentes y servidores ocupados.
   * @param {Object} [generators={}] - Generadores manuales preestablecidos.
   */
  constructor(config, flags, initialState = {}, generators = {}) {
    this.config = { ...config };
    this.flags = { ...flags };
    this.disableArrivals = flags.disableArrivals || false;
    this.topology = config.topology || SystemTopology.SINGLE_QUEUE;
    this.numServers = parseInt(config.numServers) || 1;

    /**
     * Helper interno que traduce las cadenas de texto ingresadas en la UI (por ejemplo, "30-90", "10,20", "45")
     * en instancias de generadores de tiempos (Constant, List, Uniform o Exponential).
     * @param {string|number} inputValue - Valor configurado por el usuario.
     * @param {string} [distType='uniform'] - Distribución probabilística seleccionada (uniform o exponential).
     * @returns {Object} Instancia del generador correspondiente.
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

    /**
     * Parsea cadenas con valores separados por punto y coma (;) o coma (,) para permitir
     * configuraciones individuales para cada uno de los servidores en paralelo.
     * @param {string|Array} val - Cadena de entrada (ej: "30; 45; 60" o "10-20, 20-30").
     * @param {number} count - Cantidad esperada de servidores.
     * @returns {Array} Array con las subconfiguraciones individuales para cada servidor.
     */
    const splitConfigValue = (val, count) => {
      if (Array.isArray(val)) return val;
      if (typeof val !== 'string') return [val];
      if (val.includes(';')) {
        return val.split(';').map(s => s.trim());
      }
      if (val.includes(',')) {
        const parts = val.split(',').map(s => s.trim());
        if (parts.length === count) {
          return parts;
        }
      }
      return [val];
    };

    // Divide y asigna intervalos de llegada y servicio individuales si fueron definidos por servidor
    const arrIntervals = splitConfigValue(this.config.arrivalInterval, this.numServers);
    const srvIntervals = splitConfigValue(this.config.serviceTime, this.numServers);

    // Generadores específicos de llegada por servidor (utilizado en AISLADOS)
    this.arrivalGenerators = Array.from({ length: this.numServers }, (_, i) => {
      const val = arrIntervals[i] !== undefined ? arrIntervals[i] : arrIntervals[0];
      return getGenerator(val, this.config.arrivalDistType || 'uniform');
    });

    // Generadores específicos de servicio por servidor
    this.serviceGenerators = Array.from({ length: this.numServers }, (_, i) => {
      const val = srvIntervals[i] !== undefined ? srvIntervals[i] : srvIntervals[0];
      return getGenerator(val, this.config.serviceDistType || 'uniform');
    });

    // Generadores generales activos del sistema
    this.generators = {
      arrival: this.arrivalGenerators[0],
      service: this.serviceGenerators[0],
      breakDuration: generators.breakDuration || getGenerator(this.config.restTime, this.config.restDistType || 'uniform'),
      travel: generators.travel || getGenerator(this.config.travelTime, this.config.travelDistType || 'uniform'),
      workDuration: getGenerator(this.config.workTime, this.config.workDistType || 'uniform'),
      patience: getGenerator(this.config.maxWaitTime, this.config.patienceDistType || 'uniform'),
    };

    this.initialState = initialState;
    this.clock = this.config.startTime; // El reloj inicia en la hora absoluta elegida (ej. 28800s para 8:00 AM)
    this.fel = [];                      // Future Event List - Colección de eventos ordenados cronológicamente
    
    // Estructuras de cola globales para la topología de COLA_UNICA
    this.queues = {
      default: [], // Cola para clientes normales (Prioridad A)
      vip: []      // Cola para clientes VIP (Prioridad B)
    };

    // Inicialización del pool de servidores del sistema
    this.servers = Array.from({ length: this.numServers }, (_, i) => new Server(i + 1, this.generators));
    
    this.szBusy = false; // Flag para controlar exclusión mutua en Zona de Seguridad (Problema 5 - Reservado)

    // Acumuladores estadísticos del sistema
    this.stats = {
      clientsServed: 0,                   // Total de clientes atendidos que salieron del sistema
      clientsAbandoned: 0,                // Total de clientes que abandonaron por pérdida de paciencia
      abandonmentsFirstHour: 0,           // Cantidad de abandonos dentro de los primeros 3600 segundos (métrica académica)
      clientsServedUntilSecondBreak: 0,   // Clientes atendidos antes de que ocurra el segundo descanso en total
      serviceCompletions: 0,              // Finalizaciones de etapa/servicio, útil en topologías encadenadas
      workCycles: 0,                      // Total de ciclos de trabajo iniciados
      restCycles: 0,                      // Total de descansos de servidor completados
      totalArrivals: 0                    // Total de arribos registrados en el sistema
    };

    this.history = [];             // Historial paso a paso del estado para poblar las grillas y diagramas en la UI
    this.checkpoints = [];         // Reglas dinámicas o condiciones para registrar instantáneas especiales
    this.checkpointSnapshots = []; // Registro de instantáneas tomadas por los checkpoints
    
    this.firstArrivalScheduled = false;    // Control para evitar duplicidad de primera llegada normal
    this.firstVipArrivalScheduled = false; // Control para evitar duplicidad de primera llegada VIP
    this.finishedAtHorizon = false;
    this.securityZoneClient = null;
    this.securityZoneTargetServerId = null;

    // Inicializa la configuración inicial, colas de inicio y eventos iniciales
    this.#initialize();
  }

  /**
   * Instancia un objeto cliente con propiedades unívocas de identidad, arribo, paciencia y prioridad.
   * @param {number} arrivalTime - Tiempo absoluto en segundos de arribo del cliente al sistema.
   * @param {boolean} [isVip=false] - Indica si el cliente es VIP de forma explícita.
   * @param {number} [initialWait=0] - Tiempo que lleva esperando (para clientes cargados al inicio).
   * @returns {Object} Objeto cliente construido.
   */
  #createClient(arrivalTime, isVip = false, initialWait = 0) {
    const vip = isVip || (this.flags.hasPriority && Math.random() < 0.3);
    const patience = this.generators.patience.next();
    return {
      id: ++clientIdCounter,
      arrivalTime: arrivalTime - initialWait, // Ajuste para preservar el tiempo real de arribo
      patienceTime: patience,
      priority: vip ? ClientPriority.VIP : ClientPriority.NORMAL,
      currentStage: 0 // Rastreador de la etapa actual (se usa en topología ENCADENADOS)
    };
  }

  /**
   * Carga el estado inicial en el sistema: puebla colas de inicio,
   * asigna servidores ocupados desde el segundo cero y agenda las primeras llegadas y descansos.
   */
  #initialize() {
    resetCounters();

    const { clientsInQueue, vipClientsInQueue, initialWaitTime, serverBusy, busyUntil, serversInitialState } = this.initialState;
    const waitTime = parseFloat(initialWaitTime) || 0;

    /**
     * Encola un cliente en la cola adecuada según la topología activa y programa su abandono.
     */
    const pushToQueue = (client, isVip, serverIdx = 0) => {
      if (this.topology === SystemTopology.SINGLE_QUEUE) {
        if (isVip) this.queues.vip.push(client);
        else this.queues.default.push(client);
      } else {
        const targetServer = this.servers[serverIdx] || this.servers[0];
        targetServer.queue.push(client);
      }
      this.#scheduleAbandonment(client);
    };

    // Método A: Estado inicial individualizado por servidor
    if (serversInitialState && Array.isArray(serversInitialState)) {
      serversInitialState.forEach((sInit, idx) => {
        const server = this.servers[idx];
        if (!server) return;

        // Servidor ocupado desde el arranque de la simulación
        if (sInit.busy && sInit.busyUntil !== undefined) {
          server.setState(ServerState.BUSY, this.clock);
          server.clientInService = this.#createClient(this.clock, false, 0);
          if (this.topology === SystemTopology.CHAINED) {
            server.clientInService.currentStage = idx;
          }
          server.serviceEndTime = this.clock + parseFloat(sInit.busyUntil);
          // Agenda el fin del servicio en la FEL
          this.fel.push(createEvent(server.serviceEndTime, EventType.SERVICE_END, {
            serverId: server.id,
            clientId: server.clientInService.id
          }));
        }

        // Carga clientes iniciales en la cola de este servidor específico
        if (sInit.queueLength) {
          for (let i = 0; i < sInit.queueLength; i++) {
            const client = this.#createClient(this.clock, false, waitTime);
            if (this.topology === SystemTopology.CHAINED) {
              client.currentStage = idx;
            }
            pushToQueue(client, false, idx);
          }
        }
      });
    } else {
      // Método B: Carga uniforme básica (para compatibilidad de presets anteriores)
      for (let i = 0; i < (vipClientsInQueue || 0); i++) {
        const client = this.#createClient(this.clock, true, waitTime);
        pushToQueue(client, true, 0);
      }
      for (let i = 0; i < (clientsInQueue || 0); i++) {
        const client = this.#createClient(this.clock, false, waitTime);
        pushToQueue(client, false, 0);
      }

      if (serverBusy && busyUntil) {
        const s1 = this.servers[0];
        s1.setState(ServerState.BUSY, this.clock);
        s1.clientInService = this.#createClient(this.clock, false, 0);
        s1.serviceEndTime = this.clock + parseFloat(busyUntil);
        this.fel.push(createEvent(s1.serviceEndTime, EventType.SERVICE_END, {
          serverId: 1,
          clientId: s1.clientInService.id
        }));
      }
    }

    // Programa las primeras llegadas según la topología
    this.#scheduleFirstArrivals();

    this.#processExpiredQueuedClients();
    
    // Inicia el reloj de descansos para todos los servidores y asigna atenciones
    this.servers.forEach(server => {
      this.#scheduleWorkCycle(server);
      if (server.state === ServerState.IDLE) {
        this.#selectNextClientForServer(server);
      }
    });

    // Registra el paso inicial en el historial de simulación
    this.#recordHistory('INICIO', 'Estado inicial');
  }

  /**
   * Programa las primeras llegadas del sistema en la FEL.
   * Si hay presets académicos con desfases específicos, los usa; de lo contrario, genera
   * los tiempos mediante los generadores de probabilidad correspondientes.
   */
  #scheduleFirstArrivals() {
    if (this.disableArrivals) return;

    // Si existen tiempos de arribo inicial explícitos (ej. para reproducción exacta de enunciados)
    if (this.initialState.firstArrivalTimes && Array.isArray(this.initialState.firstArrivalTimes)) {
      this.initialState.firstArrivalTimes.forEach((timeOffset, idx) => {
        const absTime = this.clock + parseFloat(timeOffset);
        if (absTime <= this.config.startTime + this.config.maxTime) {
          const eventData = this.topology === SystemTopology.ISOLATED ? { serverId: this.servers[idx].id } : {};
          this.fel.push(createEvent(absTime, EventType.ARRIVAL, eventData));
        }
      });
      this.firstArrivalScheduled = true;
      if (this.flags.hasPriority) {
        this.firstVipArrivalScheduled = true;
      }
      return;
    }

    // Programación inicial según topologías
    if (this.topology === SystemTopology.ISOLATED) {
      // Un primer arribo para la cola de cada servidor
      for (let i = 0; i < this.numServers; i++) {
        const gen = this.arrivalGenerators[i] || this.arrivalGenerators[0];
        const time = this.clock + gen.next();
        if (time <= this.config.startTime + this.config.maxTime) {
          this.fel.push(createEvent(time, EventType.ARRIVAL, { serverId: this.servers[i].id }));
        }
      }
    } else {
      // Cola Única o Encadenados: un único flujo de llegadas; la prioridad se decide por cliente.
      if (!this.firstArrivalScheduled) {
        this.firstArrivalScheduled = true;
        const time = this.clock + this.generators.arrival.next();
        if (time <= this.config.startTime + this.config.maxTime) {
          this.fel.push(createEvent(time, EventType.ARRIVAL, {}));
        }
      }
    }
  }

  /**
   * Agenda el momento en el que un servidor en servicio activo tomará su próximo descanso.
   * Se ejecuta al iniciar y cada vez que el servidor retorna de un descanso previo.
   * @param {Server} server - Instancia del servidor.
   */
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

  /**
   * Agenda la llegada del siguiente cliente en la FEL.
   * Esto asegura que siempre exista un evento de "LLEGADA" programado a futuro en el motor.
   * @param {boolean} [isVip=false] - Define si la llegada planificada es de prioridad VIP.
   * @param {number} [serverId=null] - El ID del servidor de destino (para Sistemas Aislados).
   */
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
      // Evita duplicar eventos de llegada en la FEL si ya hay uno programado
      if (!this.fel.some(e => e.type === EventType.ARRIVAL || e.type === EventType.ARRIVAL_VIP)) {
        const time = this.clock + this.generators.arrival.next();
        if (time <= this.config.startTime + this.config.maxTime) {
          this.fel.push(createEvent(time, EventType.ARRIVAL, {}));
        }
      }
    }
  }

  /**
   * Programa en la FEL el evento de abandono de cola de un cliente, 
   * el cual se ejecutará si el cliente no es atendido antes de agotar su paciencia.
   * @param {Object} client - El objeto cliente.
   */
  #scheduleAbandonment(client) {
    if (this.flags.hasClientAbandonment && client.patienceTime < Infinity) {
      const time = client.arrivalTime + client.patienceTime;
      if (time >= this.clock) {
        this.fel.push(createEvent(time, EventType.ABANDONMENT, { clientId: client.id }));
      } else {
        // Si la paciencia ya expiró en el instante actual (ej. inicialización), agenda abandono inmediato
        this.fel.push(createEvent(this.clock, EventType.ABANDONMENT, { clientId: client.id }));
      }
    }
  }

  #processExpiredQueuedClients() {
    if (!this.flags.hasClientAbandonment) return;

    const removeExpiredFromQueue = (queue) => {
      for (let i = queue.length - 1; i >= 0; i--) {
        const client = queue[i];
        if (client.arrivalTime + client.patienceTime <= this.clock) {
          queue.splice(i, 1);
          this.stats.clientsAbandoned++;
          if (this.clock - this.config.startTime <= 3600) {
            this.stats.abandonmentsFirstHour++;
          }
          this.#recordHistory(EventType.ABANDONMENT, `C${client.id} abandona cola al inicio`);
        }
      }
    };

    removeExpiredFromQueue(this.queues.vip);
    removeExpiredFromQueue(this.queues.default);
    this.servers.forEach(server => removeExpiredFromQueue(server.queue));
  }

  /**
   * Busca y retorna el evento inminente (más cercano en tiempo) de la FEL.
   * Resuelve empates temporales aplicando la prioridad intrínseca de cada tipo de evento.
   * @returns {Object|null} El evento más cercano, o null si la FEL está vacía.
   */
  #getNextEvent() {
    if (this.fel.length === 0) return null;
    return this.fel.reduce((min, e) =>
      e.time < min.time || (e.time === min.time && e.priority < min.priority) ? e : min
    );
  }

  /**
   * Maneja el evento de LLEGADA de un cliente normal o VIP.
   * Enruta al cliente a un servidor disponible o a la cola del sistema de acuerdo a la topología.
   * @param {Object} event - El evento extraído de la FEL.
   * @param {boolean} [isVip=false] - Indica si el cliente es VIP.
   */
  #handleArrival(event, isVip = false) {
    this.stats.totalArrivals++;
    const serverId = event?.data?.serverId || null;
    const client = this.#createClient(this.clock, isVip);
    const clientIsVip = client.priority === ClientPriority.VIP;
    const historyEventType = clientIsVip ? EventType.ARRIVAL_VIP : EventType.ARRIVAL;
    
    // Agenda inmediatamente la siguiente llegada para mantener vivo el bucle
    this.#scheduleNextArrival(false, serverId);

    if (this.topology === SystemTopology.SINGLE_QUEUE) {
      // Busca un servidor que esté libre y presente para atenderlo de inmediato
      const freeServer = this.servers.find(s => s.state === ServerState.IDLE && s.present);
      
      if (freeServer && (!this.flags.hasSecurityZone || !this.szBusy)) {
        if (this.flags.hasSecurityZone) {
          this.#sendClientThroughSecurityZone(freeServer, client);
          this.#recordHistory(historyEventType, `C${client.id} llega -> zona de seguridad`);
        } else {
          this.#startService(freeServer, client);
          this.#recordHistory(historyEventType, `C${client.id} llega -> S${freeServer.id}`);
        }
      } else {
        // Si no hay servidores disponibles, el cliente ingresa a la cola correspondiente
        if (clientIsVip) this.queues.vip.push(client);
        else this.queues.default.push(client);
        this.#scheduleAbandonment(client);
        this.#recordHistory(historyEventType, `C${client.id} llega -> cola`);
      }
    } else if (this.topology === SystemTopology.ISOLATED) {
      // Enrutamiento al servidor especificado en el evento, o a uno aleatorio si no está definido
      const targetId = serverId ? serverId - 1 : Math.floor(Math.random() * this.numServers);
      const server = this.servers[targetId];
      if (server.state === ServerState.IDLE && server.present) {
        this.#startService(server, client);
      } else {
        server.queue.push(client);
        this.#scheduleAbandonment(client);
      }
      this.#recordHistory(historyEventType, `C${client.id} llega a Sistema Aislado ${server.id}`);
    } else if (this.topology === SystemTopology.CHAINED) {
      // Los clientes siempre ingresan obligatoriamente por el Servidor 1 (Etapa 1)
      const s1 = this.servers[0];
      if (s1.state === ServerState.IDLE && s1.present) {
        this.#startService(s1, client);
      } else {
        s1.queue.push(client);
        this.#scheduleAbandonment(client);
      }
      this.#recordHistory(historyEventType, `C${client.id} llega -> Etapa 1 (S1)`);
    }
  }

  /**
   * Pone al servidor en estado OCUPADO y calcula el fin de su servicio
   * utilizando el generador correspondiente, agendando la finalización en la FEL.
   * @param {Server} server - El servidor que atiende.
   * @param {Object} client - El cliente en atención.
   */
  #startService(server, client) {
    client.inSecurityZone = false;
    client.passedSecurityZone = false;
    server.setState(ServerState.BUSY, this.clock);
    server.clientInService = client;
    const gen = this.serviceGenerators[server.id - 1] || this.serviceGenerators[0];
    const duration = gen.next();
    server.serviceEndTime = this.clock + duration;
    this.fel.push(createEvent(server.serviceEndTime, EventType.SERVICE_END, { serverId: server.id, clientId: client.id }));
  }

  #sendClientThroughSecurityZone(server, client) {
    server.setState(ServerState.IDLE, this.clock);
    server.clientInService = null;
    server.serviceEndTime = null;

    client.inSecurityZone = true;
    client.passedSecurityZone = false;
    this.szBusy = true;
    this.securityZoneClient = client;
    this.securityZoneTargetServerId = server.id;

    const travelDuration = this.generators.travel.next();
    const arrivalTime = this.clock + travelDuration;
    this.fel.push(createEvent(arrivalTime, EventType.ARRIVAL_PS, {
      serverId: server.id,
      clientId: client.id
    }));
  }

  #handleArrivalPS(event) {
    const { serverId, clientId } = event.data;
    const server = this.servers.find(s => s.id === serverId);
    const client = this.securityZoneClient?.id === clientId ? this.securityZoneClient : null;

    this.szBusy = false;
    this.securityZoneClient = null;
    this.securityZoneTargetServerId = null;

    if (!client || !server) return;

    client.inSecurityZone = false;
    client.passedSecurityZone = true;

    if (server.state === ServerState.IDLE && server.present) {
      this.#startService(server, client);
      this.#recordHistory(EventType.ARRIVAL_PS, `C${client.id} llega al PS -> S${server.id}`);
      return;
    }

    if (client.priority === ClientPriority.VIP) this.queues.vip.unshift(client);
    else this.queues.default.unshift(client);
    this.#recordHistory(EventType.ARRIVAL_PS, `C${client.id} llega al PS -> espera`);
  }

  /**
   * Maneja el evento de FIN_SERVICIO.
   * Registra métricas y mueve al cliente a la siguiente etapa (CHAINED) o le da salida.
   * Posteriormente, hace que el servidor busque atender un nuevo cliente de la cola.
   * @param {Object} event - Evento extraído de la FEL.
   */
  #handleServiceEnd(event) {
    const { serverId, clientId } = event.data;
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;

    if (server.state !== ServerState.BUSY || !server.clientInService || server.clientInService.id !== clientId) {
      return;
    }

    this.stats.serviceCompletions++;
    server.clientsServed++;
    const client = server.clientInService;
    
    let nextAction = '';

    if (this.topology === SystemTopology.CHAINED && client.currentStage < this.numServers - 1) {
      // El cliente avanza al siguiente servidor secuencial
      client.currentStage++;
      const nextServer = this.servers[client.currentStage];
      nextAction = `C${clientId} termina etapa ${client.currentStage} -> Etapa ${client.currentStage + 1}`;
      
      if (nextServer.state === ServerState.IDLE && nextServer.present) {
        this.#startService(nextServer, client);
      } else {
        nextServer.queue.push(client);
      }
    } else {
      // El cliente sale definitivamente de la red de servidores del sistema
      nextAction = `C${clientId} termina servicio y sale del sistema`;
      this.stats.clientsServed++;
    }

    // Libera al servidor y busca el próximo cliente
    this.#selectNextClientForServer(server);
    this.#recordHistory(EventType.SERVICE_END, nextAction);
  }

  /**
   * Remueve y retorna el próximo cliente en espera para ser atendido por el servidor
   * respetando el orden de prioridad VIP si corresponde. Si no hay nadie, libera al servidor.
   * @param {Server} server - El servidor a asignar.
   */
  #selectNextClientForServer(server) {
    if (!server.present) {
      server.setState(ServerState.BREAK, this.clock);
      return;
    }

    let nextClient = null;

    if (this.topology === SystemTopology.SINGLE_QUEUE) {
      // En cola única, los clientes VIP tienen absoluta prioridad de atención
      nextClient = this.queues.vip.shift() || this.queues.default.shift();
    } else {
      if (this.flags.hasPriority) {
        const vipIdx = server.queue.findIndex(c => c.priority === ClientPriority.VIP);
        nextClient = vipIdx >= 0 ? server.queue.splice(vipIdx, 1)[0] : server.queue.shift();
      } else {
        nextClient = server.queue.shift();
      }
    }

    if (nextClient && this.flags.hasSecurityZone && this.topology === SystemTopology.SINGLE_QUEUE && !nextClient.passedSecurityZone) {
      if (this.szBusy) {
        if (nextClient.priority === ClientPriority.VIP) this.queues.vip.unshift(nextClient);
        else this.queues.default.unshift(nextClient);
        server.setState(ServerState.IDLE, this.clock);
        server.clientInService = null;
        server.serviceEndTime = null;
      } else {
        this.#sendClientThroughSecurityZone(server, nextClient);
      }
    } else if (nextClient) {
      this.#startService(server, nextClient);
    } else {
      server.setState(ServerState.IDLE, this.clock);
      server.clientInService = null;
      server.serviceEndTime = null;
    }
  }

  /**
   * Maneja la salida temporal de un servidor para tomar su descanso programado.
   * Si el servidor estaba ocupado, suspende/pausa la atención en curso y elimina su fin de servicio de la FEL.
   * @param {Object} event - Evento extraído de la FEL.
   */
  #handleServerBreakStart(event) {
    const server = this.servers.find(s => s.id === event.data.serverId);
    if (!server) return;

    server.updateBusyTime(this.clock);
    this.stats.workCycles++;
    if (this.stats.workCycles === 2) {
      this.stats.clientsServedUntilSecondBreak = this.stats.clientsServed;
    }
    server.present = false;
    server.nextBreakTime = null;

    const oldState = server.state;
    server.setState(ServerState.BREAK, this.clock);
    const breakDuration = this.generators.breakDuration.next();
    server.nextWorkTime = this.clock + breakDuration;
    
    // Programa en la FEL el retorno del servidor
    this.fel.push(createEvent(server.nextWorkTime, EventType.SERVER_BREAK_END, { serverId: server.id }));

    if (oldState === ServerState.BUSY) {
      // Guarda el tiempo remanente de servicio para reanudarlo posteriormente
      server.pausedServiceRemaining = server.serviceEndTime - this.clock;
      server.pausedClient = server.clientInService;
      
      // Remueve el evento de fin de servicio original porque fue interrumpido
      this.fel = this.fel.filter(e => !(e.type === EventType.SERVICE_END && e.data.serverId === server.id));
      
      this.#recordHistory(EventType.SERVER_BREAK_START, `S${server.id} sale (C${server.pausedClient.id} pausado)`);
    } else {
      this.#recordHistory(EventType.SERVER_BREAK_START, `S${server.id} sale (LIBRE)`);
    }
  }

  /**
   * Maneja el retorno de un servidor de su descanso programado.
   * Si tenía un cliente pausado, reanuda su servicio de inmediato; si no, procesa clientes en espera.
   * @param {Object} event - Evento extraído de la FEL.
   */
  #handleServerBreakEnd(event) {
    const server = this.servers.find(s => s.id === event.data.serverId);
    if (!server) return;

    this.stats.restCycles++;
    server.present = true;
    server.nextWorkTime = null;

    // Programa su siguiente ciclo de trabajo/descanso
    this.#scheduleWorkCycle(server);

    if (server.pausedClient) {
      // Reanuda el servicio pausado del cliente aplicando el tiempo remanente
      server.setState(ServerState.BUSY, this.clock);
      server.clientInService = server.pausedClient;
      server.serviceEndTime = this.clock + server.pausedServiceRemaining;
      
      server.pausedClient = null;
      server.pausedServiceRemaining = null;
      
      // Inserta nuevamente el evento de fin de servicio en la FEL
      this.fel.push(createEvent(server.serviceEndTime, EventType.SERVICE_END, { serverId: server.id, clientId: server.clientInService.id }));
      this.#recordHistory(EventType.SERVER_BREAK_END, `S${server.id} regresa -> C${server.clientInService.id} continúa`);
    } else {
      // Si estaba libre, intenta tomar un cliente de la cola
      this.#selectNextClientForServer(server);
      this.#recordHistory(EventType.SERVER_BREAK_END, `S${server.id} regresa`);
    }
  }

  /**
   * Maneja la pérdida de paciencia de un cliente en espera (Abandono de Cola).
   * Remueve al cliente de la cola si no ha sido atendido en el instante que expira su paciencia.
   * @param {Object} event - Evento extraído de la FEL.
   */
  #handleAbandonment(event) {
    const { clientId } = event.data;
    let client = null;
    
    // Función auxiliar para buscar y sacar al cliente de cualquier estructura de cola
    const findAndRemove = (queue) => {
      const idx = queue.findIndex(c => c.id === clientId);
      if (idx !== -1) return queue.splice(idx, 1)[0];
      return null;
    };

    // Intenta remover de colas globales (VIP/Común) o colas locales de servidores
    client = findAndRemove(this.queues.vip) || findAndRemove(this.queues.default);
    if (!client) {
      for (const server of this.servers) {
        client = findAndRemove(server.queue);
        if (client) break;
      }
    }

    // Si el cliente todavía estaba esperando, concreta el abandono e incrementa métricas
    if (client) {
      this.stats.clientsAbandoned++;
      if (this.clock - this.config.startTime <= 3600) {
        this.stats.abandonmentsFirstHour++;
      }
      this.#recordHistory(EventType.ABANDONMENT, `C${clientId} abandona cola`);
    }
  }

  #finalizeAtHorizon() {
    if (this.finishedAtHorizon) return;

    const maxTimeAbs = this.config.startTime + this.config.maxTime;
    if (this.clock < maxTimeAbs) {
      this.clock = maxTimeAbs;
      this.#recordHistory('FIN_SIMULACION', 'Fin de la simulación');
      this.#evaluateCheckpoints();
    }

    this.finishedAtHorizon = true;
  }

  /**
   * Ejecuta un paso completo de la simulación (Bucle de Eventos Principal).
   * Recupera el evento más inmediato de la FEL, actualiza el reloj del sistema,
   * elimina el evento procesado y delega la ejecución al manejador específico.
   * @returns {boolean} True si la simulación continuó; False si terminó o excedió el límite de tiempo.
   */
  step() {
    const event = this.#getNextEvent();
    if (!event) {
      this.#finalizeAtHorizon();
      return false;
    }

    const maxTimeAbs = this.config.startTime + this.config.maxTime;
    if (event.time > maxTimeAbs) {
      this.#finalizeAtHorizon();
      return false;
    }

    this.clock = event.time; // Avance del reloj al instante del evento (Simulación por Eventos Discretos)
    this.fel = this.fel.filter(e => e.id !== event.id); // Remueve el evento actual de la FEL

    // Despacho del evento
    switch (event.type) {
      case EventType.ARRIVAL: this.#handleArrival(event, false); break;
      case EventType.ARRIVAL_VIP: this.#handleArrival(event, true); break;
      case EventType.SERVICE_END: this.#handleServiceEnd(event); break;
      case EventType.SERVER_BREAK_START: this.#handleServerBreakStart(event); break;
      case EventType.SERVER_BREAK_END: this.#handleServerBreakEnd(event); break;
      case EventType.ABANDONMENT: this.#handleAbandonment(event); break;
      case EventType.ARRIVAL_PS: this.#handleArrivalPS(event); break;
    }

    // Re-evalúa checkpoints en cada paso para ver si se toman fotos
    this.#evaluateCheckpoints();

    return true;
  }

  /**
   * Registra una instantánea detallada del estado de la simulación en este paso temporal.
   * Es utilizada por el frontend para renderizar paso a paso las animaciones de la grilla de ejecución.
   * @param {string} eventType - El tipo de evento procesado.
   * @param {string} action - Una descripción en texto amigable del cambio de estado.
   */
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

  /**
   * Permite agregar dinámicamente un checkpoint para capturar una instantánea del estado
   * del sistema cuando se satisfaga una condición específica.
   * @param {string} name - Nombre descriptivo del checkpoint.
   * @param {Function} condition - Función evaluadora que recibe la simulación y retorna true/false.
   * @param {boolean} [isEventBased=false] - Si es true, se evalúa en cada paso; si no, se desactiva tras el primer acierto.
   */
  addCheckpoint(name, condition, isEventBased = false) {
    this.checkpoints.push({ name, condition, isEventBased, triggered: false });
  }

  /**
   * Evalúa las condiciones de todos los checkpoints registrados y almacena una instantánea
   * si la condición resulta verdadera.
   */
  #evaluateCheckpoints() {
    for (const cp of this.checkpoints) {
      if (cp.isEventBased || !cp.triggered) {
        if (cp.condition(this)) {
          this.checkpointSnapshots.push({
            name: cp.name,
            time: this.clock,
            stats: { ...this.stats },
            queueLength: this.topology === SystemTopology.SINGLE_QUEUE 
              ? this.queues.default.length + this.queues.vip.length 
              : this.servers.reduce((sum, s) => sum + s.queue.length, 0),
            serverState: this.servers.length > 1 
              ? this.servers.map(s => s.state === 'OCUPADO' ? '1' : s.state === 'AUSENTE' ? 'A' : '0').join(' | ') 
              : this.servers[0].state
          });
          if (!cp.isEventBased) {
            cp.triggered = true; // Desactiva para evitar ejecuciones reiteradas de checkpoints puntuales
          }
        }
      }
    }
  }

  /**
   * Ejecuta de corrido toda la simulación hasta su finalización o hasta alcanzar un límite superior de seguridad.
   * @returns {Object} Los resultados y estadísticas acumuladas de toda la ejecución.
   */
  run() {
    const MAX_STEPS = 100000; // Límite de seguridad para evitar bucles infinitos en distribuciones anómalas
    let steps = 0;
    while (this.step()) {
      if (++steps >= MAX_STEPS) {
        console.warn('Simulation halted: max steps limit reached.');
        break;
      }
    }
    return this.getResults();
  }

  /**
   * Procesa las estadísticas del sistema al término de la simulación.
   * Calcula la tasa de utilización individualizada de los servidores.
   * @returns {Object} Historial de pasos y métricas de desempeño consolidadas.
   */
  getResults() {
    const next = this.#getNextEvent();
    if (!next || next.time > this.config.startTime + this.config.maxTime) {
      this.#finalizeAtHorizon();
    }

    const totalTime = this.clock - this.config.startTime;
    return {
      history: this.history,
      stats: {
        ...this.stats,
        totalTime,
        serverStats: this.servers.map(s => {
          let bTime = s.busyTime;
          // Si termina estando ocupado, añade el tiempo remanente de ocupación hasta el reloj final
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

  /**
   * Retorna el estado dinámico detallado del simulador en el instante actual.
   * Permite actualizar tableros e interfaces de control en tiempo real.
   * @returns {Object} Estado dinámico resumido.
   */
  getCurrentState() {
    const finished = this.isFinished();
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
      isFinished: finished
    };
  }

  /**
   * Valida si el proceso de simulación ha alcanzado su fin lógico.
   * - No quedan más eventos programados en la FEL.
   * - El tiempo de simulación excedió el tiempo máximo configurado.
   * @returns {boolean} True si terminó; False en caso contrario.
   */
  isFinished() {
    const next = this.#getNextEvent();
    if (!next || next.time > this.config.startTime + this.config.maxTime) {
      this.#finalizeAtHorizon();
      return true;
    }
    return false;
  }
}

/**
 * Función utilitaria para dar formato al tiempo absoluto de simulación.
 * Traduce segundos transcurridos a formato HH:MM:SS en base a una hora de inicio.
 * @param {number} seconds - Los segundos transcurridos totales.
 * @param {number} [startTime=0] - Segundos iniciales de la simulación.
 * @returns {string} Cadena en formato legible HH:MM:SS.
 */
export function formatTime(seconds, startTime = 0) {
  const abs = startTime + seconds;
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.floor(abs % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
