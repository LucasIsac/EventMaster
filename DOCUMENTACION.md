# EventMaster - Documentación Técnica Completa

## 1. Overview del Proyecto

EventMaster es un simulador visual académico de teoría de colas que implementa el método de **Simulación de Eventos Discretos (DES)** para modelar sistemas de atención al cliente (desde M/M/1 hasta múltiples servidores).

El simulador permite:
- Modelar llegadas de clientes y tiempos de servicio
- Configurar múltiples servidores y topologías de sistema (Cola Única, Aislados, Encadenados)
- Configurar prioridades (clientes VIP)
- Manejar abandonos cuando el tiempo de espera excede un límite
- Simular ciclos de trabajo/descanso de los servidores

---

## 2. Estructura del Proyecto

```
eventmaster-web/
├── src/
│   ├── engine/
│   │   └── Simulator.js      # Motor de simulación DES con Checkpoints
│   ├── components/
│   │   ├── ConfigPanel.jsx    # Panel de configuración y reglas de checkpoints
│   │   ├── ControlPanel.jsx   # Botones de ejecución y apertura de Modal
│   │   ├── StatsPanel.jsx     # Estadísticas en tiempo real y UI visual
│   │   ├── AdvancedTable.jsx  # Tabla detallada de Eventos y FEL
│   │   ├── CheckpointsModal.jsx # Galería de "fotos" capturadas
│   │   ├── TimeInput.jsx      # Input de hora HH:MM:SS
│   │   └── TimeField.jsx      # Campo de entrada con distribuciones
│   ├── utils/
│   │   └── generators.js      # Clases de generadores (Uniform, Exp, etc.)
│   ├── App.jsx               # Componente Contenedor Principal
│   ├── App.css               # Estilos globales y grid
│   └── main.jsx              # Entry point
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
└── DOCUMENTACION.md          # Este archivo
```

---

## 3. Flujo de la Simulación

### 3.1 Inicialización

1. Se crea una instancia del `Simulator` con:
   - **Config**: maxTime, startTime, arrivalInterval, serviceTime, etc.
   - **Flags**: hasPriority, hasClientAbandonment, hasServerBreaks
   - **InitialState**: clientes iniciales en cola, estado inicial del servidor

2. Se inicializan los arrays de tiempos de llegada y servicio usando `parseArrayInput()`

3. Se programa la primera llegada y (si aplica) el primer ciclo de trabajo

4. Se registra el estado inicial en el historial

### 3.2 Loop Principal (step)

```javascript
while (!simulator.isFinished()) {
  simulator.step();
}
```

Cada `step()` ejecuta:

1. **Obtener siguiente evento** → Selecciona de la FEL el evento con menor tiempo
2. **Avanzar reloj** → Actualiza `this.clock` al tiempo del evento
3. **Remover evento** → Elimina el evento procesado de la FEL
4. **Procesar evento** → Ejecuta la lógica correspondiente según el tipo
5. **Registrar en historial** → Guarda el estado actual para la tabla
6. **Evaluar Checkpoints** → Ejecuta `#evalCheckpoints()` para ver si se cumple alguna regla configurada y "sacar una foto" del estado actual.

### 3.3 Tipos de Eventos

| Evento | Descripción |
|--------|-------------|
| `LLEGADA` | Un nuevo cliente llega al sistema |
| `LLEGADA_VIP` | Un cliente VIP llega (si hasPriority=true) |
| `FIN_SERVICIO` | El servidor termina de atender un cliente |
| `SALIDA_SERVIDOR` | El servidor comienza su período de descanso |
| `LLEGADA_SERVIDOR` | El servidor termina su descanso y vuelve |
| `ABANDONO` | Un cliente abandona la cola por timeout |

### 3.4 Finalización

La simulación termina cuando:
- No hay más eventos en la FEL, O
- El próximo evento supera el tiempo máximo (startTime + maxTime)

---

## 4. Componente Simulator.js - Explicación Detallada

### 4.1 Constantes Exportadas

