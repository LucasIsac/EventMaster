# Plan de Implementación: Mejoras en EventMaster

## Contexto

Este documento contiene instrucciones para mejorar el proyecto **EventMaster** incorporando
lógica del proyecto **Seriat**. El análisis comparativo ya fue realizado — este plan usa
información real de ambos códigos.

## Ruta del Proyecto

`C:\Users\Isaac\OneDrive\Documentos\5to Año\Modelo y Simulacion\eventmaster-web`

---

## Resumen de cambios

| Etapa | Qué | Archivos | Prioridad |
|-------|-----|----------|-----------|
| 1 | Crear sistema de generadores | `src/utils/generators.js` (NUEVO) | Alta |
| 2 | Integrar generadores al motor | `src/engine/Simulator.js` | Alta |
| 3 | Corregir abandono con eventos específicos | `src/engine/Simulator.js` | Alta |
| 4 | Reemplazar sort por colas múltiples para prioridades | `src/engine/Simulator.js` | Media |
| 5 | Implementar Problema 5 (Zona de Seguridad) | `src/engine/Simulator.js` | Alta |
| 6 | Actualizar exports | `src/index.js` | Baja |

**No incluir**: reemplazo de FEL por heap binario (no necesario para este TP).

---

## Estructura actual del proyecto

```
eventmaster-web/
├── src/
│   ├── engine/
│   │   └── Simulator.js      # ← Motor actual (NO en src/core/)
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── public/
├── index.html
├── package.json
└── vite.config.js
```

**Nota:** Los tipos (ServerState, ClientPriority, EventType) están definidos en línea al inicio de `Simulator.js` (líneas 1-19), no en un archivo `types.js` separado.

---

## Etapa 1 — Crear `src/utils/generators.js` (archivo nuevo)

### Qué hacer
Crear el archivo `src/utils/generators.js` con el siguiente contenido exacto:

```javascript
// src/utils/generators.js
// Equivalente a seriat/utils/generators.py

export class Generator {
  next() { throw new Error("Abstract method"); }
  getDesc() { return ""; }
}

/**
 * Genera siempre el mismo valor constante.
 * Equivalente a ConstantGenerator de Seriat.
 * Uso: new ConstantGenerator(45) → siempre devuelve 45
 */
export class ConstantGenerator extends Generator {
  constructor(value = 0) {
    super();
    this.value = value;
  }
  next() { return this.value; }
  getDesc() { return `(constante: ${this.value})`; }
}

/**
 * Recorre una lista de valores. Al terminar, repite el último.
 * Equivalente a ListGenerator de Seriat (repeat_last: true).
 * Uso: new ListGenerator([30, 45, 60]) → 30, 45, 60, 60, 60, ...
 * Esto permite reproducir exactamente las tablas manuales del TP.
 */
export class ListGenerator extends Generator {
  constructor(values = []) {
    super();
    this.values = values;
    this.index = 0;
  }
  next() {
    if (this.index < this.values.length) {
      return this.values[this.index++];
    }
    return this.values.length > 0 ? this.values[this.values.length - 1] : 0;
  }
  reset() { this.index = 0; }
  getDesc() { return `(lista: [${this.values.join(', ')}])`; }
}

/**
 * Genera valores con distribución exponencial. Para simulaciones M/M/1 reales.
 * Uso: new ExponentialGenerator(45) → valores aleatorios con media 45
 */
export class ExponentialGenerator extends Generator {
  constructor(mean = 1) {
    super();
    this.mean = mean;
  }
  next() {
    return -this.mean * Math.log(1 - Math.random());
  }
  getDesc() { return `(exponencial, media: ${this.mean})`; }
}

/**
 * Factory para crear generadores desde un string de tipo.
 * type: 'constant' | 'list' | 'exponential'
 * value: número para constant/exponential, array para list
 */
export function createGenerator(type, value) {
  switch (type) {
    case 'constant':    return new ConstantGenerator(value);
    case 'list':        return new ListGenerator(Array.isArray(value) ? value : [value]);
    case 'exponential': return new ExponentialGenerator(value);
    default:            return new ConstantGenerator(value);
  }
}
```

### Validación de la etapa
En Node.js o en la consola del browser:
```javascript
import { ListGenerator, ConstantGenerator } from './src/utils/generators.js';
const g = new ListGenerator([10, 20, 30]);
console.log(g.next(), g.next(), g.next(), g.next()); // → 10 20 30 30
const c = new ConstantGenerator(45);
console.log(c.next(), c.next()); // → 45 45
```

