# EventMaster - Documentación Técnica Completa

## 1. Propósito del Proyecto

EventMaster es un **simulador académico de Teoría de Colas** que implementa el método de **Simulación de Eventos Discretos (DES - Discrete Event Simulation)**. Su propósito es modelar y visualizar sistemas de atención al cliente, permitiendo analizar el comportamiento de colas bajo diferentes configuraciones.

### Objetivos principales:
- Modelar sistemas de colas con múltiples configuraciones
- Simular llegadas de clientes, procesos de servicio, colas de espera
- Simular abandonos por impaciencia
- Modelar descansos de servidores
- Soportar múltiples servidores y topologías
- Priorizar clientes VIP

---

## 2. Arquitectura General

El proyecto se divide en dos componentes:

```
EventMaster/
├── src/                    # Motor de simulación (JavaScript/Node.js)
│   ├── core/               # Motor principal
│   ├── models/             # Modelos de datos (Client, Queue, Server)
│   ├── events/             # Tipos de eventos
│   ├── config/             # Configuración
│   ├── utils/              # Utilidades estadísticas
│   └── examples/           # Ejemplos de uso
│
└── eventmaster-web/        # Interfaz web (React + Vite)
    ├── src/
    │   ├── engine/         # Motor adaptado para web
    │   ├── components/     # Componentes React
    │   └── utils/          # Utilidades web
    └── package.json
```

---

## 3. Motor de Simulación (src/)

### 3.1 Core - Motor Principal

#### SimulationClock.js - Reloj de Simulación
```javascript
// Maneja el tiempo actual de la simulación
// No avanza linealmente, sino que salta de evento en evento
class SimulationClock {
    constructor() {
        this.time = 0;  // Tiempo actual en segundos desde inicio
    }
    
    advanceTo(newTime) {
        this.time = newTime;  // Avanza al tiempo del siguiente evento
    }
    
    getTime() {
        return this.time;
    }
}
```
**Propósito**: Mantener el tiempo de simulación. En DES, el tiempo no avanza uniformemente, sino que salta directamente al tiempo del siguiente evento en la lista de eventos futuros.

#### FutureEventList.js - Lista de Eventos Futuros (FEL)
```javascript
// Estructura fundamental en DES - mantiene eventos ordenados por tiempo
class FutureEventList {
    constructor() {
        this.events = [];  // Lista de eventos pendientes
    }
    
    // Añade un evento ordenándolo por tiempo (y prioridad si hay empatados)
    add(event) {
        this.events.push(event);
        this.events.sort((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            return a.priority - b.priority;  // VIP tiene prioridad 0
        });
    }
    
    // Obtiene y remueve el siguiente evento (el más próximo)
    next() {
        return this.events.shift();
    }
    
    isEmpty() {
        return this.events.length === 0;
    }
}
```
**Propósito**: La FEL es el corazón de la simulación. Contiene todos los eventos futuros pendientes organizados por tiempo. El simulador siempre toma el evento con menor tiempo.

#### types.js - Tipos y Constantes
```javascript
// Estados del servidor
const ServerState = {
    IDLE: 'idle',      // Sin trabajo
    BUSY: 'busy',      // Atendiendo cliente
    BREAK: 'break',   // En descanso
    OFFLINE: 'offline' // Desactivado
};

// Prioridad del cliente
const ClientPriority = {
    NORMAL: 1,
    VIP: 0  // Menor número = mayor prioridad
};

// Tipos de eventos
const EventType = {
    ARRIVAL: 'arrival',           // Llega cliente
    SERVICE_END: 'service_end',  // Termina servicio
    SERVER_LEAVE: 'server_leave', // Servidor sale a descanso
    SERVER_ARRIVE: 'server_arrive', // Servidor regresa
    ABANDONMENT: 'abandonment'   // Cliente abandona
};
```
**Propósito**: Definir constantes y tipos utilizados en todo el proyecto para mantener consistencia.

