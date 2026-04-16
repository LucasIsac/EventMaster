# EventMaster - Documentación Técnica Completa

## 1. Overview del Proyecto

EventMaster es un simulador visual académico de teoría de colas que implementa el método de **Simulación de Eventos Discretos (DES)** para modelar sistemas de atención al cliente tipo M/M/1.

El simulador permite:
- Modelar llegadas de clientes y tiempos de servicio
- Configurar prioridades (clientes VIP)
- Manejar abandonos cuando el tiempo de espera excede un límite
- Simular ciclos de trabajo/descanso del servidor
- Implementar el patrón de "Zona de Seguridad" (dos recursos secuenciales)

---

## 2. Estructura del Proyecto

```
eventmaster-web/
├── src/
│   ├── engine/
│   │   └── Simulator.js      # Motor de simulación DES
│   ├── utils/
│   │   └── generators.js     # Generadores de valores aleatorios
│   ├── App.jsx               # Componente React principal (UI)
│   ├── App.css               # Estilos
│   ├── main.jsx              # Entry point
│   └── index.js              # Exports públicos
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── plan_evolucion.md         # Historial de evoluciones
└── DOCUMENTACION.md          # Este archivo
```

---

## 3. Flujo de la Simulación

### 3.1 Inicialización

1. Se crea una instancia del `Simulator` con:
   - **Config**: maxTime, startTime, arrivalInterval, serviceTime, etc.
   - **Flags**: hasPriority, hasClientAbandonment, hasServerBreaks, hasSecurityZone
   - **InitialState**: clientes iniciales en cola, estado inicial del servidor

2. Se inicializan los generadores de valores (Constant, List, o Exponential)

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
5. **Registrar en historial** → Guarda el estado actual para resultados

### 3.3 Tipos de Eventos

| Evento | Descripción |
|--------|-------------|
| `LLEGADA` | Un nuevo cliente llega al sistema |
| `LLEGADA_VIP` | Un cliente VIP llega (si hasPriority=true) |
| `FIN_SERVICIO` | El servidor termina de atender un cliente |
| `SALIDA_SERVIDOR` | El servidor comienza su período de descanso |
| `LLEGADA_SERVIDOR` | El servidor termina su descanso y vuelve |
| `ABANDONO` | Un cliente abandona la cola por timeout |
| `ENTER_SZ` | Cliente entra a la Zona de Seguridad (hasSecurityZone) |
| `LLEGADA_PS` | Cliente llega al Punto de Servicio tras cruzar SZ |

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
  ABANDONO: 'ABANDONO',
  ENTER_SZ: 'ENTER_SZ',
  ARRIVAL_PS: 'LLEGADA_PS'
};
```

### 4.2 Clase Simulator - Constructor

```javascript
constructor(config, flags, initialState = {}, generators = {})
```

**Configuración (config):**
- `maxTime`: Duración total de simulación en segundos
- `startTime`: Hora de inicio en formato absoluto (ej: 28800 = 08:00:00)
- `arrivalInterval`: Intervalo entre llegadas (puede ser número, lista "10,20,30", o rango "10-20")
- `serviceTime`: Tiempo de servicio por cliente
- `workTime`: Duración del período de trabajo (para ciclos)
- `restTime`: Duración del período de descanso
- `maxWaitTime`: Tiempo máximo de espera antes de abandono
- `travelTime`: Tiempo de cruce de la Zona de Seguridad

**Flags:**
- `hasPriority`: Habilitar clientes VIP (30% de probabilidad)
- `hasClientAbandonment`: Habilitar abandonos por timeout
- `hasServerBreaks`: Habilitar ciclos de trabajo/descanso
- `hasSecurityZone`: Usar modelo de dos recursos (SZ + PS)

**Generators:**
- Si no se proveen, se crean automáticamente desde config usando `ConstantGenerator`
- Permite usar `ListGenerator` (listas reproducibles) o `ExponentialGenerator` (M/M/1)

### 4.3 Métodos Privados Principales

| Método | Función |
|--------|---------|
| `#initialize()` | Configura estado inicial, cola, eventos programaods |
| `#getNextEvent()` | Devuelve el evento con menor tiempo de la FEL |
| `#handleArrival()` | Procesa llegada de cliente (normal o VIP) |
| `#handleServiceEnd()` | Procesa fin de servicio |
| `#handleAbandonment()` | Procesa abandono de cliente específico |
| `#handleServerBreakStart()` | Inicia período de descanso del servidor |
| `#handleServerBreakEnd()` | Finaliza período de descanso |
| `#handleEnterSZ()` | Cliente entra a la Zona de Seguridad |
| `#handleArrivalPS()` | Cliente llega al Punto de Servicio |
| `#selectNextClient()` | Selecciona siguiente cliente (VIP primero si aplica) |
| `#getTotalQueue()` | Devuelve tamaño total de cola |
| `#recordHistory()` | Registra estado actual en historial |

