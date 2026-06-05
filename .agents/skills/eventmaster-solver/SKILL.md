---
name: eventmaster-solver
description: "Analizador de problemas de simulación de eventos discretos (teoría de colas) y generador de presets JSON listos para importar en EventMaster."
---

# EventMaster Solver

Esta skill enseña al agente cómo analizar enunciados de problemas de simulación de eventos discretos (generalmente de cátedras universitarias de Modelos y Simulación como la UNLaR) y convertirlos en un preset JSON compatible con el simulador de colas **EventMaster**.

> [!IMPORTANT]
> **REGLA DE COMPORTAMIENTO CRÍTICA:**
> Esta skill tiene un propósito meramente analítico, conceptual y de generación de configuración (preset JSON).
> * **NO ejecutes comandos o scripts en la terminal** (como scripts de python, node, tests o comandos de consola).
> * **NO navegues por la base de código del proyecto** ni edites archivos fuente del simulador, a menos que el usuario te lo solicite explícitamente.
> * Concéntrate en resolver teórica/matemáticamente el enunciado y generar el preset en formato JSON.

## Flujo de Trabajo para el Agente

Cuando un usuario te presente un problema de simulación o teoría de colas para resolver en EventMaster:

1.  **Analizar el Enunciado:**
    *   **Clientes y Servidores:** Identifica qué representa el cliente (ej. avión, paciente, automóvil) y qué representa el servidor (ej. pista, médico, surtidor). Define el vocabulario (`vocab`).
    *   **Tiempos de Arribo:** Extrae el intervalo entre arribos (`arrivalInterval`). ¿Es constante, un rango (`min - max`), o un conjunto discreto de valores?
    *   **Tiempos de Servicio:** Extrae el tiempo de atención (`serviceTime`).
    *   **Topología:** Determina si es un solo servidor o múltiples servidores. Si son múltiples, identifica si tienen colas independientes (`AISLADOS`), una fila única (`COLA_UNICA`), o si están en serie (`ENCADENADOS`).
    *   **Restricciones Especiales (Flags):**
        *   ¿Hay descansos? Identifica el tiempo de trabajo (`workTime`) y de descanso (`restTime`).
        *   ¿Hay roturas o paros imprevistos? Si al detenerse el servidor se descarta la cola y el proceso actual, y se descartan las nuevas llegadas durante la reparación, activa `catastrophicBreakdown`.
        *   ¿Hay abandono por impaciencia? Identifica el tiempo máximo de espera (`maxWaitTime`).
        *   ¿Hay prioridades? Si hay clientes VIP y comunes que comparten cola (ej. aterrizajes vs despegues, emergencias vs consultas), activa `hasPriority`.
        *   ¿Hay tiempo de viaje/traslado? Si el servidor demora en desplazarse hacia el cliente o despejar la pista, activa `hasSecurityZone` e identifica el `travelTime`.
        *   ¿Los clientes VIP/prioritarios evitan el tiempo de traslado? Si es así, activa `vipSkipsSecurityZone`.
    *   **Condiciones Iniciales:** Determina si el sistema empieza vacío o si hay clientes en cola (`clientsInQueue`) o si el servidor empieza ocupado (`serverBusy` y `busyUntil`).
    *   **Reglas de Parada (Checkpoints):** Determina cuándo se detiene la simulación (ej. después de 10 clientes servidos, al primer descanso, o a las 2 horas).

2.  **Consultar las Referencias:**
    *   Usa [references/problem-catalog.md](references/problem-catalog.md) para ver cuál de los 5 tipos de problemas base se adapta mejor al enunciado.
    *   Asegúrate de que la estructura resultante respete el formato de [references/preset-schema.json](references/preset-schema.json).

3.  **Generar el JSON del Preset:**
    *   Construye el objeto JSON con todos sus campos (`config`, `flags`, `initialState`, `checkpointRules`, `vocab`).
    *   **Manejo de Unidades de Tiempo (IMPORTANTE):**
        *   **Usa minutos por defecto (`"timeUnit": "min"`)** a menos que el problema original esté explícitamente redactado en segundos.
        *   Si `"timeUnit": "min"`, **los valores textuales de los intervalos (`arrivalInterval`, `serviceTime`, `workTime`, `restTime`, `travelTime`, `maxWaitTime`) se deben escribir en minutos** (ej. `"11 - 21"` o `"11"`). La interfaz web de EventMaster los multiplicará automáticamente por 60 para inicializar el motor. **No realices la conversión manual a segundos** para estos campos, de lo contrario ocurrirá una doble multiplicación.
        *   El parámetro numérico **`maxTime`** (y campos del `initialState` como `initialWaitTime` o `busyUntil`) **siempre deben especificarse en segundos**, sin importar el valor de `timeUnit` (ej. 1 hora = `3600`, 8 horas = `28800`).
    *   Presenta al usuario la explicación razonada del mapeo de variables.
    *   Proporciona el JSON final dentro de un bloque de código markdown de tipo `json` para que el usuario pueda copiarlo con un solo clic.

## Estructura Esperada del JSON

El JSON generado debe tener exactamente la siguiente forma:

```json
{
  "label": "Nombre del Ejercicio",
  "config": {
    "maxTime": 14400,
    "startTime": 28800,
    "arrivalInterval": "10 - 20",
    "serviceTime": "15",
    "workTime": "Infinity",
    "restTime": "0",
    "maxWaitTime": "Infinity",
    "travelTime": "0",
    "topology": "COLA_UNICA",
    "numServers": 1,
    "timeUnit": "min"
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

## Ejemplo de Interacción

**Usuario:**
> Resuelve este problema: En una peluquería hay un solo peluquero. Los clientes llegan cada 15 a 25 minutos. Cortar el pelo toma 20 minutos constante. El peluquero trabaja 4 horas continuas y luego descansa 30 minutos. Simulalo por 8 horas.

**Agente:**
> Entendido. Analizando el problema de la peluquería:
> * **Vocabulario:** El cliente es un "Cliente" y el servicio es un "Corte".
> * **Tiempos:** Arribos `15 - 25` min, Servicio `20` min (constante).
> * **Descansos:** Trabaja 4 horas (14400 seg), descansa 30 minutos (1800 seg).
> * **Duración:** 8 horas (28800 seg).
>
> Aquí tienes el preset JSON para copiar e importar en EventMaster:
>
> ```json
> {
>   "label": "Peluquería con Descansos",
>   "config": {
>     "maxTime": 28800,
>     "startTime": 28800,
>     "arrivalInterval": "15 - 25",
>     "serviceTime": "20",
>     "workTime": "14400",
>     "restTime": "1800",
>     "maxWaitTime": "Infinity",
>     "travelTime": "0",
>     "topology": "COLA_UNICA",
>     "numServers": 1,
>     "timeUnit": "min"
>   },
>   "flags": {
>     "hasServerBreaks": true,
>     "hasClientAbandonment": false,
>     "hasPriority": false,
>     "hasSecurityZone": false,
>     "disableArrivals": false
>   },
>   "initialState": {
>     "clientsInQueue": 0,
>     "vipClientsInQueue": 0,
>     "initialWaitTime": 0,
>     "serverBusy": false,
>     "busyUntil": 0
>   },
>   "checkpointRules": [],
>   "vocab": {
>     "client": "Cliente",
>     "arrive": "Llega",
>     "served": "Atendido",
>     "abandon": "Abandona"
>   }
> }
> ```
