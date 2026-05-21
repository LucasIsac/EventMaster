export const academicPresets = {
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
      serviceTime: '2700 - 5400',
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
      disableArrivals: true
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
  }
};
