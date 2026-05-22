# EventMaster - Diagrama de Flujo Lógico y Flexibilidad del Sistema

Este documento describe la arquitectura y el flujo lógico de **EventMaster**, un simulador de Teoría de Colas basado en el método de **Simulación de Eventos Discretos (DES - Discrete Event Simulation)**. A continuación, se detallan el ciclo de vida del simulador, el procesamiento de eventos y cómo se manifiesta la flexibilidad en cada parte del sistema.

---

## 1. Mapa General del Sistema: Visión General y Selección de Flujo

Este diagrama de alto nivel muestra cómo se conectan todas las partes del simulador. Sirve como **mapa de ruta** para entender qué ocurre en cada etapa y qué diagrama consultar para cada detalle.

```mermaid
flowchart TD
    %% ENTRADA - Configuración
    subgraph Configuracion [Configuración Inicial]
        C1[Configurar Parámetros] --> C2[Topología: COLA_ÚNICA / AISLADOS / ENCADENADOS]
        C2 --> C3[Número de Servidores 1-10]
        C3 --> C4[Distribuciones: Llegada / Servicio / Paciencia]
        C4 --> C5[Flags: VIP / Descansos / Abandonos / Zona Seguridad]
    end

    %% INICIALIZACIÓN
    subgraph Inicializacion [Inicialización]
        I1[Crear Servidores en estado LIBRE] --> I2[Poblar cola con clientes iniciales]
        I2 --> I3[Programar primera llegada en FEL]
        I3 --> I4[Programar descansos iniciales si aplica]
        I4 --> I5[Asignar clientes iniciales a servidores libres]
    end

    %% BUCLE PRINCIPAL
    subgraph Step [Ciclo Principal - Un Paso de Simulacion]
        S1{"¿FEL vacía o tiempo > maxTime?"}
        S1 -->|No| S2[Extraer siguiente evento de FEL]
        S2 --> S3[Avanzar reloj al tiempo del evento]
        S3 --> S4{Despachador: Tipo de Evento}
        
        S4 -->|LLEGADA| D1[Ver Diagrama 3.1: Flujo de Llegada]
        S4 -->|FIN_SERVICIO| D2[Ver Diagrama 3.2: Fin de Servicio]
        S4 -->|SALIDA_SERVIDOR| D3[Ver Diagrama 5: Inicio Descanso]
        S4 -->|LLEGADA_SERVIDOR| D4[Ver Diagrama 5: Fin Descanso]
        S4 -->|ABANDONO| D5[Ver Diagrama 5: Abandono]
        
        D1 & D2 & D3 & D4 & D5 --> S5[Evaluar checkpoints y zona de seguridad]
        S5 --> S6[Registrar en historial y actualizar estadísticas]
        S6 --> S1
    end

    %% SALIDA
    subgraph Resultados [Finalización y Resultados]
        R1[Generar estadísticas finales] --> R2[Served / Abandoned / AvgWait]
        R2 --> R3[Utilización de servidores %]
        R3 --> R4[Exportar CSV / Mostrar conclusiones]
    end

    Configuracion --> Inicializacion
    Inicializacion --> S1
    S1 -->|Sí: Fin| Resultados

```

### 1.1 Guía de Navegación de Diagramas

| Para entender... | Ir a... |
|-----------------|---------|
| Cómo llega un cliente y se encola | Diagrama 3.1 (sección 3.1) |
| Cómo termina un servicio y fluye entre servidores | Diagrama 3.2 - Fin de Servicio |
| Cómo funcionan los descansos del servidor | Diagrama 3.2 - Descansos |
| Ciclo de vida completo del simulador | Diagrama 4 (sección 4) |
| Procesamiento detallado de cada tipo de evento | Diagrama 5 (sección 5) |
| Estados posibles de un servidor | Diagrama 6 (sección 6) |
| Cómo se organizan las colas por topología | Diagrama 7 (sección 7) |

---

## 2. Conceptos Clave de la Flexibilidad en EventMaster

La flexibilidad del simulador se define mediante varias configuraciones y banderas dinámicas (`flags`):