#### Simulator.js - Clase Principal del Simulador
```javascript
class Simulator {
    constructor(config) {
        this.config = config;
        this.clock = new SimulationClock();
        this.fel = new FutureEventList();
        this.servers = [];      // Array de servidores
        this.queue = new Queue(config.queueCapacity);
        this.stats = {          // Estadísticas
            served: 0,          // Clientes atendidos
            abandoned: 0,       // Clientes abandonados
            totalWaitTime: 0    // Tiempo total de espera
        };
        this.history = [];      // Historial de eventos
    }
    
    // Inicializa la simulación
    initialize() {
        // 1. Crear clientes iniciales si los hay
        for (let i = 0; i < this.config.initialClients; i++) {
            this.queue.enqueue(new Client({ priority: 'normal' }));
        }
        
        // 2. Crear servidores
        for (let i = 0; i < this.config.numServers; i++) {
            this.servers.push(new Server(i + 1));
        }
        
        // 3. Programar primera llegada
        this.scheduleArrival(this.config.arrivalDistribution());
        
        // 4. Programar descansos si aplica
        if (this.config.serverBreaks) {
            this.scheduleBreaks();
        }
    }
    
    // Un paso de simulación - procesa el siguiente evento
    step() {
        // 1. Obtener siguiente evento de la FEL
        const event = this.fel.next();
        if (!event) return { done: true };  // No hay más eventos
        
        // 2. Si superamos el tiempo máximo, terminamos
        if (event.time > this.config.maxTime) {
            return { done: true };
        }
        
        // 3. Avanzar el reloj al tiempo del evento
        this.clock.advanceTo(event.time);
        
        // 4. Procesar el evento según su tipo
        this.processEvent(event);
        
        // 5. Registrar en historial
        this.history.push({
            time: this.clock.getTime(),
            event: event.type,
            details: event.data
        });
        
        return { done: false, time: this.clock.getTime() };
    }
    
    // Procesa una llegada de cliente
    processArrival(event) {
        const client = new Client({
            arrivalTime: this.clock.getTime(),
            patience: this.config.patienceDistribution()
        });
        
        // Si hay servidor libre, atender inmediatamente
        const freeServer = this.servers.find(s => s.state === 'idle');
        if (freeServer) {
            freeServer.state = 'busy';
            freeServer.currentClient = client;
            client.serviceStartTime = this.clock.getTime();
            // Programar fin de servicio
            this.scheduleServiceEnd(freeServer);
        } else {
            // Si la cola no está llena, añadir a la cola
            if (this.queue.size() < this.config.queueCapacity) {
                this.queue.enqueue(client);
            } else {
                // Cola llena - cliente se va
                this.stats.abandoned++;
            }
        }
        
        // Programar próxima llegada
        this.scheduleArrival(this.config.arrivalDistribution());
    }
    
    // Procesa fin de servicio
    processServiceEnd(event) {
        const server = event.server;
        const client = server.currentClient;
        
        this.stats.served++;
        this.stats.totalWaitTime += (this.clock.getTime() - client.arrivalTime);
        
        // Liberar servidor
        server.state = 'idle';
        server.currentClient = null;
        
        // Si hay alguien en cola, atender al siguiente
        if (this.queue.size() > 0) {
            const nextClient = this.queue.dequeue();
            server.state = 'busy';
            server.currentClient = nextClient;
            nextClient.serviceStartTime = this.clock.getTime();
            this.scheduleServiceEnd(server);
        }
    }
    
    // Procesa abandono por impaciencia
    processAbandonment(event) {
        const client = event.client;
        this.queue.remove(client.id);  // Remover de la cola
        this.stats.abandoned++;
    }
}
```

#### SimulationEngine.js - Motor Avanzado
```javascript
// Versión mejorada del simulador con funciones puras
// Soporta múltiples servidores, topologías y zona de seguridad
class SimulationEngine {
    // Función pura para procesar eventos
    static processEvent(state, event) {
        switch (event.type) {
            case 'ARRIVAL':
                return this.handleArrival(state, event);
            case 'SERVICE_END':
                return this.handleServiceEnd(state, event);
            case 'SERVER_LEAVE':
                return this.handleServerLeave(state, event);
            case 'SERVER_ARRIVE':
                return this.handleServerArrive(state, event);
            case 'ABANDONMENT':
                return this.handleAbandonment(state, event);
        }
    }
    
    // Soporta diferentes topologías:
    static Topologies = {
        AISLADOS: 'aislados',      // Sistemas paralelos independientes
        COLA_UNICA: 'cola_unica',  // Un servidor común (supermercado)
        ENCADENADOS: 'encadenados'  // Puestos sucesivos
    };
}
```

### 3.2 Models - Modelos de Datos

#### Client.js - Modelo de Cliente
```javascript
class Client {
    constructor(options = {}) {
        this.id = options.id || generateId();
        this.arrivalTime = options.arrivalTime || 0;      // Hora de llegada
        this.serviceStartTime = options.serviceStartTime; // Inicio de atención
        this.priority = options.priority || 'normal';      // 'normal' o 'vip'
        this.patience = options.patience || Infinity;     // Tiempo máx en cola
        this.status = 'waiting';                           // waiting, served, abandoned
    }
    
    // Calcula tiempo de espera hasta ahora
    getWaitTime(currentTime) {
        if (this.serviceStartTime) {
            return this.serviceStartTime - this.arrivalTime;
        }
        return currentTime - this.arrivalTime;
    }
}
```
**Propósito**: Representa un cliente en el sistema con su información de llegada, prioridad, paciencia y estado.