---

## Etapa 2 — Integrar generadores en `src/engine/Simulator.js`

### Contexto actual
El `Simulator` usa directamente `this.config.arrivalInterval` y `this.config.serviceTime`
como valores fijos en varios lugares. Hay que reemplazar esos accesos por llamadas a
generadores, manteniendo compatibilidad con el código existente (si no se pasan
generadores, se crean automáticamente desde el config).

### A) Agregar import al principio del archivo

```javascript
// Agregar al inicio del archivo, junto con los otros imports:
import { ConstantGenerator } from '../utils/generators.js';
```

### B) Modificar el constructor (línea ~96)

Agregar el parámetro `generators` y crear generadores por defecto si no se pasan:

```javascript
// Antes:
constructor(config, flags, initialState = {}) {
  this.config = { ...config };
  this.flags = { ...flags };
  // ...

// Después:
constructor(config, flags, initialState = {}, generators = {}) {
  this.config = { ...config };
  this.flags = { ...flags };

  // Si no se pasan generadores, crear constantes desde config (backwards compatible)
  this.generators = {
    arrival:       generators.arrival       || new ConstantGenerator(this.config.arrivalInterval),
    service:       generators.service       || new ConstantGenerator(this.config.serviceTime),
    breakDuration: generators.breakDuration || new ConstantGenerator(this.config.breakDuration || this.config.restTime),
    travel:        generators.travel        || new ConstantGenerator(this.config.travelTime || 0),
  };

  this.initialState = initialState;
  // ... resto del constructor sin cambios
}
```

### C) Reemplazar usos de config en `#handleArrival()` (buscar donde usa arrivalInterval)

```javascript
// Antes:
const nextArrivalTime = this.clock + getNextValue(this.arrivalTimes, this.indexArrival);

// Después:
const nextArrivalTime = this.clock + this.generators.arrival.next();
```

### D) Reemplazar usos de config donde se programa el servicio

```javascript
// Antes:
const serviceEndTime = this.clock + getNextValue(this.serviceTimes, this.indexService);

// Después:
const serviceEndTime = this.clock + this.generators.service.next();
```

### E) Reemplazar en `#handleServerBreakEnd()` (donde usa restTime)

```javascript
// Antes:
const breakEnd = this.clock + this.restTime;

// Después:
const breakEnd = this.clock + this.generators.breakDuration.next();
```

### F) Actualizar `createSimulator` factory para aceptar generators

```javascript
// Buscar la función createSimulator y agregar el parámetro:
export function createSimulator(config, flags, initialState, generators = {}) {
  return new Simulator(config, flags, initialState, generators);
}
```

### Validación de la etapa
Ejecutar los escenarios existentes — deben producir exactamente los mismos
resultados que antes (porque los generadores por defecto son constantes con los mismos
valores que estaban en config).

---

## Etapa 3 — Corregir abandono con eventos específicos en `src/engine/Simulator.js`

### Problema actual
`#checkAbandonments()` itera sobre todos los clientes en cola en cada paso del reloj.
Esto puede hacer que un cliente que ya fue atendido "abandone" si no se limpió
correctamente. Seriat resuelve esto programando un evento de abandono único por cliente
con su `clientId` como identificador.

### A) Modificar `#handleArrival()` — donde se encola el cliente

Cuando un cliente entra a la cola y el abandono está activo, programar un evento
`ABANDONMENT` específico para ese cliente:

```javascript
// Dentro de la rama donde el cliente va a la cola (server ocupado):
this.queue.push(client);

// NUEVO: programar evento de abandono específico para este cliente
if (this.flags.hasClientAbandonment && client.patienceTime < Infinity) {
  const abandonEvent = createEvent(
    this.clock + client.patienceTime,
    EventType.ABANDONMENT,
    { clientId: client.id }
  );
  this.fel.push(abandonEvent);
}
```

### B) Reemplazar el handler de ABANDONMENT en `step()`

El caso existente debe reemplazarse por uno que verifique si el cliente aún está en cola:

```javascript
case EventType.ABANDONMENT:
  this.#handleAbandonment(event);
  break;
```

### C) Agregar el método privado `#handleAbandonment(event)`

Agregar después de `#handleServerBreakEnd()`:

```javascript
/**
 * Procesa abandono de un cliente específico.
 * Solo abandona si el cliente todavía está en cola (puede haber sido atendido antes).
 */
#handleAbandonment(event) {
  const { clientId } = event.data;
  const clientIndex = this.queue.findIndex(c => c.id === clientId);

  if (clientIndex === -1) {
    // Cliente ya fue atendido → ignorar el evento de abandono
    return;
  }

  // Cliente aún en cola → procesar abandono
  this.queue.splice(clientIndex, 1);
  this.stats.clientsAbandoned++;
}
```

### D) Eliminar `#checkAbandonments()` y su llamada en `#advanceClock()`

Eliminar el método `#checkAbandonments()` completo y la línea que lo llama.

### Validación de la etapa
Correr el Escenario con abandono. El número total de abandonos y el momento
exacto de cada uno debe coincidir con la tabla manual del TP.

---

## Etapa 4 — Reemplazar sort por colas múltiples para prioridades en `src/engine/Simulator.js`

### Problema actual
En `#handleArrival()`, cuando hay prioridades activas se hace un `sort()`
sobre toda la cola en cada llegada. El proyecto ya tiene `queue` y `vipQueue` separados,
así que esta etapa es de optimización y unificación.

### A) El constructor ya tiene colas separadas (verificar)

```javascript
// En el constructor actual ya existen:
this.queue = [];      // cola normal
this.vipQueue = [];   // cola VIP
```

### B) Modificar `#handleArrival()` — encolado

```javascript
// Cambiar la lógica de encolado:
if (this.flags.hasPriority) {
  this.vipQueue.push(client);  // usar vipQueue directamente
} else {
  this.queue.push(client);
}
```

### C) Modificar `#handleServiceEnd()` — dequeue

```javascript
// Antes: tomar el primero de this.queue

// Después: tomar de VIP primero, luego normal
let nextClient = null;
if (this.flags.hasPriority) {
  if (this.vipQueue.length > 0) {
    nextClient = this.vipQueue.shift();
  } else if (this.queue.length > 0) {
    nextClient = this.queue.shift();
  }
} else {
  nextClient = this.queue.length > 0 ? this.queue.shift() : null;
}
```

### D) Actualizar cualquier lugar que lea longitud de cola

Actualizar donde se registre la longitud de cola para el historial o stats:

```javascript
// Para obtener largo total de cola (cualquier modo)
get queueLength() {
  if (this.flags.hasPriority) {
    return this.vipQueue.length + this.queue.length;
  }
  return this.queue.length;
}
```

### E) Actualizar `#handleAbandonment()` para buscar en ambas colas

```javascript
#handleAbandonment(event) {
  const { clientId } = event.data;

  if (this.flags.hasPriority) {
    // Buscar en vipQueue primero, luego en queue
    let idx = this.vipQueue.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      this.vipQueue.splice(idx, 1);
      this.stats.clientsAbandoned++;
      return;
    }
    idx = this.queue.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      this.stats.clientsAbandoned++;
    }
  } else {
    const clientIndex = this.queue.findIndex(c => c.id === clientId);
    if (clientIndex === -1) return;
    this.queue.splice(clientIndex, 1);
    this.stats.clientsAbandoned++;
  }
}
```

### Validación de la etapa
Correr el Escenario con prioridad + abandono. Los clientes VIP deben aparecer siempre
atendidos antes que los NORMAL cuando ambos están en cola al mismo tiempo.

---

## Etapa 5 — Implementar Problema 5: Zona de Seguridad

### Descripción del problema real
Sistema con dos recursos secuenciales:
- **SZ (Zona de Seguridad)**: el cliente la cruza en `travelTime` segundos
- **PS (Punto de Servicio)**: el cliente recibe servicio en `serviceTime` segundos

Flujo: `LLEGADA → [espera en cola] → ENTER_SZ → (travel) → ARRIVAL_PS → (service) → END_SERVICE`

La SZ solo puede tener un cliente a la vez. Al terminar el servicio, ambos recursos (SZ y PS)
se liberan simultáneamente.

### A) Agregar en `src/engine/Simulator.js` los nuevos tipos de evento

En la sección de EventType (líneas 12-19), agregar:

```javascript
export const EventType = {
  ARRIVAL: 'LLEGADA',
  ARRIVAL_VIP: 'LLEGADA_VIP',
  SERVICE_END: 'FIN_SERVICIO',
  SERVER_BREAK_START: 'SALIDA_SERVIDOR',
  SERVER_BREAK_END: 'LLEGADA_SERVIDOR',
  ABANDONMENT: 'ABANDONO',
  // NUEVOS para Zona de Seguridad
  ENTER_SZ: 'ENTER_SZ',
  ARRIVAL_PS: 'LLEGADA_PS'
};
```