1. **Topologías de Sistema (`SystemTopology`):**
   * **COLA_UNICA (Single Queue):** Múltiples servidores atienden a partir de una única fila central (con soporte para prioridad VIP).
   * **AISLADOS (Isolated):** Cada servidor cuenta con su propia fila independiente. Los clientes ingresan directamente a la fila de un servidor específico.
   * **ENCADENADOS (Chained):** Proceso secuencial o en etapas. El cliente debe ser atendido secuencialmente por el Servidor 1, luego el Servidor 2, y así sucesivamente.
   
2. **Priorización (VIP):**
   * Habilitación de flujo VIP donde los clientes B (VIP) saltan al principio de la fila o se gestionan en una fila dedicada y tienen prioridad en eventos futuros (`ARRIVAL_VIP` con prioridad 3 vs `ARRIVAL` con prioridad 4).

3. **Abandonos por Impaciencia (`ABANDONO`):**
   * Cada cliente tiene un tiempo de paciencia generado aleatoriamente. Si el tiempo de espera supera este límite, se dispara un evento de abandono que retira al cliente de la cola de forma segura.

4. **Ciclos de Trabajo y Descanso (`Server Breaks`):**
   * Los servidores alternan de forma autónoma entre períodos de trabajo y descanso. Si un servidor sale a descanso mientras atiende a un cliente, el servicio se pausa (calculando el tiempo restante) y se reanuda al regresar.

5. **Generadores Estadísticos Flexibles:**
   * Soporte para distribuciones Exponenciales, Uniformes, de Lista y Constantes tanto para llegadas, servicios, descansos y paciencia.

---

## 3. Funcionamiento y Lógica General del Sistema (Casos de Estudio)

A continuación se detalla la lógica de decisión (sí/no) implementada en el motor para resolver las diferentes reglas académicas de las Guías y Trabajos Prácticos (TP).

### 3.1 Flujo de Llegada de Clientes (Ruteo y Encolado)

Este flujo describe el camino de un cliente (o pieza) desde que ingresa al sistema, evaluando condiciones límite extraídas de los ejercicios:

```mermaid
flowchart TD
    Start([1. Cliente llega al Sistema]) --> CheckPatience0{"¿Paciencia del Cliente es 0? - Guía 4 - Ej 3: Piezas Desviadas"}
    
    %% Paciencia 0
    CheckPatience0 -->|Sí| Divert[El cliente se desvía / Abandona el sistema de inmediato]
    
    %% Paciencia > 0
    CheckPatience0 -->|No| CheckServer{"¿Servidor Ocupado o Ausente?"}
    
    %% Servidor Libre
    CheckServer -->|No| CheckSZ["¿Tiene Zona de Seguridad? - TP 1 - Ej 5"]
    CheckSZ -->|Sí| Travel["Cliente viaja al punto de servicio, demora travelTime"]
    Travel --> StartServ[Comenzar Servicio Inmediatamente]
    CheckSZ -->|No| StartServ
    
    %% Servidor Ocupado o Ausente
    CheckServer -->|Sí| CheckPriority["¿Tiene prioridad VIP? - TP 1 - Ej 4: Clientes VIP"]
    
    CheckPriority -->|Sí| EnqueueVIP["Se inserta en la cola VIP, frente de la fila"]
    CheckPriority -->|No| EnqueueNormal["Se inserta en la cola General, fondo de la fila"]
    
    EnqueueVIP & EnqueueNormal --> CheckAbandonment["¿Habilitar abandonos por impaciencia? - TP 1 - Ej 3 / Guía 4 - Ej 2"]
    
    CheckAbandonment -->|Sí| SchedAbandon[Programar evento de ABANDONO en T = llegada + paciencia]
    CheckAbandonment -->|No| WaitForever[El cliente espera en cola indefinidamente]
```

### 3.2 Flujo de Fin de Servicio y Descansos (Servidores)

Este flujo describe la lógica del servidor cuando termina una atención o cuando inicia/termina sus ciclos de descanso:

```mermaid
flowchart TD
    %% Evento Fin de Servicio
    EventEnd([2. Evento: Fin de Servicio]) --> CheckChained["¿Topología ENCADENADOS? - Guía 3 - Ej 3: Etapas Sucesivas"]
    
    CheckChained -->|Sí| CheckLastStage{"¿Es el último servidor?"}
    CheckLastStage -->|Sí| ExitSystem[Cliente sale del sistema]
    CheckLastStage -->|No| NextStage[Pasar cliente al servidor de la siguiente etapa]
    NextStage --> CheckNextFree["¿Siguiente Servidor Libre y Presente?"]
    CheckNextFree -->|Sí| StartNextServ[Comenzar servicio en etapa siguiente]
    CheckNextFree -->|No| EnqueueNextStage[Encolar en la fila de la etapa siguiente]
    
    CheckChained -->|No| ExitSystem
    
    %% Búsqueda de nuevo cliente
    ExitSystem & StartNextServ & EnqueueNextStage --> ServerSearch[Servidor busca nuevo cliente en cola]
    ServerSearch --> CheckQueue["¿Hay clientes esperando en cola?"]
    CheckQueue -->|Sí| DequeueClient["Tomar cliente - VIP primero - e iniciar servicio"]
    CheckQueue -->|No| SetIdle[Cambiar estado a LIBRE]
```

```mermaid
flowchart TD
    %% Evento de Descanso
    EventBreak([3. Eventos de Descanso del Servidor]) --> BranchBreak{¿Tipo de Evento?}
    
    %% Inicios del Descanso
    BranchBreak -->|"SALIDA_SERVIDOR - Inicio descanso"| CheckBusy{"¿El servidor está atendiendo?"}
    CheckBusy -->|Sí| PauseService[Calcular tiempo restante del servicio y guardar cliente]
    PauseService --> CancelFEL[Eliminar evento FIN_SERVICIO actual de la FEL]
    CancelFEL --> SetStateBreak[Cambiar estado a AUSENTE / BREAK]
    CheckBusy -->|No| SetStateBreak
    
    %% Fin del Descanso
    BranchBreak -->|"LLEGADA_SERVIDOR - Fin descanso"| CheckPaused["¿Tiene un servicio pausado? - TP 1 - Ej 2: Ciclo de Descanso"]
    
    CheckPaused -->|Sí| ResumeService[Reanudar cliente pausado con su tiempo restante]
    ResumeService --> SchedResume[Programar FIN_SERVICIO en la FEL]
    SchedResume --> SetStateBusy[Cambiar estado a OCUPADO]
    
    CheckPaused -->|No| SearchQueue["¿Hay clientes en cola?"]
    SearchQueue -->|Sí| TakeNew[Tomar cliente de la cola y comenzar servicio]
    SearchQueue -->|No| SetIdleBreak[Cambiar estado a LIBRE]
```

---

## 4. Ciclo de Vida General del Simulador

El motor de simulación opera bajo un reloj no lineal que salta de evento en evento según el orden de prioridad y tiempo definido en la **Lista de Eventos Futuros (FEL)**.

```mermaid
flowchart TD
    Start([Inicio de la Simulación]) --> Init[1. Inicializar Simulador]
    Init --> SetupQueues[Poblar Colas Iniciales con Clientes y programar sus abandonos]
    SetupQueues --> SetupServers[Establecer Estados de Servidores y programar sus primeros descansos]
    SetupServers --> ScheduleFirst[Programar Primeras Llegadas en FEL]
    ScheduleFirst --> CheckIdle["¿Hay servidores Libres?"]
    
    CheckIdle -->|Sí| AssignInitial[Asignar Clientes Iniciales de la cola]
    AssignInitial --> LoopStart
    CheckIdle -->|No| LoopStart
    
    %% Loop Principal
    subgraph Ciclo_DES [Ciclo Principal de Simulación - step]
        LoopStart{"¿Hay eventos en la FEL y tiempo <= maxTime?"}
        
        LoopStart -->|Sí| PopEvent[Obtener siguiente evento de la FEL]
        PopEvent --> AdvanceClock[Avanzar reloj al tiempo del evento]
        AdvanceClock --> ProcessEvent[Procesar Evento según su Tipo]
        
        ProcessEvent --> EvalCheckpoints[Evaluar Checkpoints y Condiciones]
        EvalCheckpoints --> RecordHistory[Registrar Historial y Métricas]
        RecordHistory --> LoopStart
    end
    
    LoopStart -->|"No o Fin de Eventos"| End([Fin de Simulación y Entrega de Resultados])
```

---

## 5. Diagrama de Flujo del Procesamiento de Eventos