#### Queue.js - Modelo de Cola
```javascript
class Queue {
    constructor(maxCapacity = Infinity) {
        this.clients = [];  // Array de clientes en espera
        this.maxCapacity = maxCapacity;
    }
    
    // Añade cliente a la cola
    enqueue(client) {
        if (this.clients.length >= this.maxCapacity) {
            return false;  // Cola llena
        }
        // VIPs van al principio, luego por orden de llegada
        if (client.priority === 'vip') {
            // Encontrar posición después del último VIP
            const lastVipIndex = this.clients.findLastIndex(c => c.priority === 'vip');
            this.clients.splice(lastVipIndex + 1, 0, client);
        } else {
            this.clients.push(client);
        }
        return true;
    }
    
    // Remueve el primer cliente (el de más tiempo esperando)
    dequeue() {
        return this.clients.shift();
    }
    
    // Busca cliente por ID
    find(clientId) {
        return this.clients.find(c => c.id === clientId);
    }
    
    // Remueve cliente específico
    remove(clientId) {
        const index = this.clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            return this.clients.splice(index, 1)[0];
        }
        return null;
    }
    
    size() {
        return this.clients.length;
    }
}
```
**Propósito**: Gestiona la cola de espera con soporte para prioridad VIP (los clientes VIP se insertan antes que los normales) y capacidad máxima.

#### Server.js - Modelo de Servidor
```javascript
class Server {
    constructor(id) {
        this.id = id;
        this.state = 'idle';    // idle, busy, break
        this.currentClient = null;
        this.totalServiceTime = 0;
        this.serviceCount = 0;
        this.breakSchedule = [];  // Programación de descansos
    }
    
    // Asigna un cliente al servidor
    assignClient(client) {
        this.state = 'busy';
        this.currentClient = client;
        this.serviceCount++;
    }
    
    // Libera al servidor
    release() {
        this.currentClient = null;
        this.state = 'idle';
    }
    
    // Va a descanso
    goOnBreak() {
        this.state = 'break';
        this.currentClient = null;  // Cliente debe esperar
    }
    
    // Regresa de descanso
    returnFromBreak() {
        this.state = 'idle';
    }
    
    // Calcula utilización del servidor
    getUtilization() {
        return this.totalServiceTime / this.serviceCount || 0;
    }
}
```
**Propósito**: Representa un servidor (empleado/caja) con su estado actual, cliente en atención y estadísticas.

### 3.3 Events - Tipos de Eventos

#### Event.js - Clase Base de Eventos
```javascript
class Event {
    constructor(type, time, data = {}, priority = 10) {
        this.type = type;        // Tipo de evento
        this.time = time;        // Tiempo del evento
        this.data = data;        // Datos asociados
        this.priority = priority; // Prioridad (menor = más importante)
    }
}
```
**Propósito**: Clase base abstracta para todos los eventos. Define estructura común (tipo, tiempo, datos, prioridad).

#### ArrivalEvent.js - Evento de Llegada
```javascript
class ArrivalEvent extends Event {
    constructor(time, client = null, isVip = false) {
        super(
            'ARRIVAL',
            time,
            { client, isVip },
            isVip ? 0 : 10  // VIP tiene prioridad 0 (más alta)
        );
    }
}
```
**Propósito**: Representa la llegada de un nuevo cliente al sistema. Los clientes VIP tienen mayor prioridad.

#### ServiceEndEvent.js - Evento Fin de Servicio
```javascript
class ServiceEndEvent extends Time, server) {
    super('SERVICE_END', time, { server });
}
```
**Propósito**: Indica que un servidor ha terminado de atender a un cliente.

#### ServerBreakEvent.js - Evento de Descanso
```javascript
class ServerBreakEvent extends Event {
    constructor(time, server, isStart = true) {
        super(
            isStart ? 'SERVER_LEAVE' : 'SERVER_ARRIVE',
            time,
            { server },
            5  // Prioridad media
        );
    }
}
```
**Propósito**: Representa la salida (inicio de descanso) o llegada (fin de descanso) de un servidor.

#### AbandonmentEvent.js - Evento de Abandono
```javascript
class AbandonmentEvent extends Event {
    constructor(time, client) {
        super('ABANDONMENT', time, { client }, 1);
    }
}
```
**Propósito**: Representa que un cliente abandona la cola por impaciencia.

### 3.4 Config - Configuración

