# Catálogo de Problemas de Simulación y Mapeo a EventMaster (Completo)

Este catálogo detalla todos los tipos de problemas de simulación de eventos discretos (teoría de colas) soportados por **EventMaster** y cómo configurar sus parámetros en formato JSON.

---

## 1. Servidor Único y Cola Simple (M/M/1 estándar)
Es el modelo básico de línea de espera donde los clientes llegan y son atendidos por un único servidor en orden de llegada (FIFO).

*   `config.topology`: `"COLA_UNICA"`
*   `config.numServers`: `1`
*   `flags.hasServerBreaks`: `false`
*   `flags.hasClientAbandonment`: `false`
*   `flags.hasPriority`: `false`
*   `flags.hasSecurityZone`: `false`

---

## 2. Con Descansos del Servidor (Server Breaks)
El servidor alterna entre períodos de trabajo activo (`workTime`) y descanso (`restTime`).

*   `flags.hasServerBreaks`: `true`
*   `config.workTime`: Tiempo de trabajo en segundos (ej. `"7200"` para 2 horas).
*   `config.restTime`: Duración del descanso en segundos (ej. `"900"` para 15 minutos).

---

## 3. Con Abandono por Espera Excedida (Client Abandonment)
Los clientes se retiran si pasan más de un tiempo límite (`maxWaitTime`) esperando en la cola.

*   `flags.hasClientAbandonment`: `true`
*   `config.maxWaitTime`: Tolerancia del cliente en segundos (ej. `"600"` o `"300 - 900"`).

---

## 4. Con Cola de Prioridades (Priority Queue / Clientes VIP)
Existen clientes comunes y prioritarios (VIP). Los VIP van al frente de la cola sin interrumpir la atención en curso (no es apropiativo).

*   `flags.hasPriority`: `true`
*   `initialState.vipClientsInQueue`: Número de clientes VIP iniciales.

---

## 5. Con Zona de Seguridad / Tiempo de Viaje (Travel Time)
El servidor requiere un tiempo de tránsito o preparación (`travelTime`) antes de poder comenzar a atender un servicio.

*   `flags.hasSecurityZone`: `true`
*   `config.travelTime`: Tiempo de traslado en segundos (ej. `"660"` para 11 minutos).

---

## 6. Múltiples Servidores en Paralelo con Cola Única (Supermercado)
Múltiples servidores idénticos comparten una sola fila común. Cuando un servidor queda libre, atiende al cliente a la cabeza de la cola.

### Mapeo de Parámetros:
*   `config.topology`: `"COLA_UNICA"`
*   `config.numServers`: Número de servidores (ej. `3`).
*   `config.serviceTime`: Puede ser una sola distribución (ej. `"45 - 90"`) o una lista de tiempos para cada servidor separados por comas (ej. `"11, 12, 14"`).

### Ejemplo de Configuración:
```json
{
  "config": {
    "maxTime": 3600,
    "startTime": 28800,
    "arrivalInterval": "60",
    "serviceTime": "11, 12, 14",
    "workTime": "Infinity",
    "restTime": "0",
    "maxWaitTime": "Infinity",
    "travelTime": "0",
    "topology": "COLA_UNICA",
    "numServers": 3
  },
  "flags": {
    "hasServerBreaks": false,
    "hasClientAbandonment": false,
    "hasPriority": false,
    "hasSecurityZone": false,
    "disableArrivals": false
  },
  "initialState": {
    "clientsInQueue": 0,
    "vipClientsInQueue": 0,
    "initialWaitTime": 0,
    "serverBusy": false,
    "busyUntil": 0
  },
  "checkpointRules": [],
  "vocab": { "client": "Cliente", "arrive": "llega", "served": "Atendido", "abandon": "Abandona" }
}
```

---

## 7. Múltiples Servidores con Colas Aisladas (Independientes)
Cada servidor tiene su propia cola individual. Al llegar, los clientes eligen de manera inteligente la cola más corta.