```javascript
export const ServerState = {
  IDLE: 'LIBRE',    // Servidor sin atender
  BUSY: 'OCUPADO',  // Servidor atendiendo
  BREAK: 'AUSENTE' // Servidor en descanso
};

export const SystemTopology = {
  ISOLATED: 'AISLADOS',       // Sistemas independientes en paralelo
  SINGLE_QUEUE: 'COLA_UNICA', // Cola única, múltiples servidores
  CHAINED: 'ENCADENADOS'      // Puestos sucesivos (Secuencial)
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
  ENTER_SZ: 'ENTER_SZ',      // Zona de Seguridad: cliente entra a la zona
  ARRIVAL_PS: 'LLEGADA_PS'   // Zona de Seguridad: cliente llega al punto de servicio
};
```

### 4.2 Generadores de Tiempos (generators.js)

El simulador reemplazó las funciones antiguas por clases especializadas (Generadores) que calculan los tiempos (ΔtLL, ΔtS). 

#### parseInputValue(value, distType)
El motor de inicialización parsea el input visual del usuario ("45", "30-50", "10,20") y crea la clase adecuada:

- **ConstantGenerator**: Devuelve siempre el mismo valor (legado, ahora en desuso en la UI principal).
- **UniformGenerator**: Genera un número aleatorio con distribución uniforme usando `min + Math.random() * (max - min)`.
- **ExponentialGenerator**: Genera un número aleatorio con distribución exponencial usando `-mean * Math.log(Math.random())`.

#### createClient(arrivalTime, config, flags, isVip)
Crea un objeto cliente:

```javascript
{
  id: 1,
  arrivalTime: 100,
  patienceTime: 60,      // maxWaitTime del config
  priority: 'A' o 'B'   // según sea VIP o no
}
```

Si `flags.hasPriority = true`, el cliente tiene 30% de probabilidad de ser VIP.

#### createEvent(time, type, data)
Crea un evento para la FEL:

```javascript
{
  id: 1,
  time: 100,
  type: 'LLEGADA',
  data: {},
  priority: 4  // Menor = más prioritario
}
```

Prioridades de eventos:
- SERVICE_END: 1
- SERVER_BREAK_END: 2
- ARRIVAL_VIP: 3
- ARRIVAL: 4
- SERVER_BREAK_START: 5
- ABANDONMENT: 5

### 4.3 Clase Simulator - Constructor

```javascript
constructor(config, flags, initialState = {})
```

**Configuración (config):**
- `maxTime`: Duración total de simulación en segundos
- `startTime`: Hora de inicio en formato absoluto (ej: 28800 = 08:00:00)
- `topology`: Topología del sistema (SINGLE_QUEUE, ISOLATED, CHAINED)
- `numServers`: Cantidad de servidores instanciados
- `arrivalInterval`: Rango de intervalo entre llegadas (ej: "30-60")
- `serviceTime`: Rango de tiempo de servicio por cliente (ej: "20-40")
- `workTime`: Duración del período de trabajo (para ciclos)
- `restTime`: Duración del período de descanso
- `maxWaitTime`: Tiempo máximo de espera antes de abandono (puede ser Infinity)
- `travelTime`: Tiempo de cruce de la Zona de Seguridad

**Flags:**
- `hasPriority`: Habilitar clientes VIP (30% de probabilidad)
- `hasClientAbandonment`: Habilitar abandonos por timeout
- `hasServerBreaks`: Habilitar ciclos de trabajo/descanso
- `hasSecurityZone`: Habilitar modelo de Zona de Seguridad (SZ + PS)

**InitialState:**
- `clientsInQueue`: Clientes iniciales en cola común
- `vipClientsInQueue`: Clientes iniciales en cola VIP
- `serverBusy`: Si el servidor inicia atendiendo
- `busyUntil`: Tiempo hasta que termina el servicio inicial

### 4.4 Métodos Privados Principales