#### SimulationConfig.js - Clase de Configuración
```javascript
class SimulationConfig {
    constructor(options = {}) {
        // Tiempo máximo de simulación (en segundos)
        this.maxTime = options.maxTime || 3600;
        
        // Número de servidores
        this.numServers = options.numServers || 1;
        
        // Distribución de tiempos entre llegadas
        this.arrivalDistribution = options.arrivalDistribution || exponential(60);
        
        // Distribución de tiempos de servicio
        this.serviceDistribution = options.serviceDistribution || exponential(120);
        
        // Capacidad máxima de la cola
        this.queueCapacity = options.queueCapacity || Infinity;
        
        // Clientes iniciales en cola
        this.initialClients = options.initialClients || 0;
        
        // Habilitar descansos del servidor
        this.serverBreaks = options.serverBreaks || false;
        
        // Configuración de descansos (si aplica)
        this.breakConfig = options.breakConfig || {
            workDuration: 1800,  // 30 min de trabajo
            breakDuration: 300  // 5 min de descanso
        };
        
        // Habilitar abandonos
        this.enableAbandonments = options.enableAbandonments || false;
        
        // Distribución de paciencia (tiempo máximo en cola)
        this.patienceDistribution = options.patienceDistribution || () => Infinity;
        
        // Topología del sistema
        this.topology = options.topology || 'cola_unica';
        
        // Habilitar clientes VIP
        this.vipEnabled = options.vipEnabled || false;
        
        // Probabilidad de cliente VIP
        this.vipProbability = options.vipProbability || 0.1;
        
        // Zona de seguridad (checkpoint extra)
        this.safetyZone = options.safetyZone || { enabled: false, time: 1800 };
    }
}
```
**Propósito**: Configuración flexible que permite definir todos los parámetros de la simulación.

### 3.5 Utils - Utilidades Estadísticas

#### distributions.js - Funciones de Distribución
```javascript
// Distribución exponencial (para tiempos entre llegadas)
// La más común en teoría de colas
function exponential(lambda) {
    // Genera tiempo usando -ln(U)/lambda
    // donde U es un número aleatorio entre 0 y 1
    return -Math.log(Math.random()) / lambda;
}

// Distribución uniforme (tiempo constante con variación)
function uniform(min, max) {
    return min + Math.random() * (max - min);
}

// Tiempo constante (determinístico)
function deterministic(value) {
    return value;
}

// Distribución normal (Gaussian)
function normal(mean, stdDev) {
    // Algoritmo Box-Muller
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
}

// Fábrica de distribuciones
function createDistribution(type, params) {
    switch (type) {
        case 'exponential':
            return () => exponential(params.lambda);
        case 'uniform':
            return () => uniform(params.min, params.max);
        case 'deterministic':
            return () => deterministic(params.value);
        case 'normal':
            return () => normal(params.mean, params.stdDev);
    }
}
```
**Propósito**: Proporciona diferentes distribuciones estadísticas para modelar tiempos de llegada y servicio. La distribución exponencial es la más usada en teoría de colas porque modela procesos de Poisson.

---

## 4. Interfaz Web (eventmaster-web/)

### 4.1 Componentes Principales

#### App.jsx - Componente Principal
```javascript
function App() {
    // Estados principales
    const [simulator, setSimulator] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [config, setConfig] = useState(defaultConfig);
    const [stats, setStats] = useState(initialStats);
    
    // Control de velocidad con requestAnimationFrame
    useEffect(() => {
        if (!isRunning || !simulator) return;
        
        let lastTime = performance.now();
        let accumulator = 0;
        
        const loop = (currentTime) => {
            const delta = currentTime - lastTime;
            lastTime = currentTime;
            
            // Ejecutar steps según la velocidad
            const stepsPerFrame = speed;  // 1-10
            for (let i = 0; i < stepsPerFrame; i++) {
                const result = simulator.step();
                if (result.done) {
                    setIsRunning(false);
                    return;
                }
            }
            
            // Actualizar estado
            setStats(simulator.getStats());
            
            requestAnimationFrame(loop);
        };
        
        requestAnimationFrame(loop);
    }, [isRunning, speed, simulator]);
    
    // Atajos de teclado
    useEffect(() => {
        const handleKeyPress = (e) => {
            switch (e.key.toLowerCase()) {
                case 'i': initialize(); break;
                case 'p': togglePlay(); break;
                case 's': step(); break;
                case 'r': reset(); break;
            }
        };
        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, []);
    
    // Renderizado de componentes
    return (
        <div className="app">
            <ConfigPanel config={config} onChange={setConfig} />
            <ControlPanel 
                onInitialize={initialize}
                onStep={step}
                onPlay={togglePlay}
                onReset={reset}
                onExport={exportCSV}
                speed={speed}
                isRunning={isRunning}
            />
            <StatsPanel stats={stats} />
            <AdvancedTable simulator={simulator} />
        </div>
    );
}
```
**Propósito**: Componente principal que coordina toda la aplicación. Maneja el estado del simulador, controles de reproducción, y conecta todos los componentes.