### Mapeo de Parámetros:
*   `config.topology`: `"AISLADOS"`
*   `config.numServers`: Número de servidores (ej. `3`).
*   `config.arrivalInterval` y `config.serviceTime`: Listas separadas por comas correspondientes a cada canal (ej. `arrivalInterval: "45, 25, 15"` y `serviceTime: "40, 20, 10"`).

### Ejemplo de Configuración:
```json
{
  "config": {
    "maxTime": 3600,
    "startTime": 0,
    "arrivalInterval": "45, 25, 15",
    "serviceTime": "40, 20, 10",
    "workTime": "Infinity",
    "restTime": "0",
    "maxWaitTime": "Infinity",
    "travelTime": "0",
    "topology": "AISLADOS",
    "numServers": 3
  },
  "flags": {
    "hasServerBreaks": false,
    "hasClientAbandonment": false,
    "hasPriority": false,
    "hasSecurityZone": false,
    "disableArrivals": false
  },
  "initialState": {
    "clientsInQueue": 0,
    "vipClientsInQueue": 0,
    "initialWaitTime": 0,
    "serverBusy": false,
    "busyUntil": 0
  },
  "checkpointRules": [],
  "vocab": { "client": "Cliente", "arrive": "llega", "served": "Atendido", "abandon": "Abandona" }
}
```

---

## 8. Servidores en Serie / Etapas Sucesivas (Chained)
Los clientes deben transitar de forma sucesiva por varias etapas (ej: Etapa 1 -> Etapa 2 -> Etapa 3). Cada etapa tiene su propia cola y servidor.

### Mapeo de Parámetros:
*   `config.topology`: `"ENCADENADOS"`
*   `config.numServers`: Número de etapas/servidores (ej. `3`).
*   `config.serviceTime`: Lista de tiempos de atención correspondientes a cada etapa, separados por comas (ej. `"20, 11, 7"`).

---

## 9. Operario Único en Cadena (Problema del Carpintero)
Un escenario especial de etapas sucesivas donde hay múltiples bancos o estaciones de trabajo en serie (`topology: "ENCADENADOS"`) pero hay **un único trabajador** (`flags.singleWorkerChained: true`) que debe desplazarse entre ellos siguiendo alguna de las siguientes estrategias:

*   **Estrategia "Silla por silla" (`singleWorkerStrategy: "silla_por_silla"`):** El trabajador procesa una sola unidad a través de todas las etapas consecutivas antes de empezar una nueva unidad en la etapa 1.
*   **Estrategia "Por lotes" (`singleWorkerStrategy: "por_lotes"`):** El trabajador procesa todo el lote disponible en la etapa 1, luego se muda a la etapa 2 para procesar el lote completo, y así sucesivamente.

### Ejemplo de Configuración (Problema del Carpintero):
```json
{
  "config": {
    "maxTime": 21600,
    "startTime": 0,
    "arrivalInterval": "0",
    "serviceTime": "1800 - 2400, 600 - 1200, 300 - 1800",
    "workTime": "Infinity",
    "restTime": "0",
    "maxWaitTime": "Infinity",
    "travelTime": "0",
    "topology": "ENCADENADOS",
    "numServers": 3,
    "singleWorkerStrategy": "silla_por_silla"
  },
  "flags": {
    "hasServerBreaks": false,
    "hasClientAbandonment": false,
    "hasPriority": false,
    "hasSecurityZone": false,
    "disableArrivals": true,
    "singleWorkerChained": true
  },
  "initialState": {
    "clientsInQueue": 6,
    "vipClientsInQueue": 0,
    "initialWaitTime": 0,
    "serverBusy": false,
    "busyUntil": 0
  },
  "checkpointRules": [],
  "vocab": { "client": "Silla", "arrive": "cargada", "served": "Terminada", "abandon": "Rechazada" }
}
```

---

## 10. Sistemas Cerrados / Sin Nuevos Arribos (disableArrivals)
Para modelar lotes fijos de producción o sistemas donde la cantidad de clientes es fija desde el inicio del sistema y no ingresan más unidades.

*   `flags.disableArrivals`: `true`
*   `config.arrivalInterval`: `"0"`
*   `initialState.clientsInQueue`: Cantidad de elementos cargados al inicio (ej. `6` sillas).