| Método | Función |
|--------|---------|
| `#initialize()` | Configura estado inicial, cola, eventos programados |
| `#scheduleFirstArrivals()` | Programa las primeras llegadas |
| `#scheduleWorkCycle()` | Programa el ciclo de trabajo/descanso |
| `#scheduleNextWorkPeriod()` | Programa el fin del descanso |
| `#getNextEvent()` | Devuelve el evento con menor tiempo de la FEL |
| `#removeEvent()` | Elimina un evento de la FEL |
| `#advanceClock()` | Avanza el reloj |
| `#handleAbandonment()` | Procesa abandono de cliente específico |
| `#handleArrival()` | Procesa llegada de cliente (normal o VIP) |
| `#scheduleNextArrival()` | Programa la siguiente llegada |
| `#handleServiceEnd()` | Procesa fin de servicio |
| `#selectNextClient()` | Selecciona siguiente cliente (VIP primero si aplica) |
| `#handleServerBreakStart()` | Inicia período de descanso (elimina evento SERVICE_END fantasma) |
| `#handleServerBreakEnd()` | Finaliza descanso ( restaura cliente si había servicio pausado) |
| `#handleEnterSZ()` | Zona de Seguridad: cliente entra a la zona |
| `#handleArrivalPS()` | Zona de Seguridad: cliente llega al punto de servicio |
| `#getTotalQueue()` | Devuelve tamaño total de cola |
| `#recordHistory()` | Registra estado actual en historial |

### 4.5 Métodos Públicos

| Método | Retorna |
|--------|---------|
| `step()` | `true` si procesó un evento, `false` si terminó |
| `run()` | Ejecuta toda la simulación y retorna resultados |
| `getResults()` | `{ history: [], stats: {...} }` |
| `getCurrentState()` | Estado actual (reloj, cola, servidor, FEL, etc.) |
| `getNextEventTime()` | Tiempo del próximo evento o null |
| `isFinished()` | `true` si no hay más eventos o superó maxTime |

### 4.6 Estadísticas (stats)

```javascript
{
  clientsServed: 0,           // Clientes atendidos
  clientsAbandoned: 0,        // Clientes que abandonaron
  clientsInQueueAtStart: 0,   // Clientes iniciales en cola común
  vipClientsInQueueAtStart: 0, // Clientes iniciales en cola VIP
  workCycles: 0,             // Ciclos de trabajo completados
  restCycles: 0,             // Ciclos de descanso completados
  totalTime: 0,               // Tiempo total simulado
  utilization: 0,             // Porcentaje de utilización
  avgServiceTime: 0           // Tiempo promedio de servicio
}
```

---

## 5. Sistema de Checkpoints (Auditoría e Instantáneas)

El sistema de checkpoints permite "congelar" y capturar una copia completa del estado del simulador (`clock`, `stats`, `queue`, `fel`) cuando se cumple una condición definida por el usuario. Es fundamental para resolver problemas teóricos que exigen saber el estado exacto en un tiempo "X".

### 5.1 Estructura Interna en el Motor (`Simulator.js`)

Se inyectan las reglas con `addCheckpoint`:

```javascript
addCheckpoint(name, conditionFn, recurring = false) {
  this.checkpointsConfig.push({ name, conditionFn, recurring, triggered: false });
}
```

- **`conditionFn`**: Una función callback que recibe el `estadoActual` y devuelve un booleano `true` si la foto debe tomarse.
- **`recurring`**: Si es `true`, el checkpoint puede dispararse múltiples veces (por ejemplo, "En cada descanso"). Si es `false`, se toma la foto solo una vez (por ejemplo, "Al llegar al minuto 60").

### 5.2 Evaluación Cíclica
Al finalizar cada `step()`, el motor ejecuta `#evalCheckpoints()` que itera sobre `this.checkpointsConfig`. Si la regla no fue ejecutada (o es recurrente) y la condición es verdadera:

1. Realiza una copia profunda (`JSON.parse(JSON.stringify())`) de los arrays críticos para evitar mutaciones futuras.
2. Almacena el resultado en `this.checkpoints` (el carrete de fotos).