#### ConfigPanel.jsx - Panel de Configuración
```javascript
// Permite configurar todos los parámetros de la simulación
function ConfigPanel({ config, onChange }) {
    return (
        <div className="config-panel">
            {/* Tiempo máximo */}
            <TimeInput 
                label="Tiempo máximo"
                value={config.maxTime}
                onChange={v => onChange({...config, maxTime: v})}
            />
            
            {/* Número de servidores */}
            <input 
                type="number"
                min="1" max="10"
                value={config.numServers}
                onChange={e => onChange({...config, numServers: parseInt(e.target.value)})}
            />
            
            {/* Distribución de llegada */}
            <TimeField
                label="Tiempo entre llegadas"
                value={config.arrivalTime}
                onChange={v => onChange({...config, arrivalTime: v})}
            />
            
            {/* Distribución de servicio */}
            <TimeField
                label="Tiempo de servicio"
                value={config.serviceTime}
                onChange={v => onChange({...config, serviceTime: v})}
            />
            
            {/* Topología */}
            <select 
                value={config.topology}
                onChange={e => onChange({...config, topology: e.target.value})}
            >
                <option value="cola_unica">Cola Única</option>
                <option value="aislados">Aislados</option>
                <option value="encadenados">Encadenados</option>
            </select>
            
            {/* Opciones adicionales */}
            <Checkboxes
                options={[
                    { label: 'Descansos', checked: config.serverBreaks },
                    { label: 'Abandonos', checked: config.enableAbandonments },
                    { label: 'Clientes VIP', checked: config.vipEnabled },
                    { label: 'Zona de seguridad', checked: config.safetyZone.enabled }
                ]}
            />
        </div>
    );
}
```
**Propósito**: Interfaz visual para configurar todos los parámetros de la simulación de forma intuitiva.

#### ControlPanel.jsx - Panel de Control
```javascript
function ControlPanel({ onInitialize, onStep, onPlay, onReset, onExport, speed, isRunning }) {
    return (
        <div className="control-panel">
            {/* Botones principales */}
            <button onClick={onInitialize} title="Inicializar (I)">
                Inicializar
            </button>
            <button onClick={onStep} title="Un paso (S)">
                Paso
            </button>
            <button 
                onClick={onPlay} 
                className={isRunning ? 'playing' : ''}
                title="Play/Pause (P)"
            >
                {isRunning ? 'Pausar' : 'Ejecutar'}
            </button>
            <button onClick={onReset} title="Reiniciar (R)">
                Reiniciar
            </button>
            <button onClick={onExport}>
                Exportar CSV
            </button>
            
            {/* Control de velocidad */}
            <div className="speed-control">
                <label>Velocidad: {speed}x</label>
                <input 
                    type="range" min="1" max="10"
                    value={speed}
                    onChange={e => setSpeed(parseInt(e.target.value))}
                />
            </div>
            
            {/* Barra de progreso */}
            <ProgressBar progress={currentTime / maxTime} />
        </div>
    );
}
```
**Propósito**: Proporciona controles para interactuar con la simulación (iniciar, pausar, avanzar paso a paso, ajustar velocidad).

#### StatsPanel.jsx - Panel de Estadísticas
```javascript
function StatsPanel({ stats }) {
    return (
        <div className="stats-panel">
            <h3>Estadísticas</h3>
            <div className="stat-grid">
                <div className="stat">
                    <label>Tiempo actual</label>
                    <value>{formatTime(stats.currentTime)}</value>
                </div>
                <div className="stat">
                    <label>Clientes en cola</label>
                    <value>{stats.queueLength}</value>
                </div>
                <div className="stat">
                    <label>Atendidos</label>
                    <value>{stats.served}</value>
                </div>
                <div className="stat">
                    <label>Abandonados</label>
                    <value>{stats.abandoned}</value>
                </div>
                <div className="stat">
                    <label>En servicio</label>
                    <value>{stats.inService}</value>
                </div>
                <div className="stat">
                    <label>Tiempo promedio de espera</label>
                    <value>{formatTime(stats.avgWaitTime)}</value>
                </div>
            </div>
            
            {/* Conclusiones al final */}
            {stats.isComplete && (
                <div className="conclusions">
                    <h4>Conclusiones</h4>
                    <p>Utilización: {stats.utilization}%</p>
                    <p>Tasa de abandonos: {stats.abandonRate}%</p>
                </div>
            )}
        </div>
    );
}
```
**Propósito**: Muestra estadísticas en tiempo real durante la simulación y conclusiones al finalizar.