Este diagrama detalla cómo reacciona el sistema ante cada tipo de evento en la FEL, reflejando las variaciones lógicas basadas en la configuración de la **Topología**, **Descansos** e **Impaciencia**.

```mermaid
flowchart TD
    %% Punto de partida del step
    EventDispatcher{Tipo de Evento}
    
    %% Flujo de LLEGADA / LLEGADA_VIP
    EventDispatcher -->|LLEGADA o LLEGADA_VIP| EvArrival[1. Crear Cliente]
    EvArrival --> IncArrivals[Incrementar total de llegadas]
    IncArrivals --> SchedNextArrival[Programar próxima llegada en FEL]
    
    SchedNextArrival --> RouteTopology{Topología Seleccionada}
    
    %% Cola Única
    RouteTopology -->|COLA_UNICA| CU_CheckFreeServer["¿Hay Servidor Libre y Presente?"]
    CU_CheckFreeServer -->|Sí| CU_CheckSZ["¿Zona de Seguridad activa?"]
    CU_CheckSZ -->|No| CU_StartService[Comenzar Servicio Inmediato]
    CU_CheckSZ -->|Sí| CU_Enqueue[Agregar a Cola vip o default]
    CU_CheckFreeServer -->|No| CU_Enqueue
    CU_Enqueue --> CU_SchedAbandon[Programar Evento ABANDONO si aplica]
    
    %% Aislados
    RouteTopology -->|AISLADOS| AIS_SelectServer[Seleccionar Servidor por ID o Aleatorio]
    AIS_SelectServer --> AIS_CheckFree["¿Servidor Libre y Presente?"]
    AIS_CheckFree -->|Sí| AIS_StartService[Comenzar Servicio en Servidor]
    AIS_CheckFree -->|No| AIS_Enqueue[Agregar a Cola del Servidor]
    AIS_Enqueue --> AIS_SchedAbandon[Programar Evento ABANDONO]
    
    %% Encadenados
    RouteTopology -->|ENCADENADOS| CH_Start{Etapa 1: Servidor 1}
    CH_Start --> CH_CheckFree["¿S1 Libre y Presente?"]
    CH_CheckFree -->|Sí| CH_StartService[Comenzar Servicio en S1]
    CH_CheckFree -->|No| CH_Enqueue[Agregar a Cola de S1]
    CH_Enqueue --> CH_SchedAbandon[Programar Evento ABANDONO]

    %% Flujo de FIN_SERVICIO
    EventDispatcher -->|FIN_SERVICIO| EvServiceEnd[2. Terminar Servicio del Servidor]
    EvServiceEnd --> IncServed[Registrar cliente atendido]
    IncServed --> ChainedCheck{"¿Topología ENCADENADOS y etapa < etapa_max?"}
    
    ChainedCheck -->|Sí| ChainedNextStage[Avanzar cliente a siguiente Servidor]
    ChainedNextStage --> ChainedNextFree["¿Siguiente Servidor Libre y Presente?"]
    ChainedNextFree -->|Sí| ChainedStartNext[Iniciar Servicio en siguiente Servidor]
    ChainedNextFree -->|No| ChainedEnqueueNext[Agregar a cola del siguiente Servidor]
    
    ChainedCheck -->|No| ExitSystem[Cliente sale del sistema definitivamente]
    
    ChainedStartNext & ChainedEnqueueNext & ExitSystem --> ServGetNext[Servidor busca nuevo cliente en cola]
    ServGetNext --> QueueCheck["¿Hay clientes en cola?"]
    QueueCheck -->|Sí| StartNextInQueue[Tomar primer cliente y comenzar servicio]
    QueueCheck -->|No| SetIdle[Cambiar Servidor a LIBRE]

    %% Flujo de SALIDA_SERVIDOR (Break Start)
    EventDispatcher -->|SALIDA_SERVIDOR| EvBreakStart[3. Servidor sale a descanso]
    EvBreakStart --> SetPresentFalse[Marcar servidor como ausente]
    SetPresentFalse --> SchedBreakEnd[Programar LLEGADA_SERVIDOR en FEL]
    SchedBreakEnd --> ServerBusyCheck["¿Estaba atendiendo cliente?"]
    ServerBusyCheck -->|Sí| PauseService[Calcular tiempo restante del servicio y guardar cliente]
    PauseService --> CancelServiceEnd[Eliminar evento FIN_SERVICIO actual de la FEL]
    CancelServiceEnd --> SetStateBreak[Cambiar estado a AUSENTE]
    ServerBusyCheck -->|No| SetStateBreak

    %% Flujo de LLEGADA_SERVIDOR (Break End)
    EventDispatcher -->|LLEGADA_SERVIDOR| EvBreakEnd[4. Servidor regresa de descanso]
    EvBreakEnd --> SetPresentTrue[Marcar servidor como presente]
    SetPresentTrue --> SchedBreakStart[Programar SALIDA_SERVIDOR en FEL]
    SchedBreakStart --> PausedCheck["¿Tenía un servicio pausado?"]
    PausedCheck -->|Sí| ResumeService[Cambiar a OCUPADO]
    ResumeService --> SchedResumeEnd[Programar FIN_SERVICIO con tiempo restante en FEL]
    PausedCheck -->|No| ServerGetNext[Servidor busca nuevo cliente en cola]

    %% Flujo de ABANDONO
    EventDispatcher -->|ABANDONO| EvAbandon[5. Procesar Impaciencia]
    EvAbandon --> FindClientQueue["¿Cliente sigue en cola?"]
    FindClientQueue -->|Sí| RemoveClient[Eliminar cliente de la cola]
    RemoveClient --> IncAbandoned[Incrementar contador de abandonados]
    FindClientQueue -->|No| DoNothing[Ignorar evento ya fue atendido o ya abandonó]
```