### 5.3 Integración Visual (Reglas y Galería Modal)
En la UI, el componente `<ConfigPanel>` permite al usuario definir las reglas. Al presionar "Inicializar", `App.jsx` inyecta estas reglas al motor:

```javascript
// Ejemplo: Foto cada X minutos
const totalTriggers = Math.floor(maxTime / interval);
for(let i=1; i<=totalTriggers; i++) {
  sim.addCheckpoint(`Foto (#${i})`, s => s.clock >= s.config.startTime + (i * interval));
}
```

El componente `<CheckpointsModal>` visualiza este arreglo como tarjetas estilo galería, donde el usuario puede ver los abandonos, clientes en cola, e incluso el último evento responsable de la captura.

---

## 5. Sistema de Generación de Valores

El sistema utiliza funciones auxiliares para generar valores de tiempo mediante Clases especializadas (detalladas en el punto 4.2). En la Interfaz de Usuario el comportamiento se estandarizó para utilizar rangos:

- **"30 - 60"**: Se procesa como rango Uniforme o Exponencial dependiendo del Checkbox seleccionado bajo el input.

---

## 6. Configuración del Usuario (App.jsx)

### 6.1 Sección Tiempo

| Campo | Descripción |
|-------|--------------|
| Duración (segundos) | `maxTime` - Tiempo total de simulación |
| Hora inicio (HH:MM:SS) | `startTime` - Hora absoluta de inicio |

### 6.2 Sección ΔtLL (Llegada)

| Campo | Descripción |
|-------|--------------|
| Intervalo llegada | `arrivalInterval` - Tiempo entre llegadas |

Formato: Rango estandarizado (Uniforme o Exponencial, ej: "30 - 60").

### 6.3 Sección ΔtS (Servicio)

| Campo | Descripción |
|-------|--------------|
| Tiempo servicio | `serviceTime` - Duración del servicio |

Formato: igual que llegada

### 6.4 Sección Estado Inicial

| Campo | Descripción |
|-------|--------------|
| Clientes en cola | `clientsInQueue` - Clientes iniciales en cola común |
| Clientes VIP en cola | `vipClientsInQueue` - Clientes VIP iniciales |
| Servidor ocupado | `serverBusy` - Si el servidor inicia atendiendo |
| Ocupado hasta | `busyUntil` - Tiempo hasta que termina el servicio inicial |

### 6.5 Sección Ciclo Trabajo-Descanso

| Campo | Descripción |
|-------|--------------|
| Activar | `hasServerBreaks` - Habilitar ciclos |
| ΔT - Tiempo Trabajo | `workTime` - Duración de cada período de trabajo |
| ΔD - Tiempo Descanso | `restTime` - Duración de cada período de descanso |

### 6.6 Sección Reglas Extra

| Campo | Descripción |
|-------|--------------|
| Abandonos | `hasClientAbandonment` - Habilitar abandonos |
| ΔSC (seg) | `maxWaitTime` - Tiempo máximo de espera |
| Clientes VIP | `hasPriority` - Habilitar clientes VIP (30%) |

---

## 7. Lógica de Abandono (Reneging)

### Cómo funciona
En cada avance del reloj (`#advanceClock`), si `hasClientAbandonment` está habilitado, se llama a `#checkAbandonments(currentTime)`:

```javascript
#checkAbandonments(currentTime) {
  // Para cada cola (VIP y común):
  // 1. Calcular tiempo de espera = currentTime - client.arrivalTime
  // 2. Si tiempo > patienceTime (maxWaitTime), marcar para eliminar
  // 3. Eliminar clientes marcados y registrar abandono
}
```

**Nota:** Este método verifica toda la cola en cada paso.

---

## 8. Lógica de Prioridades

### Estructura de Colas
El sistema mantiene dos colas independientes:
- `this.queue` - Clientes normales (prioridad A)
- `this.vipQueue` - Clientes VIP (prioridad B)