#### AdvancedTable.jsx - Tabla Avanzada de Eventos
```javascript
function AdvancedTable({ simulator }) {
    // Muestra el estado detallado del sistema
    return (
        <div className="advanced-table">
            <table>
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Próxima llegada</th>
                        <th>Próximo fin servicio</th>
                        <th>Cola</th>
                        <th>Servidores</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((row, i) => (
                        <tr key={i}>
                            <td>{formatTime(row.time)}</td>
                            <td>{row.nextArrival ? formatTime(row.nextArrival) : '-'}</td>
                            <td>{row.nextService ? formatTime(row.nextService) : '-'}</td>
                            <td>{row.queueLength}</td>
                            <td>
                                {row.servers.map(s => (
                                    <span className={`server ${s.state}`}>
                                        {s.id}
                                    </span>
                                ))}
                            </td>
                            <td>{row.eventType}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```
**Propósito**: Muestra una tabla detallada con el historial de eventos, estado de servidores y cola en cada paso.

### 4.2 Utilidades Web

#### timeParser.js - Parser de Tiempo
```javascript
// Parser flexible que acepta diferentes formatos:
// - "60" -> constante 60 segundos
// - "30 - 90" -> uniforme entre 30 y 90
// - "30, 45, 60" -> selecciona aleatoriamente de la lista
function parseTimeInput(input) {
    const trimmed = input.trim();
    
    // Constante: "60"
    if (/^\d+$/.test(trimmed)) {
        return {
            mode: 'constant',
            value: parseInt(trimmed)
        };
    }
    
    // Rango: "30 - 90"
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
        return {
            mode: 'range',
            min: parseInt(rangeMatch[1]),
            max: parseInt(rangeMatch[2])
        };
    }
    
    // Lista: "30, 45, 60"
    const listMatch = trimmed.split(',').map(s => s.trim());
    if (listMatch.length > 1 && listMatch.every(s => /^\d+$/.test(s))) {
        return {
            mode: 'list',
            values: listMatch.map(s => parseInt(s))
        };
    }
    
    throw new Error('Formato inválido');
}

function getModeLabel(mode) {
    switch (mode) {
        case 'constant': return 'Constante';
        case 'range': return 'Uniforme';
        case 'list': return 'Lista';
    }
}
```
**Propósito**: Permite al usuario ingresar tiempos de diferentes maneras (constante, rango, lista) y los convierte en generadores apropiados.

#### generators.js - Generadores de Valores
```javascript
// Generador de valor constante
class ConstantGenerator {
    constructor(value) {
        this.value = value;
    }
    next() {
        return this.value;
    }
}

// Generador que repite el último valor de una lista
class ListGenerator {
    constructor(values) {
        this.values = values;
        this.index = 0;
    }
    next() {
        const value = this.values[this.index];
        this.index = (this.index + 1) % this.values.length;
        return value;
    }
}

// Generador de distribución uniforme
class UniformGenerator {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }
    next() {
        return this.min + Math.random() * (this.max - this.min);
    }
}

// Generador de distribución exponencial
class ExponentialGenerator {
    constructor(lambda) {
        this.lambda = lambda;
    }
    next() {
        return -Math.log(Math.random()) / this.lambda;
    }
}

// Fábrica de generadores
function createGenerator(type, params) {
    switch (type) {
        case 'constant': return new ConstantGenerator(params.value);
        case 'list': return new ListGenerator(params.values);
        case 'uniform': return new UniformGenerator(params.min, params.max);
        case 'exponential': return new ExponentialGenerator(params.lambda);
    }
}
```
**Propósito**: Crear generadores de valores aleatorios según diferentes distribuciones para usar en la simulación.

### 4.3 Motor de Simulación Web