---

## 11. Estados Iniciales Avanzados
EventMaster permite preconfigurar el estado de ocupación de los servidores individuales al iniciar el reloj.

### Servidores individuales ocupados (`serversInitialState`):
Arreglo de objetos con el estado inicial de cada servidor:
*   `busy`: `true` / `false`
*   `busyUntil`: Tiempo en segundos que le queda de trabajo al servidor desde el inicio.
*   `queueLength`: Longitud inicial de la cola asociada a ese servidor.

### Tiempos de arribos predefinidos (`firstArrivalTimes`):
Arreglo de números que determina los momentos exactos (en segundos desde el inicio) de las primeras llegadas programadas, reemplazando la generación aleatoria inicial.

### Ejemplo de Configuración Avanzada:
```json
{
  "initialState": {
    "clientsInQueue": 0,
    "vipClientsInQueue": 0,
    "initialWaitTime": 0,
    "serverBusy": false,
    "busyUntil": 0,
    "serversInitialState": [
      { "busy": true, "busyUntil": 180, "queueLength": 4 },
      { "busy": true, "busyUntil": 230, "queueLength": 2 }
    ],
    "firstArrivalTimes": [300, 255]
  }
}
```

---

## 12. Clasificadora de Aceitunas / Averías Catastróficas
Cuando un servidor sufre una rotura catastrófica en lugar de un descanso convencional, la cola de espera y el proceso actual se vacían de inmediato. Además, durante el tiempo que dura la reparación, cualquier nuevo arribo es descartado automáticamente.

*   `flags.catastrophicBreakdown`: `true`
*   `flags.hasServerBreaks`: `true` (las roturas ocurren en los tiempos definidos por `workTime` y `restTime`).

### Ejemplo de Configuración:
```json
{
  "config": {
    "maxTime": 28800,
    "startTime": 0,
    "arrivalInterval": "3 - 5",
    "serviceTime": "4 - 6",
    "workTime": "14400 - 21600",
    "restTime": "3600",
    "maxWaitTime": "Infinity",
    "travelTime": "0",
    "topology": "COLA_UNICA",
    "numServers": 1,
    "timeUnit": "min"
  },
  "flags": {
    "hasServerBreaks": true,
    "catastrophicBreakdown": true,
    "hasClientAbandonment": false,
    "hasPriority": false,
    "hasSecurityZone": false,
    "disableArrivals": false
  },
  "vocab": {
    "client": "Aceituna",
    "arrive": "Llega a tolva",
    "served": "Clasificada",
    "abandon": "Descarte"
  }
}
```

---

## 13. Aeropuerto con Pista Única y Prioridad de Aterrizaje
En problemas de control de tráfico aéreo, los aviones que aterrizan tienen prioridad (VIP) y no requieren tiempo de recorrido previo, mientras que los despegues (Normales) requieren un tiempo de carreteo previo constante (`travelTime`) que bloquea la pista de forma preventiva.

*   `flags.hasPriority`: `true` (los aterrizajes son VIP, los despegues son normales).
*   `flags.hasSecurityZone`: `true` (activa el tiempo de carreteo/recorrido previo para los despegues).
*   `flags.vipSkipsSecurityZone`: `true` (los aviones que aterrizan omiten el recorrido previo y entran directo a pista).

### Ejemplo de Configuración:
```json
{
  "config": {
    "maxTime": 3600,
    "startTime": 0,
    "arrivalInterval": "120 - 240",
    "serviceTime": "660 - 1260",
    "workTime": "0",
    "restTime": "0",
    "maxWaitTime": "Infinity",
    "travelTime": "660",
    "topology": "COLA_UNICA",
    "numServers": 1
  },
  "flags": {
    "hasServerBreaks": false,
    "hasClientAbandonment": false,
    "hasPriority": true,
    "hasSecurityZone": true,
    "vipSkipsSecurityZone": true,
    "disableArrivals": false
  },
  "vocab": {
    "client": "Avión",
    "arrive": "solicita pista",
    "served": "Usó la pista",
    "abandon": "Desviado"
  }
}
```