### Generación de Clientes
```javascript
// En createClient():
const vip = isVip || (flags.hasPriority && Math.random() < 0.3);
// 30% de probabilidad de ser VIP si hasPriority está habilitado
```

### Selección de Cliente
En `#selectNextClient()`:
```javascript
if (this.vipQueue.length > 0) {
  return this.vipQueue.shift(); // VIP primero
} else if (this.queue.length > 0) {
  return this.queue.shift();    // Luego normales
}
```

Esto es O(1).

---

## 9. FEL (Future Event List)

La FEL es un array de eventos ordenado por tiempo y prioridad.

```javascript
// Estructura de un evento
{
  id: 1,
  time: 100,
  type: 'LLEGADA',
  data: {},
  priority: 4
}
```

### Obtención del siguiente evento
```javascript
// En #getNextEvent():
this.fel.reduce((min, e) =>
  e.time < min.time || (e.time === min.time && e.priority < min.priority) ? e : min
);
```

Selecciona el evento con menor tiempo. Si hay varios con el mismo tiempo, usa la prioridad (menor = más importante).

---

## 10. Historial de Simulación

Cada paso se registra en `this.history` con:

```javascript
{
  step: 1,
  time: 0,
  eventType: 'INICIO',
  serverState: 'LIBRE',
  serverPresent: true,
  queueLength: 0,
  vipQueueLength: 0,
  commonQueueLength: 0,
  queueIds: '',
  clientInService: null,
  fel: [{ time: 10, type: 'LLEGADA' }, ...],
  queueClients: [{ id, arrivalTime, patienceTime, priority }, ...],
  nextBreakTime: null,
  nextWorkTime: null,
  action: 'Estado inicial'
}
```

---

## 11. Integración con React (App.jsx)

### Flujo de la Arquitectura UI (Componentes)
La interfaz principal (`App.jsx`) es un contenedor orquestador que maneja el estado global del sistema y lo pasa hacia abajo a componentes modulares:

1. **`<ConfigPanel>`**: Contiene los inputs de parámetros y reglas lógicas (incluyendo configuración de Checkpoints).
2. **`<ControlPanel>`**: Botonera (Play, Pausa, Inicializar) y barra de progreso temporal.
3. **`<StatsPanel>`**: Visualizador de cajas de datos (Tiempo, Servidor, Atendidos, Cola Visual Dinámica).
4. **`<AdvancedTable>`**: La tabla gigante tabular de log a nivel FEL.
5. **`<CheckpointsModal>`**: Ventana modal flotante con efecto *backdrop-blur* que permite auditar las "fotos" tomadas por el Checkpoint Engine sin tapar la página entera.

### Estado React (App.jsx)
```javascript
const [config, setConfig] = useState({...});
const [flags, setFlags] = useState({...});
const [initialState, setInitialState] = useState({...});
const [checkpointRules, setCheckpointRules] = useState([]); // Reglas definidas por usuario
const [currentState, setCurrentState] = useState(null); // Snapshot extraído de Simulator.getCurrentState()
```

---

## 12. Comandos del Proyecto

| Comando | Descripción |
|---------|--------------|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | Verificar código con ESLint |

---

## 13. Glosario

- **DES**: Simulación de Eventos Discretos
- **FEL**: Future Event List (Lista de Eventos Futuros)
- **VIP**: Cliente con prioridad alta
- **Reneging**: Abandono por timeout
- **Cola M/M/1**: Markoviana llegada, Markoviana servicio, 1 servidor
- **parseArrayInput**: Función que convierte input del usuario a formato interno de rango
- **getNextValue**: Función que genera el siguiente valor de tiempo

---

## 14. Componentes de UI

### 14.1 TimeInput

Componente para ingresar hora en formato HH:MM:SS.

```javascript
import TimeInput from './components/TimeInput';

// Uso:
<TimeInput 
  value={28800}  // valor en segundos
  onChange={(nuevoValor) => console.log(nuevoValor)} 
/>
```