#### engine/Simulator.js - Simulador Adaptado para Web
```javascript
// Versión completa del simulador para la interfaz web
// 663 líneas de código
// Incluye todas las características avanzadas

class WebSimulator {
    constructor(config) {
        // Configuración
        this.maxTime = config.maxTime;
        this.numServers = config.numServers;
        this.topology = config.topology;  // AISLADOS, COLA_UNICA, ENCADENADOS
        
        // Generadores de tiempo
        this.arrivalGenerator = createGenerator(config.arrivalMode, config.arrivalParams);
        this.serviceGenerator = createGenerator(config.serviceMode, config.serviceParams);
        
        // Estado interno
        this.clock = 0;
        this.fel = new FutureEventList();
        this.servers = [];
        this.queue = [];
        this.stats = {...};
        this.history = [];
        
        // Características opcionales
        this.enableAbandonments = config.enableAbandonments;
        this.enableVIP = config.enableVIP;
        this.enableBreaks = config.enableBreaks;
        
        // Checkpoints
        this.checkpoints = [];
    }
    
    // Inicializa la simulación
    initialize() {
        // Reiniciar todo
        this.clock = 0;
        this.fel = new FutureEventList();
        this.servers = Array.from({ length: this.numServers }, (_, i) => ({
            id: i + 1,
            state: 'idle',
            currentClient: null,
            breakTime: null
        }));
        this.queue = [];
        this.stats = this.getInitialStats();
        
        // Añadir clientes iniciales
        for (let i = 0; i < config.initialClients; i++) {
            this.queue.push(this.createClient());
        }
        
        // Programar primer evento de llegada
        this.scheduleArrival();
        
        // Programar descansos si están habilitados
        if (this.enableBreaks) {
            this.scheduleAllBreaks();
        }
    }
    
    // Ejecuta un paso de la simulación
    step() {
        if (this.fel.isEmpty() || this.clock >= this.maxTime) {
            return { done: true };
        }
        
        const event = this.fel.next();
        this.clock = event.time;
        
        // Procesar según tipo de evento
        switch (event.type) {
            case 'ARRIVAL':
                this.processArrival(event);
                break;
            case 'SERVICE_END':
                this.processServiceEnd(event);
                break;
            case 'SERVER_LEAVE':
                this.processServerLeave(event);
                break;
            case 'SERVER_ARRIVE':
                this.processServerArrive(event);
                break;
            case 'ABANDONMENT':
                this.processAbandonment(event);
                break;
        }
        
        // Evaluar checkpoints
        this.evaluateCheckpoints();
        
        // Registrar en historial
        this.history.push(this.createHistoryEntry(event));
        
        return { done: false, time: this.clock };
    }
    
    // Procesa llegada de cliente según la topología
    processArrival(event) {
        const client = this.createClient(event.isVIP);
        
        if (this.topology === 'cola_unica') {
            // Un servidor común para todos
            const freeServer = this.servers.find(s => s.state === 'idle');
            if (freeServer) {
                this.assignClientToServer(client, freeServer);
            } else {
                this.queue.push(client);
                if (this.enableAbandonments) {
                    this.scheduleAbandonment(client);
                }
            }
        } else if (this.topology === 'aislados') {
            // Cada servidor tiene su propia cola
            const freeServer = this.servers.find(s => s.state === 'idle');
            if (freeServer) {
                this.assignClientToServer(client, freeServer);
            } else {
                // Añadir a la cola del servidor con menor carga
                const bestServer = this.getLeastLoadedServer();
                bestServer.queue.push(client);
            }
        }
        
        // Programar próxima llegada
        this.scheduleArrival();
    }
    
    // Procesa fin de servicio
    processServiceEnd(event) {
        const { server, client } = event.data;
        
        this.stats.served++;
        this.stats.totalWaitTime += (this.clock - client.arrivalTime);
        
        // Liberar servidor
        server.state = 'idle';
        
        // Asignar siguiente cliente según topología
        if (this.topology === 'cola_unica') {
            if (this.queue.length > 0) {
                const nextClient = this.queue.shift();
                this.assignClientToServer(nextClient, server);
            }
        } else if (this.topology === 'aislados') {
            if (server.queue && server.queue.length > 0) {
                const nextClient = server.queue.shift();
                this.assignClientToServer(nextClient, server);
            }
        }
    }
    
    // Asigna cliente a servidor y programa fin de servicio
    assignClientToServer(client, server) {
        server.state = 'busy';
        server.currentClient = client;
        client.serviceStartTime = this.clock;
        
        const serviceTime = this.serviceGenerator.next();
        this.fel.add({
            type: 'SERVICE_END',
            time: this.clock + serviceTime,
            data: { server, client }
        });
    }
    
    // Obtiene estadísticas actuales
    getStats() {
        return {
            currentTime: this.clock,
            queueLength: this.queue.length,
            served: this.stats.served,
            abandoned: this.stats.abandoned,
            inService: this.servers.filter(s => s.state === 'busy').length,
            idle: this.servers.filter(s => s.state === 'idle').length,
            onBreak: this.servers.filter(s => s.state === 'break').length,
            avgWaitTime: this.stats.served > 0 
                ? this.stats.totalWaitTime / this.stats.served 
                : 0,
            utilization: this.calculateUtilization()
        };
    }
    
    // Calcula utilización del sistema
    calculateUtilization() {
        const busyServers = this.servers.filter(s => s.state === 'busy').length;
        return (busyServers / this.numServers) * 100;
    }
}
```

---

## 5. Flujo de Ejecución de la Simulación

### 5.1 Inicialización
```
1. Se crea el simulador con una configuración específica
2. Se crean los servidores (1-10 según config)
3. Se crean los clientes iniciales (si los hay)
4. Se programa el primer evento de llegada
5. Se programa el primer descanso (si aplica)
```

