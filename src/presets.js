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
  }
};