### 4.4 Métodos Públicos

| Método | Retorna |
|--------|---------|
| `step()` | `true` si procesó un evento, `false` si terminó |
| `run()` | Ejecuta toda la simulación y retorna resultados |
| `getResults()` | `{ history: [], stats: {...} }` |
| `getCurrentState()` | Estado actual (reloj, cola, servidor, FEL, etc.) |
| `getNextEventTime()` | Tiempo del próximo evento o null |
| `isFinished()` | `true` si no hay más eventos o superó maxTime |

### 4.5 Estadísticas (stats)

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

## 5. Sistema de Generadores (generators.js)

### 5.1 Clase Base Generator

```javascript
class Generator {
  next() { /* retorna siguiente valor */ }
  getDesc() { /* retorna descripción */ }
}
```

### 5.2 Generadores Disponibles

**ConstantGenerator**: Siempre devuelve el mismo valor
```javascript
new ConstantGenerator(45) → 45, 45, 45, ...
```

**ListGenerator**: Recorre una lista, luego repite el último
```javascript
new ListGenerator([10, 20, 30]) → 10, 20, 30, 30, 30, ...
```

**ExponentialGenerator**: Distribución exponencial (para M/M/1 real)

```javascript
new ExponentialGenerator(45) → valores aleatorios con media 45
```

**Fórmula matemática (transformación inversa):**
```javascript
next() {
  return -this.mean * Math.log(1 - Math.random());
}
```

- `Math.random()` genera un valor U ∈ [0,1] con distribución uniforme
- `-mean * ln(1 - U)` transforma U a distribución exponencial con media = `mean`
- Esto permite simulaciones M/M/1 reales donde la variabilidad del tiempo de servicio no es constante

**Ejemplo de uso:**
```javascript
// Para una media de 45 segundos:
const serviceGenerator = new ExponentialGenerator(45);

// Valores típicos: 12.3, 67.8, 44.1, 23.9, 89.2, ...
```

### 5.3 Factory createGenerator

```javascript
createGenerator(type, value)
// type: 'constant' | 'list' | 'exponential'
// value: número (constant/exponential) o array (list)
```

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

Formato: número fijo ("45"), lista ("30,45,60"), o rango ("30-60")

### 6.3 Sección ΔtS (Servicio)

| Campo | Descripción |
|-------|--------------|
| Tiempo servicio | `serviceTime` - Duración del servicio |

Formato: igual que llegada

### 6.4 Sección Estado Inicial

| Campo | Descripción |
|-------|--------------|
| Clientes en cola | `clientsInQueue` - Clientes iniciales en cola común |
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
| Zona de Seguridad | `hasSecurityZone` - Usar modelo SZ→PS |
| ΔtSZ→PS (seg) | `travelTime` - Tiempo de cruce de SZ |

---

## 7. Lógica de Abandono (Reneging)

### Antes del Plan de Evolución
Se iteraba sobre toda la cola en cada paso del reloj, verificando si el tiempo de espera superaba la paciencia. Problema: podía eliminar clientes ya atendidos.

### Después del Plan de Evolución
1. Cuando un cliente entra a la cola y `hasClientAbandonment=true`, se programa un evento `ABANDONMENT` específico con su `clientId`
2. Cuando se procesa el evento, se busca al cliente por ID
3. Si ya no está en cola (ya fue atendido), se ignora el evento

```javascript
// En #handleArrival(), cuando el cliente va a la cola:
if (this.flags.hasClientAbandonment && client.patienceTime < Infinity) {
  this.fel.push(createEvent(
    this.clock + client.patienceTime,
    EventType.ABANDONMENT,
    { clientId: client.id }
  ));
}
```

---

## 8. Lógica de Prioridades

### Estructura de Colas
El sistema mantiene dos colas independientes:
- `this.queue` - Clientes normales
- `this.vipQueue` - Clientes VIP