### 5.2 Bucle Principal (step)
```
MIENTRAS haya eventos y tiempo < maxTime:
    1. Obtener siguiente evento de la FEL (menor tiempo)
    2. Avanzar reloj al tiempo del evento
    3. Procesar el evento:
       - LLEGADA: crear cliente, añadir a cola o iniciar servicio
       - FIN SERVICIO: liberar servidor, asignar siguiente cliente
       - ABANDONO: eliminar cliente de cola
       - SALIDA SERVIDOR: pausar servicio, programar regreso
       - LLEGADA SERVIDOR: reanudar servicio o buscar cliente
    4. Evaluar checkpoints
    5. Registrar en historial
```

### 5.3 Finalización
```
- Se alcanza tiempo máximo
- O la FEL queda vacía
- Se generan estadísticas finales
- Se muestran conclusiones
```

---

## 6. Topologías Soportadas

### 6.1 Cola Única (Cola Unica)
```
   Cola ────────┐
    [A,B,C]     ▼
   ┌─────────┐  ┌─────────┐
   │ Serv 1  │  │ Serv 2  │  ...
   └─────────┘  └─────────┘
```
- Múltiples servidores comparten una única cola
- El primer cliente en cola va al primer servidor libre
- Like: Supermercado, banco

### 6.2 Aislados
```
   Cola 1 ──► [Serv 1]
   Cola 2 ──► [Serv 2]
   Cola 3 ──► [Serv 3]
```
- Cada servidor tiene su propia cola independiente
- Clientes eligen la cola más corta
- Like: Cajas de pago独立

### 6.3 Encadenados
```
   Cliente → [Serv 1] → [Serv 2] → [Serv 3] → Salida
```
- El cliente debe pasar por todos los servidores en secuencia
- Like: Línea de producción, servicios multiplexados

---

## 7. Presets Académicos

El proyecto incluye presets para ejercicios de guías universitarias:

| Preset | Descripción |
|--------|-------------|
| `default` | Simulación básica con descansos y abandonos |
| `guia4_ej3` | Piezas desviadas - abandono con paciencia 0 |
| `guia4_ej1` | 100 clientes iniciales con descansos |
| `guia4_ej4` | Carpintero - sin llegadas, 6 sillas iniciales |

---

## 8. Cómo Ejecutar

### Aplicación Web:
```bash
cd eventmaster-web
npm install
npm run dev
# Acceso en http://localhost:5173
```

### Motor CLI:
```bash
npm start      # Ejecuta demo.js
npm test       # Ejecuta tests
```

---

## 9. Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| `I` | Inicializar simulación |
| `P` | Play/Pause |
| `S` | Ejecutar un paso |
| `R` | Reiniciar |

---

## 10. Conclusión

EventMaster es un simulador completo de teoría de colas que implementa el método de Simulación de Eventos Discretos (DES). Su arquitectura modular permite:

- **Flexibilidad**: Múltiples topologías, distribuciones y configuraciones
- **Extensibilidad**: Fácil añadir nuevos tipos de eventos o comportamientos
- **Usabilidad**: Interfaz web intuitiva con controles y estadísticas en tiempo real
- **Educación**: Presets académicos para práctica de ejercicios

El código está bien estructurado y documentado, facilitando su mantenimiento y evolución.

---

## 11. Changelog - Actualizaciones Recientes

### v3.1 - Corrección de Ciclos de Descanso y Numeración de Checkpoints (Mayo 2026)

- **Unidades y Mapeo en Stats:** Se corrigió el panel resumen para mostrar el tiempo transcurrido en minutos (dividiendo `clock` por 60) e implementar etiquetas semánticas y adaptativas según el preset académico activo (usando `vocab`).
- **Descansos Cíclicos Infinitos:** Se corrigió un bug en `Simulator.js` donde `server.nextBreakTime` quedaba con el valor del descanso anterior e impedía que se programaran subsiguientes descansos en `#scheduleWorkCycle`. Ahora se simulan infinitos descansos cíclicos.
- **Sincronización en Historial y Presencia:** Se reordenó la ejecución de eventos en `#handleServerBreakStart` y `#handleServerBreakEnd` para asegurar la actualización completa de las variables de estado del servidor (`present`, `state`, `nextBreakTime`, `nextWorkTime`) antes de tomar la captura en `#recordHistory`. Esto eliminó el retraso de una fila en la tabla para actualizar la visualización de la presencia y tiempos del servidor.
- **Galería Modal Numerada:** Se integró numeración secuencial (`#1`, `#2`, etc.) en los encabezados del componente `<CheckpointsModal>` para hacer más fácil el seguimiento cronológico de las fotos capturadas.