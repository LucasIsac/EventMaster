# Documentación General de EventMaster

Bienvenido a la documentación unificada de **EventMaster**, un simulador visual interactivo diseñado para el estudio de la **Teoría de Colas** y la **Simulación de Eventos Discretos (DES)**.

Este documento describe la arquitectura básica del simulador y detalla cada uno de los problemas académicos que EventMaster es capaz de resolver, explicando en profundidad **CÓMO** los simula el motor en su código ([Simulator.js](file:///c:/Users/Leo/Documents/Programming/github/repositories/EventMaster/src/engine/Simulator.js)).

---

## 📁 Estructura del Repositorio de Documentación

Para mantener el repositorio limpio y bien organizado, toda la documentación teórica y lógica se consolida en este archivo principal. Los enunciados prácticos adicionales se encuentran organizados en carpetas específicas:

* **[ejercicios/](file:///c:/Users/Leo/Documents/Programming/github/repositories/EventMaster/docs/ejercicios/)**:
  - [tp1-cinco-problemas.md](file:///c:/Users/Leo/Documents/Programming/github/repositories/EventMaster/docs/ejercicios/tp1-cinco-problemas.md): Enunciados base de teoría de colas (M/M/1, abandonos, descansos, prioridad y zona de seguridad).
  - [guia-3p-1ps.md](file:///c:/Users/Leo/Documents/Programming/github/repositories/EventMaster/docs/ejercicios/guia-3p-1ps.md): Problemas con puestos de servicio independientes y encadenados.
  - [guia-4-ejercicios-colas.md](file:///c:/Users/Leo/Documents/Programming/github/repositories/EventMaster/docs/ejercicios/guia-4-ejercicios-colas.md): Guía de ejercicios prácticos incluyendo el problema de desvíos y el del Carpintero.
* **[casos-estudio/](file:///c:/Users/Leo/Documents/Programming/github/repositories/EventMaster/docs/casos-estudio/)**:
  - [caso-estudio-pista-clasificacion.md](file:///c:/Users/Leo/Documents/Programming/github/repositories/EventMaster/docs/casos-estudio/caso-estudio-pista-clasificacion.md): Problemas avanzados de pista de aterrizaje de aeropuerto y máquina clasificadora con desperfectos.

---

## ⚙️ Arquitectura del Motor y loop de Simulación (DES)

EventMaster funciona mediante un loop de **Simulación de Eventos Discretos (DES)**. A diferencia de las simulaciones por pasos de tiempo fijos, el reloj del simulador (`clock`) salta de forma no lineal directamente al tiempo del próximo evento programado más cercano.

### Componentes Clave del Motor:
1. **FEL (Future Event List - Lista de Eventos Futuros)**:
   Un arreglo de eventos ordenados cronológicamente por su tiempo de ocurrencia. Si dos eventos ocurren al mismo tiempo, se ordenan según su nivel de prioridad interna del evento (menor número = más prioritario).
2. **Generadores Estadísticos (`generators.js`)**:
   Clases encargadas de calcular los tiempos de arribo o de atención:
   - `ConstantGenerator`: Devuelve siempre el mismo valor.
   - `UniformGenerator`: Genera valores uniformes dentro del rango $[Min, Max]$.
   - `ExponentialGenerator`: Genera valores con distribución exponencial usando $-Media \times \ln(1 - Random)$.
   - `ListGenerator`: Sigue una secuencia fija de valores y repite el último (útil para verificar simulaciones manuales).
3. **Checkpoints**:
   Evaluaciones lógicas condicionales al final de cada evento que permiten "congelar" y almacenar una foto exacta del estado del simulador ante determinadas reglas (ej: "tomar foto al llegar al minuto 60").

---

## 🧠 Problemas que Resuelve EventMaster y CÓMO los Resuelve

A continuación, se enumeran todos los problemas que EventMaster resuelve, detallando la lógica algorítmica y de eventos que implementa el motor.

---

### 1. Sistema de Colas Tradicional (Modelos M/M/1 y M/M/s)
* **El Problema**: Modelar la llegada aleatoria de clientes a un puesto de atención con uno o varios servidores en paralelo. Si todos están ocupados, se forma una única cola común y los clientes se atienden bajo la regla FIFO (First In, First Out).
* **Cómo lo resuelve EventMaster**:
  - El motor agenda el primer evento de tipo `LLEGADA` en el tiempo de inicio (`startTime`).
  - Cuando se procesa un evento `LLEGADA`:
    1. Se calcula el tiempo hasta el próximo arribo usando el generador de llegadas ($\Delta t_{LL}$) y se agenda la siguiente `LLEGADA` en la FEL (`clock + dt`).
    2. El motor realiza una búsqueda para ver si hay algún servidor libre (`IDLE` y presente).
    3. Si encuentra un servidor libre: el estado del servidor cambia a `OCUPADO` (`BUSY`), se calcula la duración del servicio ($\Delta t_S$) usando el generador de servicios, y se programa el evento `FIN_SERVICIO` en la FEL en `clock + dt`.
    4. Si todos los servidores están ocupados: se instancia un nuevo objeto cliente (con su hora de llegada registrada) y se añade al final del arreglo de la cola (`queue.push(client)`).
  - Al procesar un evento `FIN_SERVICIO`:
    1. El servidor cambia a estado `IDLE`.
    2. Se incrementa la métrica `stats.clientsServed`.
    3. El servidor busca en la cola: si hay clientes esperando, extrae al primero (`queue.shift()`), calcula su tiempo de servicio, programa el nuevo `FIN_SERVICIO` y vuelve a estado `OCUPADO`.

---

### 2. Ciclos de Trabajo y Descanso del Servidor (Server Breaks)
* **El Problema**: El servidor no trabaja de forma continua; tiene ciclos donde atiende durante un tiempo $\Delta T$ (trabajo) y descansa durante $\Delta D$ (descanso). Si está atendiendo a un cliente cuando inicia el descanso, el servicio se interrumpe y debe reanudarse con el tiempo restante exacto cuando el servidor regrese.
* **Cómo lo resuelve EventMaster**:
  - Implementa los eventos `SALIDA_SERVIDOR` (inicio de descanso) y `LLEGADA_SERVIDOR` (regreso del descanso).
  - En la inicialización, si la opción está activa, se agenda la primera `SALIDA_SERVIDOR` en `startTime + workTime`.
  - Cuando ocurre `SALIDA_SERVIDOR`:
    1. Se cambia el flag de disponibilidad del servidor (`present = false`) y su estado a `AUSENTE`.
    2. Si el servidor estaba `OCUPADO` atendiendo a un cliente: se calcula el tiempo restante que le faltaba para terminar (`remainingTime = finServicioProgramado - clock`), se almacena la referencia del cliente y el `remainingTime`, y **se elimina el evento `FIN_SERVICIO` asociado de la FEL** para evitar eventos fantasmas.
    3. Se agenda la `LLEGADA_SERVIDOR` en la FEL a `clock + restTime`.
  - Cuando ocurre `LLEGADA_SERVIDOR`:
    1. Se marca al servidor como disponible (`present = true`).
    2. Si tenía un cliente pausado: recupera al cliente, cambia su estado a `OCUPADO` y programa su `FIN_SERVICIO` en la FEL usando el tiempo restante guardado (`clock + remainingTime`).
    3. Si no tenía clientes pausados: revisa la cola para ver si hay alguien esperando y arranca un servicio nuevo. Si está vacía, pasa a `IDLE`.
    4. Agenda la próxima `SALIDA_SERVIDOR` a `clock + workTime`.

---

### 3. Abandono de Cola por Impaciencia (Reneging)
* **El Problema**: Los clientes que esperan en la cola tienen un límite de paciencia aleatorio o constante ($\Delta SC$). Si superan ese tiempo sin haber comenzado a recibir atención, abandonan la cola y el sistema de forma definitiva.
* **Cómo lo resuelve EventMaster**:
  - Evita el uso de chequeos periódicos ineficientes del reloj. En su lugar, utiliza eventos de abandono específicos.
  - Al crearse un cliente que debe ir a la cola (porque los servidores están ocupados):
    1. Se calcula su tiempo de paciencia con su respectivo generador.
    2. Si la paciencia es menor a infinito, se agenda un evento de tipo `ABANDONO` en la FEL para el tiempo exacto `clock + paciencia`. Este evento lleva en sus metadatos el `clientId` del cliente específico.
  - Cuando se procesa el evento `ABANDONO`:
    1. El motor busca en la cola activa si existe un cliente con ese `clientId`.
    2. Si el cliente **aún está en la cola**: se le remueve de la cola (`splice`), se incrementa `stats.clientsAbandoned` y el cliente sale del sistema.
    3. Si el cliente **ya no está en la cola** (porque el servidor se liberó antes y ya empezó a atenderlo): el evento de abandono se ignora por completo (no-op).

---

### 4. Clientes Prioritarios (Prioridades VIP)
* **El Problema**: Conviven dos tipos de clientes en el sistema (VIP y Normales). Los VIP deben ser atendidos siempre antes que cualquier cliente normal que esté en espera.
* **Cómo lo resuelve EventMaster**:
  - El motor mantiene dos colas separadas en memoria: `queues.vip` y `queues.default`.
  - Al procesar una `LLEGADA`:
    - Si el cliente es VIP (determinado por el tipo de evento `ARRIVAL_VIP` o por azar), si no puede ser atendido de inmediato, se añade a `queues.vip.push(client)`.
    - Si es normal, se añade a `queues.default.push(client)`.
  - Cuando un servidor se desocupa y busca su siguiente tarea (`#selectNextClient`):
    - Intenta extraer primero de la cola VIP: `nextClient = queues.vip.shift()`.
    - Si la cola VIP está vacía, extrae de la cola común: `nextClient = queues.default.shift()`.
  - En la FEL, los eventos de tipo `ARRIVAL_VIP` tienen asignada una prioridad interna mayor (valor 3) que los eventos `ARRIVAL` comunes (valor 4). Si ambos ocurren al mismo segundo, el VIP se procesa primero.

---

### 5. Restricción de Zona de Seguridad (Transit Delay)
* **El Problema**: El puesto de atención está alejado del área de espera por motivos de seguridad. Cuando el servidor se libera, el primer cliente de la cola debe viajar cruzando una "Zona de Seguridad" durante un tiempo `travelTime`. 
  - Solo puede haber un cliente cruzando la zona de seguridad a la vez.
  - Ningún otro cliente puede ingresar a la zona de seguridad hasta que el que viaja llegue al puesto de servicio, reciba su atención y libere el servidor.
* **Cómo lo resuelve EventMaster**:
  - Introduce una variable de estado booleana `szBusy` (zona de seguridad ocupada) y dos tipos de eventos especiales: `ENTER_SZ` (entrar a la zona de seguridad) y `ARRIVAL_PS` (arribo al puesto de servicio).
  - Flujo de llegada:
    - Si un cliente llega y el sistema está vacío (`cola` vacía, `szBusy = false` y servidor `IDLE`): el cliente entra directo a la zona de seguridad programando un evento `ENTER_SZ` para el instante actual.
    - Si hay clientes en cola, si `szBusy` es verdadero, o si el servidor está ocupado: el cliente se añade a la cola común.
  - Procesamiento de eventos:
    - **`ENTER_SZ`**: Marca la zona como bloqueada (`szBusy = true`). Programa en la FEL el evento `ARRIVAL_PS` a `clock + travelTime`.
    - **`ARRIVAL_PS`**: Libera la zona de seguridad (`szBusy = false`). 
      1. Pasa el estado del servidor a `OCUPADO` y programa su `FIN_SERVICIO`.
      2. Si hay clientes esperando en cola: extrae al primero y programa su entrada a la zona de seguridad (`ENTER_SZ`) en el mismo instante actual (`clock`). (Esto simula que el siguiente cliente tiene permitido iniciar el viaje ya que el anterior despejó la zona).
    - **`FIN_SERVICIO`**: El servidor simplemente pasa a `IDLE`. No extrae directamente de la cola, ya que el paso de cola a servidor está regulado por el flujo de la zona de seguridad (`ENTER_SZ` $\rightarrow$ `ARRIVAL_PS`).

---

### 6. Pérdida o Desvío de Clientes (Loss System)
* **El Problema**: Los clientes que llegan y encuentran el servidor ocupado no esperan. Son desviados automáticamente hacia otra máquina o salen del sistema.
* **Cómo lo resuelve EventMaster**:
  - Se modela configurando la paciencia máxima del cliente en **0 segundos**.
  - Al encolar al cliente, se programa su `ABANDONO` para el mismo instante actual (`clock`). Esto hace que se ejecute la lógica de abandono inmediatamente en el siguiente sub-paso de tiempo, registrando el descarte o desvío y liberando la cola de inmediato.

---

### 7. Sistemas Multi-Etapa y Operario Único (Topología Encadenada / Chained)
* **El Problema**: Los clientes deben atravesar $N$ etapas sucesivas en serie (Servidor 1 $\rightarrow$ Servidor 2 $\rightarrow$ Servidor N). 
  - Si hay un **único operario (Worker)** para toda la fábrica, este solo puede realizar una tarea a la vez. Debe elegir una estrategia de trabajo: *Silla por silla* (priorizar terminar piezas avanzadas) o *Por lotes* (priorizar la etapa inicial sobre todo el lote).
* **Cómo lo resuelve EventMaster**:
  - En la topología `ENCADENADOS`, cuando se procesa `FIN_SERVICIO` en la etapa $i$:
    - Si $i < N$, el cliente avanza a la etapa $i+1$. Si el servidor $i+1$ está ocupado, se añade a la cola local de ese servidor (`servers[i+1].queue`).
    - Si $i = N$, el cliente sale del sistema y se contabiliza como atendido.
  - Si el flag `singleWorkerChained` está activo:
    - El motor controla que a lo sumo exista un solo servidor en estado `OCUPADO` a nivel global.
    - Cuando el operario se libera, en lugar de mirar solo su cola local, busca trabajo en todas las etapas según la estrategia configurada:
      - **Estrategia Silla por Silla** (Prioriza finalizar): El operario recorre las colas de las etapas de atrás hacia adelante (Etapa N $\rightarrow$ Etapa 1). Si encuentra a alguien esperando, inicia su servicio en esa etapa. Esto disminuye el inventario en proceso.
      - **Estrategia Por Lotes** (Prioriza etapas iniciales): Recorre las colas de adelante hacia atrás (Etapa 1 $\rightarrow$ Etapa N). El operario no avanzará a las etapas posteriores hasta que la cola de la primera etapa se vacíe por completo.

---

### 8. Simulación del Aeropuerto (Landings VIP y Takeoffs con Carreteo)
* **El Problema**: Una pista única (servidor) es compartida por despegues (aviones normales que deben carretear 11 minutos por la zona de seguridad antes de poder despegar) y aterrizajes (aviones VIP que tienen prioridad absoluta y se saltan la zona de seguridad, usando la pista directamente).
* **Cómo lo resuelve EventMaster**:
  - Configura un sistema con prioridades VIP y zona de seguridad activa, y hace uso del flag específico `vipSkipsSecurityZone = true`.
  - Cuando llega un despegue (avión normal) con pista libre: ingresa a la zona de seguridad (`ENTER_SZ`), bloqueando la zona durante 11 minutos. Durante este carreteo, la pista se considera *reservada* y ningún otro avión puede usarla.
  - Cuando llega un aterrizaje (avión VIP) con pista libre: ignora la zona de carreteo y programa su uso de pista (`SERVICE_END`) de inmediato.
  - Cuando la pista se desocupa (`FIN_SERVICIO`):
    - El despachador evalúa las colas. Si hay aterrizajes (VIP) esperando en cola, se les concede la pista inmediatamente (FIFO) saltándose la zona de seguridad.
    - Solo si la cola de aterrizajes está vacía, se autoriza al despegue (Normal) en el frente de la cola a ingresar a la zona de seguridad para iniciar su carreteo de 11 minutos.
  - **Fenómeno de Inanición (Starvation)**: Debido a que la tasa de aterrizajes suele superar la capacidad de procesamiento de la pista única, los despegues normales acumulan tiempos de espera infinitos en la cola común de la pista, quedando relegados indefinidamente.
