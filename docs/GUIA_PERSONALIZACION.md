# Guía de Personalización del Motor de Simulación (EventMaster)

Este documento explica paso a paso cómo expandir la arquitectura de `EventMaster` para soportar escenarios complejos o "trampas" de parciales (como el Operario Único, Zona de Seguridad o Redes en Tándem).

Al entender qué archivos y líneas tocar, puedes agregar reglas arbitrarias rápidamente.

---

## Flujo General de Modificación

Toda nueva regla especial en la simulación requiere tocar **3 archivos clave**:
1. **`src/engine/Simulator.js`**: El cerebro. Donde declaras el evento, manejas la lógica, y alteras el flujo de tiempo.
2. **`src/components/ConfigPanel.jsx`**: La interfaz. Donde expones un *toggle* (checkbox) o inputs numéricos para activar tu nueva regla.
3. **`src/presets.js`**: El acceso rápido. Donde creas un escenario prearmado que activa tus reglas automáticamente con un solo clic.

---

## 1. Modificar el Motor (`src/engine/Simulator.js`)

Aquí es donde ocurre la magia. Usa estos puntos de anclaje para inyectar tu código.

### Paso A: Declarar un Nuevo Evento
Si tu regla requiere que algo ocurra en el futuro (ej. "Llegada al Punto de Servicio", "Fin de Abordaje en Rampa"), necesitas registrarlo.
* **Archivo:** `src/engine/Simulator.js`
* **Ubicación:** Objeto `EventType` (aprox. **línea 47**).
```javascript
export const EventType = {
  // ... eventos existentes ...
  MI_NUEVO_EVENTO: 'MI_EVENTO_ESPECIAL' // <--- Agrega el tuyo
};
```
* **Prioridad (Línea 80 aprox):** En la función `createEvent`, define quién gana si dos eventos ocurren en el mismo segundo.
```javascript
    [EventType.MI_NUEVO_EVENTO]: 3, // Menor número = Se ejecuta primero
```

### Paso B: Leer Flags y Cargar Generadores (Constructor)
Si tu nueva regla requiere tiempos aleatorios nuevos (ej. un "Tiempo VIP" o "Tiempo de Traslado").
* **Ubicación:** `constructor` (aprox. **línea 260**).
```javascript
    // Captura un tiempo que el usuario ingresó en la UI si el flag está activo
    if (this.flags.miNuevaRegla) {
      this.generators.miTiempo = getGenerator(this.config.miTiempoParam, 'uniform');
    }
```

### Paso C: Inyección en el Arranque (Inicialización)
Si necesitas que algo ocurra en el Segundo Cero (ej. Las 3 rampas en Tándem que empiezan a trabajar desde el principio sin esperar llegadas).
* **Ubicación:** Método `#initialize` (aprox. **línea 400**).
```javascript
    if (this.flags.miNuevaRegla) {
       // Agendar inmediatamente el primer evento
       this.fel.push(createEvent(this.clock + 10, EventType.MI_NUEVO_EVENTO, { dataExtra: 1 }));
    }
```

### Paso D: Interceptar Lógica Core
Puedes alterar cómo actúan las llegadas o los servidores leyendo tus `flags`.
* **Interceptar Llegadas** (`#handleArrival` aprox **Línea 570**): Para desviar a un cliente a una zona de seguridad en lugar de al servidor.
* **Interceptar Servicio** (`#startService` aprox **Línea 640**): Para alterar el tiempo que tardará un cliente (ej. si es VIP, tarda menos).
* **Interceptar Salida** (`#handleServiceEnd` aprox **Línea 740**): Para decidir si al terminar, el servidor debe hacer otra cosa (ej. El Carpintero que busca en la etapa anterior en lugar de su propia cola).

### Paso E: Crear tu Propio Manejador (Handler)
Si creaste un nuevo evento, necesitas una función que diga qué hacer cuando ocurre.
* **Ubicación:** En cualquier lugar de la clase `Simulator` (ej. **Línea 960**).
```javascript
  #handleMiNuevoEvento(event) {
    // 1. Lógica: Qué pasa aquí
    // 2. Registro: this.#recordHistory(EventType.MI_NUEVO_EVENTO, "Descripción visual");
    // 3. Cadena: Agendar el siguiente evento si hace falta.
  }
```
* **Conectarlo al Bucle:** En el método `step()` (aprox. **Línea 1000**), en el `switch (event.type)`.
```javascript
      case EventType.MI_NUEVO_EVENTO: this.#handleMiNuevoEvento(event); break;
```

