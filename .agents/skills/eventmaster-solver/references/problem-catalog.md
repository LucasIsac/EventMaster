# Catálogo de Problemas de Simulación y Mapeo a EventMaster

Este catálogo detalla los 5 tipos principales de problemas de simulación de eventos discretos (teoría de colas) según las guías académicas (UNLaR - Modelos y Simulación) y cómo configurar sus parámetros en el simulador EventMaster.

---

## 1. Servidor Único y Cola Simple (M/M/1 estándar)
Es el modelo básico de línea de espera donde los clientes llegan y son atendidos en orden de llegada (FIFO / FCFA) por un único servidor. No hay factores complejos adicionales.

### Mapeo de Parámetros:
*   `config.topology`: `"COLA_UNICA"`
*   `config.numServers`: `1`
*   `flags.hasServerBreaks`: `false` (y `config.workTime = "Infinity"`, `config.restTime = "0"`)
*   `flags.hasClientAbandonment`: `false` (y `config.maxWaitTime = "Infinity"`)
*   `flags.hasPriority`: `false`
*   `flags.hasSecurityZone`: `false` (y `config.travelTime = "0"`)

### Ejemplo de Configuración JSON:
```json
{
  "config": {
    "maxTime": 14400,
    "startTime": 28800,
    "arrivalInterval": "10 - 30",
    "serviceTime": "15",
    "workTime": "Infinity",
    "restTime": "0",
    "maxWaitTime": "Infinity",
    "travelTime": "0",
    "topology": "COLA_UNICA",
    "numServers": 1
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
  "vocab": {
    "client": "Cliente",
    "arrive": "Arriba",
    "served": "Atendido",
    "abandon": "Abandona"
  }
}
```

---

## 2. Con Descansos del Servidor (Server Breaks)
El servidor trabaja de forma continua durante un período de tiempo estipulado (tiempo de trabajo) y luego toma un descanso (tiempo de descanso) obligatorio. Los clientes que llegan durante el descanso esperan en la cola.

### Mapeo de Parámetros:
*   `flags.hasServerBreaks`: `true`
*   `config.workTime`: Tiempo en segundos antes del descanso (ej. `"7200"` para 2 horas).
*   `config.restTime`: Duración del descanso en segundos (ej. `"900"` para 15 minutos).
*   `checkpointRules`: Es útil agregar reglas como `"break"` o `"break_n"` para detenerse cuando inicie o termine un descanso en particular.

### Ejemplo de Configuración JSON:
```json
{
  "config": {
    "maxTime": 28800,
    "startTime": 28800,
    "arrivalInterval": "5 - 15",
    "serviceTime": "8",
    "workTime": "7200",
    "restTime": "900",
    "maxWaitTime": "Infinity",
    "travelTime": "0",
    "topology": "COLA_UNICA",
    "numServers": 1
  },
  "flags": {
    "hasServerBreaks": true,
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
  "checkpointRules": [
    {
      "id": "parada_descanso_1",
      "type": "break_n",
      "value": 1,
      "label": "Detener al iniciar el 1er descanso"
    }
  ],
  "vocab": {
    "client": "Paciente",
    "arrive": "Arriba",
    "served": "Atendido",
    "abandon": "Abandona"
  }
}
```

---

## 3. Con Abandono por Espera Excedida (Client Abandonment)
Los clientes tienen un umbral de paciencia. Si pasan más de una cantidad determinada de tiempo esperando en la cola antes de ser atendidos, abandonan el sistema y se consideran clientes perdidos.

### Mapeo de Parámetros:
*   `flags.hasClientAbandonment`: `true`
*   `config.maxWaitTime`: Tiempo de tolerancia del cliente en segundos (ej. `"600"` para 10 minutos). Puede ser constante (ej. `"600"`) o variable (ej. `"300 - 900"`).

