export const academicPresets = {
  pago_online: {
    label: "Sitio de Pago On Line (Caídas y Pérdida de Claves)",
    vocab: { client: "Claves", arrive: "Ingresa clave", served: "Encriptadas", abandon: "Perdidas" },
    config: {
      maxTime: 3600,
      startTime: 0,
      arrivalInterval: '1.24 - 1.38',
      serviceTime: '1.20 - 3.32',
      workTime: '126 - 258',
      restTime: '25 - 32',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: 'SINGLE_QUEUE',
      numServers: 1
    },
    flags: {
      hasServerBreaks: true,
      catastrophicBreakdown: true,
      hasClientAbandonment: false,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: []
  },
  parcial_aceitunas: {
    label: "Clasificadora de Aceitunas",
    vocab: { client: "Aceitunas", arrive: "Llega a tolva", served: "Clasificadas", abandon: "Descartes" },
    config: {
      maxTime: 28800,
      startTime: 0,
      arrivalInterval: '3 - 5',
      serviceTime: '4 - 6',
      workTime: '14400 - 21600',
      restTime: '3600',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: true,
      catastrophicBreakdown: true,
      hasClientAbandonment: false,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: []
  },
  aeropuerto: {
    label: "Aeropuerto (Pista Única)",
    vocab: { client: "Aviones", arrive: "solicita pista", served: "Usaron pista", abandon: "Desviados" },
    config: {
      maxTime: 3600,
      startTime: 0,
      arrivalInterval: '120 - 240',
      serviceTime: '660 - 1260',
      workTime: '0',
      restTime: '0',
      maxWaitTime: 'Infinity',
      travelTime: '660',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: false,
      hasPriority: true,
      hasSecurityZone: true,
      vipSkipsSecurityZone: true,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: []
  },
  default: {
    label: "Simulación Básica",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 28800,
      arrivalInterval: '60 - 120',
      serviceTime: '45 - 90',
      workTime: '600 - 1200',
      restTime: '60 - 180',
      maxWaitTime: '600',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: true,
      hasClientAbandonment: true,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: []
  },
  guia4_ej3: {
    label: "Guía 4 - Problema 3 (Piezas Desviadas)",
    vocab: { client: "Piezas", arrive: "llega", served: "Procesadas", abandon: "Desviadas" },
    config: {
      maxTime: 7200, // 120 min
      startTime: 0,
      arrivalInterval: '30 - 90',
      serviceTime: '20 - 60',
      workTime: '0',
      restTime: '0',
      maxWaitTime: '0', // Paciencia 0
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: true,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: [
      { id: 'cp-1', type: 'absolute', value: 7200, label: 'Al finalizar (120 min)' }
    ]
  },
  guia4_ej1_a: {
    label: "Guía 4 - Problema 1 (Esc. A: q=100, wait=10s)",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 0,
      arrivalInterval: '60',
      serviceTime: '60',
      workTime: '60',
      restTime: '60',
      maxWaitTime: '600',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: true,
      hasClientAbandonment: true,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 100,
      vipClientsInQueue: 0,
      initialWaitTime: 10,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: [
      { id: 'cp-ej1a-3600', type: 'absolute', value: 3600, label: 'Al cabo de 1 hora (3600s)' },
      { id: 'cp-ej1a-break2', type: 'break_n', value: 2, label: 'Inicio del 2° descanso' }
    ]
  },
  guia4_ej1_b: {
    label: "Guía 4 - Problema 1 (Esc. B: q=0, ps=0, S=1)",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 0,
      arrivalInterval: '60',
      serviceTime: '60',
      workTime: '60',
      restTime: '60',
      maxWaitTime: '600',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: true,
      hasClientAbandonment: true,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: [
      { id: 'cp-ej1b-3600', type: 'absolute', value: 3600, label: 'Al cabo de 1 hora (3600s)' },
      { id: 'cp-ej1b-break2', type: 'break_n', value: 2, label: 'Inicio del 2° descanso' }
    ]
  },
  guia4_ej2: {
    label: "Guía 4 - Problema 2 (Máquinas y Descartes)",
    vocab: { client: "Piezas", arrive: "producida", served: "Procesadas", abandon: "Descartes" },
    config: {
      maxTime: 7200,
      startTime: 0,
      arrivalInterval: '60',
      serviceTime: '40 - 60',
      workTime: '300',
      restTime: '30',
      maxWaitTime: '180',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: true,
      hasClientAbandonment: true,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: [
      { id: 'cp-ej2-7200', type: 'absolute', value: 7200, label: 'Al cabo de 2 horas (7200s)' }
    ]
  },
  guia4_ej4: {
    label: "Guía 4 - Problema 4 (Carpintero)",
    vocab: { client: "Sillas", arrive: "cargada", served: "Terminadas", abandon: "Rechazadas" },
    config: {
      maxTime: 21600, // 6 horas
      startTime: 0,
      arrivalInterval: '0',
      serviceTime: '1800 - 2400, 600 - 1200, 300 - 1800',
      workTime: '0',
      restTime: '0',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: 'ENCADENADOS',
      numServers: 3,
      singleWorkerStrategy: 'silla_por_silla'
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: false,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: true,
      singleWorkerChained: true
    },
    initialState: {
      clientsInQueue: 6,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: []
  },
  tp1_ej1: {
    label: "TP 1 - Problema 1 (Fila Única)",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 28800,
      arrivalInterval: '45',
      serviceTime: '40',
      workTime: '0',
      restTime: '0',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: false,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 3,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: true,
      busyUntil: 180,
      firstArrivalTimes: [300]
    },
    checkpointRules: []
  },
  tp1_ej2: {
    label: "TP 1 - Problema 2 (Ciclo de Descanso)",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 37800,
      arrivalInterval: '65, 6, 2, 21, 42',
      serviceTime: '5, 10',
      workTime: '30',
      restTime: '60',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: true,
      hasClientAbandonment: false,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0,
      firstArrivalTimes: [20]
    },
    checkpointRules: []
  },
  tp1_ej3: {
    label: "TP 1 - Problema 3 (Abandono de Cola)",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 32432,
      arrivalInterval: '10, 5, 7, 7, 107, 24',
      serviceTime: '50, 76',
      workTime: '0',
      restTime: '0',
      maxWaitTime: '120',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: true,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: true,
      busyUntil: 35,
      firstArrivalTimes: [17]
    },
    checkpointRules: []
  },
  tp1_ej4: {
    label: "TP 1 - Problema 4 (Clientes con Prioridad)",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 0,
      arrivalInterval: '30 - 90',
      serviceTime: '20 - 60',
      workTime: '0',
      restTime: '0',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: false,
      hasPriority: true,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: []
  },
  tp1_ej5: {
    label: "TP 1 - Problema 5 (Zona de Seguridad)",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 0,
      arrivalInterval: '30 - 90',
      serviceTime: '20 - 60',
      workTime: '0',
      restTime: '0',
      maxWaitTime: 'Infinity',
      travelTime: '10',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: false,
      hasPriority: false,
      hasSecurityZone: true,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: []
  },
  guia3_ej1: {
    label: "Guía 3 - Problema 1 (3 Sub-sistemas Aislados)",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 28800,
      arrivalInterval: '45, 25, 15',
      serviceTime: '40, 20, 10',
      workTime: '0',
      restTime: '0',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: 'AISLADOS',
      numServers: 3
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: false,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0,
      serversInitialState: [
        { busy: true, busyUntil: 180, queueLength: 4 },
        { busy: true, busyUntil: 230, queueLength: 4 },
        { busy: true, busyUntil: 240, queueLength: 4 }
      ],
      firstArrivalTimes: [300, 255, 258]
    },
    checkpointRules: []
  },
  guia3_ej2: {
    label: "Guía 3 - Problema 2 (3 Servidores, Cola Única)",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 37800,
      arrivalInterval: '60, 6, 15, 2, 13',
      serviceTime: '11, 12, 14',
      workTime: '0',
      restTime: '0',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 3
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: false,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0,
      serversInitialState: [
        { busy: true, busyUntil: 60, queueLength: 4 },
        { busy: true, busyUntil: 70, queueLength: 0 },
        { busy: true, busyUntil: 90, queueLength: 0 }
      ],
      firstArrivalTimes: [20]
    },
    checkpointRules: []
  },
  guia3_ej3: {
    label: "Guía 3 - Problema 3 (3 Etapas Sucesivas)",
    vocab: { client: "Clientes", arrive: "llega", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 3600,
      startTime: 37800,
      arrivalInterval: '35, 16, 41, 69',
      serviceTime: '20, 11, 7',
      workTime: '0',
      restTime: '0',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: 'ENCADENADOS',
      numServers: 3
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: false,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0,
      serversInitialState: [
        { busy: true, busyUntil: 60, queueLength: 2 },
        { busy: true, busyUntil: 70, queueLength: 1 },
        { busy: true, busyUntil: 90, queueLength: 3 }
      ],
      firstArrivalTimes: [20]
    },
    checkpointRules: []
  },
  parcial_2018_tandem: {
    label: "Aeropuerto Tándem (3 Rampas)",
    vocab: { client: "Avión", arrive: "Llega de Rampa/Cielo", served: "Despegó/Aterrizó", abandon: "Desviados" },
    config: {
      maxTime: 14400,
      startTime: 0,
      arrivalInterval: '3600',
      serviceTime: '1200 - 2400',
      vipServiceTime: '600',
      rampBoardingTime: '2400 - 4800',
      numRamps: 3,
      workTime: '0',
      restTime: '0',
      maxWaitTime: 'Infinity',
      travelTime: '0',
      topology: 'COLA_UNICA',
      numServers: 1
    },
    flags: {
      hasTandemRamps: true,
      hasPriority: true,
      hasServerBreaks: false,
      hasClientAbandonment: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: []
  },
  nuevo_ejercicio_totem: {
    label: "Ejercicio Tótem-Consultorios",
    vocab: { client: "Pacientes", arrive: "llega al tótem", served: "Atendidos", abandon: "Abandonos" },
    config: {
      maxTime: 28800,
      startTime: 0,
      arrivalInterval: '120',
      serviceTime: '300 - 360',
      specialistServiceTime: '900 - 1200',
      workTime: '0',
      restTime: '0',
      maxWaitTime: '600',
      travelTime: '0',
      topology: 'TOTEM_SPECIALISTS',
      numServers: 3,
      specialistSeats: 10,
      balkingProbability: 1.0
    },
    flags: {
      hasServerBreaks: false,
      hasClientAbandonment: true,
      hasPriority: false,
      hasSecurityZone: false,
      disableArrivals: false
    },
    initialState: {
      clientsInQueue: 0,
      vipClientsInQueue: 0,
      initialWaitTime: 0,
      serverBusy: false,
      busyUntil: 0
    },
    checkpointRules: []
  }
};