### B) Agregar estado de SZ en el constructor

Al final del constructor o en `#initialize()`, agregar:

```javascript
// Estado del Problema 5 — solo relevante cuando flags.hasSecurityZone = true
this.szBusy = false;  // true = hay un cliente cruzando la SZ en este momento
```

### C) Agregar `travelTime` al config

En el App.jsx, agregar el campo travelTime al config:

```javascript
const [config, setConfig] = useState({
  // ... campos existentes
  travelTime: 0,  // Tiempo de cruce de la Zona de Seguridad
});
```

### D) Modificar `#handleArrival()` para el modo Zona de Seguridad

Al principio del método, agregar un branch para el modo SZ:

```javascript
#handleArrival() {
  // Programar próxima llegada
  const nextArrivalTime = this.clock + this.generators.arrival.next();
  this.fel.push(createEvent(nextArrivalTime, EventType.ARRIVAL));

  if (this.flags.hasSecurityZone) {
    // MODO PROBLEMA 5: flujo SZ → PS
    const queueEmpty = this.queueLength === 0;
    if (queueEmpty && !this.szBusy && this.serverState === ServerState.IDLE) {
      // Todo libre → entrar a SZ de inmediato
      this.fel.push(createEvent(this.clock, EventType.ENTER_SZ));
    } else {
      // Algo ocupado → encolar
      const client = createClient(this.clock, this.config, this.flags);
      if (this.flags.hasPriority) {
        this.vipQueue.push(client);
      } else {
        this.queue.push(client);
      }
    }
  } else {
    // MODO NORMAL: lógica existente sin cambios
  }
}
```

### E) Agregar los dos nuevos casos en el switch de `step()`

```javascript
case EventType.ENTER_SZ:
  this.#handleEnterSZ();
  break;

case EventType.ARRIVAL_PS:
  this.#handleArrivalPS();
  break;
```

### F) Agregar los métodos privados `#handleEnterSZ()` y `#handleArrivalPS()`

```javascript
/**
 * Problema 5: Cliente entra a la Zona de Seguridad.
 */
#handleEnterSZ() {
  this.szBusy = true;
  const travelTime = this.generators.travel.next();
  this.fel.push(createEvent(this.clock + travelTime, EventType.ARRIVAL_PS));
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
  const serviceEndTime = this.clock + this.generators.service.next();
  this.fel.push(createEvent(serviceEndTime, EventType.SERVICE_END));
}
```

### G) Modificar `#handleServiceEnd()` para el modo SZ

```javascript
#handleServiceEnd(event) {
  if (this.flags.hasSecurityZone) {
    // En modo SZ, el servidor (PS) simplemente queda libre.
    this.serverState = ServerState.IDLE;
    this.stats.clientsServed++;
    return;
  }

  // Modo normal: lógica existente
}
```

### Validación de la etapa
Crear un escenario de prueba con los datos exactos del TP para el Problema 5 y verificar
que la secuencia de eventos sigue el orden correcto.

---

## Etapa 6 — Actualizar `src/index.js`

Crear el archivo `src/index.js` con los exports de los nuevos módulos:

```javascript
// src/index.js
export { Simulator, createSimulator } from './engine/Simulator.js';
export { ServerState, ClientPriority, EventType } from './engine/Simulator.js';

export {
  Generator,
  ConstantGenerator,
  ListGenerator,
  ExponentialGenerator,
  createGenerator
} from './utils/generators.js';
```

---

## Orden de implementación

```
Etapa 1 (generators.js nuevo)
  ↓
Etapa 2 (integrar en Simulator) → validar que funciona igual que antes
  ↓
Etapa 3 (corregir abandono)     → validar con datos del TP
  ↓
Etapa 4 (colas múltiples)        → validar prioridad + abandono
  ↓
Etapa 5 (Zona de Seguridad)      → validar con datos del TP
  ↓
Etapa 6 (exports)
```

---

## Archivos resumen

| Archivo | Acción |
|---------|--------|
| `src/utils/generators.js` | CREAR — sistema de generadores |
| `src/engine/Simulator.js` | MODIFICAR — generadores, abandono, colas múltiples, SZ |
| `src/index.js` | CREAR — exportar nuevos módulos |

---

## Archivos a NO tocar

- `src/App.jsx` — componente React (solo modificar si es necesario para nuevos flags)
- Todo archivo que no esté en `src/engine/` o `src/utils/`