### Ejemplo de Configuración JSON:
```json
{
  "config": {
    "maxTime": 14400,
    "startTime": 32400,
    "arrivalInterval": "10",
    "serviceTime": "12",
    "workTime": "Infinity",
    "restTime": "0",
    "maxWaitTime": "600",
    "travelTime": "0",
    "topology": "COLA_UNICA",
    "numServers": 1
  },
  "flags": {
    "hasServerBreaks": false,
    "hasClientAbandonment": true,
    "hasPriority": false,
    "hasSecurityZone": false,
    "disableArrivals": false
  },
  "initialState": {
    "clientsInQueue": 2,
    "vipClientsInQueue": 0,
    "initialWaitTime": 0,
    "serverBusy": true,
    "busyUntil": 150
  },
  "checkpointRules": [],
  "vocab": {
    "client": "Llamada",
    "arrive": "Entra",
    "served": "Atendida",
    "abandon": "Abandona"
  }
}
```

---

## 4. Con Cola de Prioridades (Priority Queue / Clientes VIP)
Existen dos categorías de clientes: Comunes y VIP. Los clientes VIP tienen prioridad absoluta sobre los comunes. Al llegar, se colocan al principio de la cola (después de cualquier otro VIP que ya esté esperando), pero no interrumpen una atención que ya está en curso (no es apropiativo).

### Mapeo de Parámetros:
*   `flags.hasPriority`: `true`
*   `initialState.vipClientsInQueue`: Número de clientes prioritarios al inicio del sistema.
*   En problemas universitarios de prioridades, a menudo los arribos de clientes comunes y VIP siguen distribuciones de frecuencia distintas. En EventMaster, el simulador asume una tasa de arribo combinada o se ajusta a través del tiempo inicial si se quiere modelar un escenario preconfigurado.

### Ejemplo de Configuración JSON:
```json
{
  "config": {
    "maxTime": 18000,
    "startTime": 28800,
    "arrivalInterval": "8 - 12",
    "serviceTime": "6",
    "workTime": "Infinity",
    "restTime": "0",
    "maxWaitTime": "Infinity",
    "travelTime": "0",
    "topology": "COLA_UNICA",
    "numServers": 1
  },
  "flags": {
    "hasServerBreaks": false,
    "hasClientAbandonment": false,
    "hasPriority": true,
    "hasSecurityZone": false,
    "disableArrivals": false
  },
  "initialState": {
    "clientsInQueue": 3,
    "vipClientsInQueue": 1,
    "initialWaitTime": 0,
    "serverBusy": false,
    "busyUntil": 0
  },
  "checkpointRules": [],
  "vocab": {
    "client": "Vehículo",
    "arrive": "Llega",
    "served": "Cruzado",
    "abandon": "Desvía"
  }
}
```

---

## 5. Con Zona de Seguridad y Tiempo de Viaje (Travel Time / Security Zone)
Un escenario específico (como el del aeropuerto o sistemas robotizados) donde el servidor debe transitar o despejar un área especial durante el cual la pista o recurso no puede recibir nuevos servicios, o el inicio de la atención tiene un retardo fijo.
En el caso típico de una pista: cuando un avión despega, requiere 11 minutos de traslado para despejar la pista, durante los cuales ningún avión puede aterrizar o despegar.

### Mapeo de Parámetros:
*   `flags.hasSecurityZone`: `true`
*   `config.travelTime`: Tiempo de tránsito requerido en segundos (ej. `"660"` para 11 minutos).
*   *Nota de Simulación:* Cuando un avión solicita despegue con la pista vacía, el servidor pasa a estar ocupado por `travelTime` (traslado hasta la pista) + `serviceTime` (uso de pista). Los arribos de aterrizaje no experimentan tiempo de traslado si ya están en posición, pero se respeta la prioridad de aterrizajes sobre despegues.

### Ejemplo de Configuración JSON (Problema de la Pista de Aterrizaje):
```json
{
  "config": {
    "maxTime": 86400,
    "startTime": 0,
    "arrivalInterval": "20, 25, 30",
    "serviceTime": "11 - 21",
    "workTime": "Infinity",
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
    "disableArrivals": false
  },
  "initialState": {
    "clientsInQueue": 0,
    "vipClientsInQueue": 0,
    "initialWaitTime": 0,
    "serverBusy": false,
    "busyUntil": 0
  },
  "checkpointRules": [
    {
      "id": "parada_10_atendidos",
      "type": "served_n",
      "value": 10,
      "label": "Detener al atender 10 aviones"
    }
  ],
  "vocab": {
    "client": "Avión",
    "arrive": "Solicita Pista",
    "served": "Usa Pista",
    "abandon": "Cancela"
  }
}
```