**Características:**
- Tres campos numéricos separados (HH, MM, SS)
- Validación: HH 0-23, MM/SS 0-59
- Navegación con flechas del teclado

### 14.2 TimeField

Componente para ingresar valores de tiempo con soporte para múltiples modos.

```javascript
import TimeField from './components/TimeField';

// Uso:
<TimeField 
  value="30 - 60"
  onChange={(valor) => console.log(valor)}
  placeholder="45"
/>
```

**Modos de entrada:**
- **Rango Uniforme**: `30 - 60` → valor aleatorio entre 30 y 60
- **Rango Exponencial**: `30 - 60` con selector "Exponencial" → distribución exponencial con media 45

**Indicadores visuales:**
- Naranja: Rango Uniforme
- Violeta: Rango Exponencial
- Rojo: Error de formato

### 14.3 timeParser (utils)

Utilidades para parsing y generación de valores aleatorios.

```javascript
import { parseTimeInput, createValueGenerator, getModeLabel } from './utils/timeParser';

// parseTimeInput: detecta el modo del input
const parsed = parseTimeInput("30 - 60");
// { mode: 'range', min: 30, max: 60 }

// createValueGenerator: crea función generadora
const generator = createValueGenerator(parsed, 'uniform');
generator(); // returns random between 30-60

// getModeLabel: obtiene label para mostrar en UI
const label = getModeLabel(parsed);
// { text: 'Rango: 30 - 60', type: 'range' }
```

---

## 15. Changelog - Actualizaciones Recientes

### v3.0 - Topologías, Múltiples Servidores y Pruebas Unitarias

**Fecha:** Mayo 2026

#### Nuevas Funcionalidades:
1. **Soporte Multi-Servidor y Topologías** (`SystemTopology`)
   - **Cola Única:** Múltiples servidores atendiendo una sola cola global.
   - **Aislados:** Los clientes llegan a sistemas independientes.
   - **Encadenados:** Los servidores actúan como etapas sucesivas.
2. **Tabla de Simulación Avanzada (UI)**
   - Diseño expandible dinámico (se ensancha a 100vw si hay más de 9 columnas).
   - Desglose adaptativo de servidores: La columna "Estado P.S." y "Fin Servicio" se dividen en sub-columnas `S1`, `S2`, etc. automáticamente.
   - Colores semánticos para el estado de los servidores (Verde, Gris, Ámbar).
   - Columna "Acción" controlada por un botón Toggle (👁) para no saturar la vista principal.
3. **Pruebas Unitarias**
   - Integración de `Vitest` con la suite `Simulator.test.js` para validar la integridad del motor frente a refactorizaciones.

### v2.0 - Integración de Generadores y Zona de Seguridad

**Fecha:** Abril 2026

#### Nuevas Funcionalidades:

1. **Sistema de Generadores** (`src/utils/generators.js`)
   - `ConstantGenerator`: valor constante
   - `ListGenerator`: recorre lista de valores, repite el último
   - `ExponentialGenerator`: distribución exponencial

2. **Abandono con Eventos Específicos**
   - Cada cliente en cola tiene su propio evento `ABANDONMENT` programado
   - Ya no se verifica abandonos iterando toda la cola

3. **Zona de Seguridad** (Problema 5 del TP)
   - Eventos `ENTER_SZ` y `ARRIVAL_PS`
   - El cliente cruza la SZ y luego llega al punto de servicio

#### Correcciones de Bugs:

1. **Evento fantasma en ciclos de descanso**
   - Al iniciar descanso mientras el servidor está BUSY, ahora se elimina el evento `SERVICE_END` de la FEL
   - Al regresar, se restaura el cliente y el tiempo restante

2. **Concatenación de strings**
   - Los valores de config ahora se convierten a número para evitar concatenación `"45" + 28800 = "4528800"`

#### Estructura del Constructor:

```javascript
constructor(config, flags, initialState = {}, generators = {})
```

- `generators`: objeto opcional con instancias de generadores personalizadas
- Si no se pasan, se crean automáticamente según el tipo de valor en `config`