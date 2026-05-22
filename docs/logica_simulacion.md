# Documentación Técnica: Lógica de Simulación y Topologías

Este documento detalla la lógica de funcionamiento del motor de simulación de EventMaster ([Simulator.js](file:///c:/Users/Isaac/OneDrive/Documentos/5to%20Año/EventMaster/eventmaster-web/src/engine/Simulator.js)) respecto al enrutamiento de clientes, selección de servidores y prioridades bajo las distintas topologías soportadas (`AISLADOS`, `COLA_UNICA`, `ENCADENADOS`).

---

## 1. Topología Aislada (`AISLADOS`)

En esta topología, cada puesto de servicio (servidor) funciona como una unidad independiente con su propia cola local (`server.queue`).

### ¿Cómo se determina a qué servidor va cada cliente?
Cuando ocurre un evento de **LLEGADA** (`EventType.ARRIVAL` o `EventType.ARRIVAL_VIP`):

1. **Enrutamiento por Evento (Predeterminado)**:
   El motor busca si el evento entrante trae un servidor de destino predefinido en sus datos contextuales (`event.data.serverId`). Esto es común en escenarios donde existen flujos de llegada específicos programados por separado para cada servidor.
2. **Enrutamiento Aleatorio (Respaldo)**:
   Si no se especifica un `serverId` en el evento, el simulador asigna al cliente a un servidor del pool de forma aleatoria equiprobable utilizando:
   ```javascript
   const targetId = serverId ? serverId - 1 : Math.floor(Math.random() * this.numServers);
   ```
3. **Proceso de Admisión**:
   - **Servidor Libre y Presente**: Si el servidor seleccionado está `LIBRE` y `presente` (no está en descanso/pausa), el cliente ingresa directamente a atención, llamando a `#startService` y programando su fin de servicio.
   - **Servidor Ocupado o Ausente**: Si el servidor está `OCUPADO` o en descanso (`BREAK`), el cliente es agregado al final de la cola local de ese servidor específico (`server.queue.push(client)`).

### Lógica de Abandono
Si el cliente no es atendido inmediatamente y entra en la cola, el simulador calcula su tiempo de paciencia (`client.patienceTime`) y programa un evento de **ABANDONO** en la Lista de Eventos Futuros (FEL). Si el evento de abandono se procesa antes de que el servidor se libere para atenderlo, el cliente sale del sistema y se contabiliza en las estadísticas de abandono.

---

## 2. Topología de Cola Única (`COLA_UNICA`)

En la topología de cola única, todos los servidores comparten una estructura de espera común, la cual está separada internamente en dos canales según la prioridad: `queues.vip` (Prioridad B) y `queues.default` (Prioridad A).

### Llegada de un Cliente
Cuando un nuevo cliente llega al sistema:

1. **Selección del Servidor Activo (Búsqueda Lineal)**:
   El simulador recorre el arreglo de servidores de izquierda a derecha (por ID ascendente) buscando al primero que esté libre y activo:
   ```javascript
   const freeServer = this.servers.find(s => s.state === ServerState.IDLE && s.present);
   ```
   * **Regla de Desempate**: Si hay varios servidores libres a la vez, el cliente siempre será asignado al servidor con el **ID más bajo** (el primero en el arreglo), debido al comportamiento del método `.find()`.
2. **Derivación a la Cola Compartida**:
   Si todos los servidores presentes están ocupados (o ausentes), el cliente ingresa a la cola común:
   - Si el cliente es **VIP** (Prioridad B), se añade a `queues.vip`.
   - Si el cliente es **Normal** (Prioridad A), se añade a `queues.default`.
   Se agenda su respectivo evento de abandono en la FEL basado en su paciencia.

### Selección de Clientes por el Servidor (Liberación de Puesto)
Cuando un servidor finaliza un servicio (`EventType.SERVICE_END`) o regresa de un descanso (`EventType.SERVER_BREAK_END`), ejecuta la función `#selectNextClientForServer(server)` para obtener su siguiente trabajo:

1. **Prioridad Absoluta FIFO**:
   El servidor primero consulta la cola VIP. Si tiene clientes, extrae al primero que llegó (FIFO). Si la cola VIP está vacía, procede a extraer al primero de la cola estándar (FIFO):
   ```javascript
   nextClient = this.queues.vip.shift() || this.queues.default.shift();
   ```
2. **Asignación**:
   Si encuentra un cliente, inicia el servicio inmediatamente. Si no hay clientes en ninguna de las colas, el servidor pasa a estado `LIBRE`.

---

## 3. Topología Encadenada (`ENCADENADOS`)

Esta topología modela un proceso lineal secuencial de $N$ etapas, donde cada etapa es procesada por un servidor específico.

### Flujo de Clientes y Trabajo
1. **Entrada Única**:
   Todos los nuevos clientes que ingresan al sistema son dirigidos obligatoriamente al **Servidor 1** (Etapa 1). Si el Servidor 1 está ocupado, esperan en su cola local (`servers[0].queue`).
2. **Flujo entre Etapas**:
   Cuando un servidor $i$ finaliza el servicio de un cliente:
   - Si no es la última etapa ($i < N$), el cliente avanza a la siguiente etapa ($i+1$).
   - Si el servidor de la etapa $i+1$ está libre y presente, el cliente comienza su atención inmediatamente. De lo contrario, se encola en la cola local de dicho servidor (`servers[i].queue`).
   - El servidor de la etapa $i$ que se acaba de liberar busca un nuevo cliente en su propia cola local para mantener el flujo.
3. **Salida del Sistema**:
   Un cliente solo abandona el sistema y se cuenta como "atendido" (`stats.clientsServed++`) tras completar exitosamente su servicio en el último servidor del flujo (Etapa $N$).

---

## Resumen de Reglas de Enrutamiento y Selección

| Topología | Flujo de Entrada (Llegada) | Destino de Cola (Si está ocupado) | Selección de Siguiente Cliente (Al liberarse) |
| :--- | :--- | :--- | :--- |
| **Aislada (`AISLADOS`)** | Dirigido por `serverId` del evento, o aleatorio. | Cola individual del servidor asignado (`server.queue`). | Extrae de su propia cola local. Prioriza VIPs locales si la prioridad está activa. |
| **Cola Única (`COLA_UNICA`)** | Busca el primer servidor libre (`IDLE` y `presente`). Prioridad al ID más bajo. | Cola común VIP (`queues.vip`) o Normal (`queues.default`). | Extrae de la cola VIP común. Si está vacía, extrae de la cola Normal común. |
| **Encadenada (`ENCADENADOS`)** | Ingresa siempre por la Etapa 1 (Servidor 1). | Cola local del servidor de la etapa actual (`servers[stage].queue`). | Extrae de la cola local de su propia etapa. |