---

## 2. Exponer a la Interfaz (`src/components/ConfigPanel.jsx`)

Para que el usuario pueda activar la regla, agrega un Checkbox y sus campos.
* **Ubicación:** Busca la sección `Reglas Extra` o `<div className="config-group">` (aprox. **línea 260 a 310**).

```jsx
{/* 1. El Interruptor */}
<label className="switch">
  <input type="checkbox" checked={flags.miNuevaRegla} onChange={(e) => updateFlags('miNuevaRegla', e.target.checked)} />
  <span className="slider"></span>
  <span>Activar Mi Nueva Regla</span>
</label>

{/* 2. Los Campos Ocultos (Aparecen si se activa el switch) */}
{flags.miNuevaRegla && (
  <div style={{ paddingLeft: '10px' }}>
    <label>
      <span>Mi Tiempo Especial</span>
      <TimeField 
        value={config.miTiempoParam} 
        onChange={(val) => updateConfig('miTiempoParam', val)}
      />
    </label>
  </div>
)}
```

---

## 3. Crear el Acceso Directo (`src/presets.js`)

No queremos cargar los parámetros a mano cada vez. Crea un escenario.
* **Ubicación:** Objeto `academicPresets` (aprox. **línea 1 a 530**).

```javascript
  mi_escenario_magico: {
    label: "Parcial: El Escenario Mágico",
    vocab: { client: "Objetos", arrive: "Llega", served: "Se va", abandon: "Rechazado" },
    config: {
      maxTime: 3600,
      startTime: 0,
      arrivalInterval: '60',
      serviceTime: '40',
      miTiempoParam: '10 - 20', // Tu nueva variable
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      miNuevaRegla: true, // Activas tu flag por defecto
    },
    initialState: {
      clientsInQueue: 0
    },
    checkpointRules: []
  }
```

---

## 4. Ejemplos Prácticos Aplicados Recientemente

### A) El Operario Único (Carpintero - Topología Encadenados)
* **El Problema:** Múltiples etapas de servicio (Cortar, Lijar, Ensamblar), pero **solo un servidor físico** que se mueve entre ellas.
* **Dónde se modificó:**
  * `Simulator.js` (Línea ~656): Se creó un `#checkAndStartSingleWorkerChained()`. En lugar de que cada etapa trabaje sola, una función maestra escanea todas las colas de atrás hacia adelante (o según la estrategia) buscando al cliente más prioritario para mover el "operario" virtual.
  * `Simulator.js` (Línea ~776): Al terminar `#handleServiceEnd`, en lugar de pasar el cliente automáticamente a la etapa 2, se tira a la cola y se vuelve a invocar `#checkAndStartSingleWorkerChained()`.

### B) Zona de Seguridad (Aeropuerto Pista Única)
* **El Problema:** Antes de entrar al servidor, el cliente debe cruzar un pasillo que tarda X minutos.
* **Dónde se modificó:**
  * `Simulator.js` (Línea 54): Nuevo evento `ARRIVAL_PS`.
  * `Simulator.js` (Línea ~590): En `#handleArrival`, si `hasSecurityZone` es true, en vez de llamar a `#startService()`, se llama a `#sendClientThroughSecurityZone()` que lo "oculta" y agenda un `ARRIVAL_PS` en `X` minutos.
  * `Simulator.js` (Línea ~710): Nuevo método `#handleArrivalPS()`. Cuando este evento dispara, recién ahí entra a `#startService()`.

### C) Redes en Tándem con Abastecimiento Infinito (3 Rampas)
* **El Problema:** 3 fuentes infinitas paralelas que se autoabastecen al terminar y llenan una cola central.
* **Dónde se modificó:**
  * `Simulator.js` (Línea ~404): En el inicializador `#initialize`, un bucle for lanza los primeros 3 eventos `RAMP_BOARDING_COMPLETE` usando un generador propio.
  * `Simulator.js` (Línea ~957): En `#handleRampBoardingComplete()`, en vez de terminar ahí, el evento envía el avión al Server Principal, e INMEDIATAMENTE tira otro `this.fel.push(createEvent(time, RAMP_BOARDING_COMPLETE))` repitiendo el ciclo para siempre, sin depender de la variable de "Llegadas" del simulador clásico.