---

## 6. Estado de los Servidores: Ciclo Trabajo-Descanso (Pausa y Reanudación)

Una de las características más avanzadas y flexibles del motor es el manejo dinámico de las ausencias del servidor sin perder el progreso de la atención en curso.

```mermaid
stateDiagram-v2
    [*] --> LIBRE : Inicialización
    
    LIBRE --> OCUPADO : Llega cliente / Toma cliente de cola
    OCUPADO --> LIBRE : Finaliza servicio (FIN_SERVICIO)
    
    state Ocupado_Ausente {
        [*] --> Pausado : Guarda cliente y calcula tiempo restante
        Pausado --> [*] : Regresa del descanso
    }

    OCUPADO --> Ocupado_Ausente : Inicia Descanso (SALIDA_SERVIDOR)
    Ocupado_Ausente --> OCUPADO : Fin de Descanso (LLEGADA_SERVIDOR)
    
    LIBRE --> AUSENTE : Inicia Descanso (SALIDA_SERVIDOR)
    AUSENTE --> LIBRE : Fin de Descanso (LLEGADA_SERVIDOR) y cola vacía
    AUSENTE --> OCUPADO : Fin de Descanso (LLEGADA_SERVIDOR) y hay clientes esperando
```

---

## 7. Ruteo de Clientes Según la Topología Seleccionada

Este diagrama ilustra cómo fluyen y se agrupan los clientes físicamente en las colas dependiendo de la flexibilidad de la topología elegida.

```mermaid
graph TD
    subgraph Cola_Unica [Topología: COLA ÚNICA]
        Clientes1[Llegada de Clientes] --> ColaVIP["Fila VIP - Prioridad"]
        Clientes1 --> ColaDefault["Fila General"]
        ColaVIP --> Dist[Distribuidor Central]
        ColaDefault --> Dist
        Dist --> S1_CU[Servidor 1]
        Dist --> S2_CU[Servidor 2]
    end

    subgraph Aislados [Topología: AISLADOS]
        Clientes2[Llegada de Clientes] --> Selector{Asignación}
        Selector -->|Servidor 1| Queue1["Cola Servidor 1"]
        Queue1 --> S1_AIS[Servidor 1]
        Selector -->|Servidor 2| Queue2["Cola Servidor 2"]
        Queue2 --> S2_AIS[Servidor 2]
    end

    subgraph Encadenados [Topología: ENCADENADOS]
        Clientes3[Llegada de Clientes] --> Stage1["Cola Etapa 1"]
        Stage1 --> S1_CH[Servidor 1]
        S1_CH --> Stage2["Cola Etapa 2"]
        Stage2 --> S2_CH[Servidor 2]
        S2_CH --> SalidaChained([Salida del Sistema])
    end
```