### Selección de Cliente
En `#selectNextClient()`:
```javascript
if (this.vipQueue.length > 0) {
  return this.vipQueue.shift(); // VIP primero
} else if (this.queue.length > 0) {
  return this.queue.shift();    // Luego normales
}
```

Esto es O(1) en lugar de O(n) que sería con un sort.

---

## 9. Zona de Seguridad (Problema 5)

### Concepto
Sistema con dos recursos secuenciales:
- **SZ (Zona de Seguridad)**: Tiempo de viaje `travelTime`
- **PS (Punto de Servicio)**: Tiempo de servicio `serviceTime`

### Flujo de Eventos

```
LLEGADA → [cola si occupied] → ENTER_SZ → (travelTime) → LLEGADA_PS → FIN_SERVICIO
```

### Estados
- `szBusy`: true si hay un cliente cruzando la SZ
- `serverState`: representa el estado del PS

### Lógica en #handleArrival() (con SZ)
```javascript
if (queueEmpty && !szBusy && serverState === IDLE) {
  // Todo libre → entrar a SZ inmediatamente
  fel.push(createEvent(clock, EventType.ENTER_SZ));
} else {
  // Algo ocupado → encolar
}
```

### Lógica en #handleServiceEnd() (con SZ)
```javascript
// Al terminar servicio, liberar servidor y verificar siguiente cliente
serverState = IDLE;
nextClient = selector();
if (nextClient) {
  fel.push(createEvent(clock, EventType.ENTER_SZ)); // Mismo instante
}
```

---

## 10. FEL (Future Event List)

La FEL es un array de eventos ordenado por tiempo y prioridad.

```javascript
// Estructura de un evento
{
  id: 1,
  time: 100,
  type: 'LLEGADA',
  data: { clientId: 5 },
  priority: 4  // Menor = más prioritario en caso de igualdad
}
```

### Prioridades de Eventos (menor = primero)
```javascript
{
  SERVICE_END: 1,
  SERVER_BREAK_END: 2,
  ARRIVAL_VIP: 3,
  ARRIVAL: 4,
  SERVER_BREAK_START: 5,
  ABANDONMENT: 5
}
```

---

## 11. Historial de Simulación

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

## 12. Integración con React (App.jsx)

### Flujo de la UI
1. Usuario configura parámetros en los formularios
2. Click en "Inicializar" → crea nuevo `Simulator`
3. "Paso" → ejecuta un `step()`
4. "Ejecutar" → ejecuta steps en intervalo (controlado por `speed`)
5. "Reiniciar" → limpia todo

### Estado React (currentState)
```javascript
{
  clock: 0,
  serverState: 'LIBRE',
  serverPresent: true,
  queue: [...],
  vipQueue: [...],
  queueLength: 0,
  clientInService: {...},
  fel: [...],
  history: [...],
  stats: {...},
  nextBreakTime: null,
  nextWorkTime: null
}
```

---

## 13. Exports Públicos (index.js)

```javascript
export { Simulator } from './engine/Simulator.js';
export { ServerState, ClientPriority, EventType } from './engine/Simulator.js';
export { Generator, ConstantGenerator, ListGenerator, ExponentialGenerator, createGenerator } from './utils/generators.js';
```

---

## 14. Validación y Testing

### Tests Implementados
1. **Simulación básica**: Verifica que corra sin errores
2. **Prioridad**: Verifica que atienda clientes VIP primero
3. **Abandono**: Verifica que abandonos funcionen correctamente
4. **Zona de Seguridad**: Verifica que ENTER_SZ y LLEGADA_PS aparezcan
5. **Generadores**: Verifica que cada tipo funcione correctamente

### Para Ejecutar Tests
```bash
node --experimental-vm-modules test-simulator.js
```

---

## 15. Comandos del Proyecto

| Comando | Descripción |
|---------|--------------|
| `npm run dev` | Iniciar servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | Verificar código con ESLint |

---

## 16. Glosario

- **DES**: Simulación de Eventos Discretos
- **FEL**: Future Event List (Lista de Eventos Futuros)
- **SZ**: Zona de Seguridad
- **PS**: Punto de Servicio
- **VIP**: Cliente con prioridad alta
- **Reneging**: Abandono por timeout
- **Cola M/M/1**: Markoviana llegada, Markoviana servicio, 1 servidor