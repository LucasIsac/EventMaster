import { useState, useCallback, useEffect, useRef } from 'react';
import { Simulator, formatTime } from './engine/Simulator';
import { ConfigPanel } from './components/ConfigPanel';
import { academicPresets } from './presets';
import { ControlPanel } from './components/ControlPanel';
import { StatsPanel } from './components/StatsPanel';
import { AdvancedTable } from './components/AdvancedTable';
import { CheckpointsModal } from './components/CheckpointsModal';
import { scaleTimeString } from './utils/timeParser';
import { BarChart2 } from 'lucide-react';
import './App.css';

function App() {
  const [activePreset, setActivePreset] = useState('default');
  const [config, setConfig] = useState(academicPresets.default.config);
  const [flags, setFlags] = useState(academicPresets.default.flags);
  const [initialState, setInitialState] = useState(academicPresets.default.initialState);
  const [vocab, setVocab] = useState(academicPresets.default.vocab);
  
  // Referencias al motor de simulación y el estado actual capturado
  const [simulator, setSimulator] = useState(null);
  const [currentState, setCurrentState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [checkpointRules, setCheckpointRules] = useState(academicPresets.default.checkpointRules);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const intervalRef = useRef(null);

  const applyPreset = useCallback((presetId) => {
    const preset = academicPresets[presetId];
    if (!preset) return;
    setActivePreset(presetId);
    setConfig(preset.config);
    setFlags(preset.flags);
    setInitialState(preset.initialState);
    setCheckpointRules(preset.checkpointRules);
    setVocab(preset.vocab);
  }, []);

  /**
   * Inicializa una nueva instancia del simulador con la configuración actual.
   */
  const initialize = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    
    const adjustedConfig = { ...config };
    if (adjustedConfig.timeUnit === 'min') {
      const keysToScale = ['arrivalInterval', 'serviceTime', 'workTime', 'restTime', 'travelTime', 'maxWaitTime'];
      keysToScale.forEach(k => {
        if (adjustedConfig[k]) {
          adjustedConfig[k] = scaleTimeString(adjustedConfig[k], 60);
        }
      });
    }
    
    const sim = new Simulator(adjustedConfig, flags, initialState);

    // Convertir las reglas visuales a Checkpoints en el motor
    checkpointRules.forEach(rule => {
      if (rule.type === 'interval') {
        const interval = rule.value;
        const totalSimTime = adjustedConfig.maxTime;
        const totalTriggers = Math.floor(totalSimTime / interval);
        for(let i=1; i<=totalTriggers; i++) {
          sim.addCheckpoint(`${rule.label} (#${i})`, s => s.clock >= s.config.startTime + (i * interval));
        }
      } else if (rule.type === 'absolute') {
        sim.addCheckpoint(rule.label, s => s.clock >= s.config.startTime + rule.value);
      } else if (rule.type === 'break') {
        sim.addCheckpoint(rule.label, s => {
          const lastEvent = s.history[s.history.length - 1];
          return lastEvent && lastEvent.eventType === 'SALIDA_SERVIDOR';
        }, true);
      } else if (rule.type === 'abandon') {
        sim.addCheckpoint(rule.label, s => {
          const lastEvent = s.history[s.history.length - 1];
          return lastEvent && lastEvent.eventType === 'ABANDONO' && 
                 s.stats.clientsAbandoned > 0 && 
                 s.stats.clientsAbandoned % rule.value === 0;
        }, true);
      } else if (rule.type === 'break_n') {
        sim.addCheckpoint(rule.label, s => {
          const lastEvent = s.history[s.history.length - 1];
          return lastEvent && lastEvent.eventType === 'SALIDA_SERVIDOR' && s.stats.workCycles === rule.value;
        }, false);
      } else if (rule.type === 'break_end_n') {
        sim.addCheckpoint(rule.label, s => {
          const lastEvent = s.history[s.history.length - 1];
          return lastEvent && lastEvent.eventType === 'LLEGADA_SERVIDOR' && s.stats.restCycles === rule.value;
        }, false);
      } else if (rule.type === 'served_n') {
        sim.addCheckpoint(rule.label, s => {
          const lastEvent = s.history[s.history.length - 1];
          return lastEvent && lastEvent.eventType === 'FIN_SERVICIO' && s.stats.clientsServed === rule.value;
        }, false);
      } else if (rule.type === 'abandon_n') {
        sim.addCheckpoint(rule.label, s => {
          const lastEvent = s.history[s.history.length - 1];
          return lastEvent && lastEvent.eventType === 'ABANDONO' && s.stats.clientsAbandoned === rule.value;
        }, false);
      }
    });

    setSimulator(sim);
    setCurrentState(sim.getCurrentState());
    setHasStarted(true);
  }, [config, flags, initialState, checkpointRules]);

  /**
   * Avanza un único paso (un evento) en la simulación.
   */
  const step = useCallback(() => {
    if (!simulator) return;
    if (simulator.isFinished()) {
      setIsRunning(false);
      setCurrentState(simulator.getCurrentState());
      return;
    }
    simulator.step();
    setCurrentState(simulator.getCurrentState());
  }, [simulator]);

  /**
   * Ejecuta la simulación de forma continua a una velocidad determinada.
   */
  const run = useCallback(() => {
    if (!simulator) return;
    setIsRunning(true);
  }, [simulator]);

  /**
   * Reinicia todo el sistema a su estado original.
   */
  const resetAll = useCallback(() => {
    setIsRunning(false);
    setHasStarted(false);
    setSimulator(null);
    setCurrentState(null);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  // Control de la ejecución en segundo plano (intervalo de simulación) con cambio dinámico de velocidad y agrupamiento (batching) de pasos a altas velocidades
  useEffect(() => {
    if (!isRunning || !simulator) return;

    // A partir de 10x, agrupamos pasos para no saturar los re-renders de React (mínimo 50ms de intervalo)
    const intervalTime = Math.max(50, 500 / speed);
    const stepsPerTick = speed > 10 ? Math.ceil(speed / 10) : 1;

    intervalRef.current = setInterval(() => {
      let finished = false;
      for (let i = 0; i < stepsPerTick; i++) {
        if (simulator.isFinished()) {
          finished = true;
          break;
        }
        simulator.step();
      }

      setCurrentState(simulator.getCurrentState());

      if (finished) {
        setIsRunning(false);
      }
    }, intervalTime);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, speed, simulator]);

  // Manejo de atajos de teclado para facilitar el uso del simulador
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'i' || e.key === 'I') initialize();
      else if (e.key === 'p' || e.key === 'P') isRunning ? pause() : run();
      else if (e.key === 's' || e.key === 'S') step();
      else if (e.key === 'r' || e.key === 'R') resetAll();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initialize, run, step, isRunning, resetAll, pause]);

  const updateConfig = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));
  const updateFlags = (key, value) => setFlags(prev => ({ ...prev, [key]: value }));
  const updateInitialState = (key, value) => setInitialState(prev => ({ ...prev, [key]: value }));

  /**
   * Genera una configuración aleatoria razonable para pruebas rápidas.
   */
  const generateRandomScenario = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      arrivalInterval: '30 - 90',
      serviceTime: '20 - 60',
      workTime: '600 - 1200',
      restTime: '60 - 180',
      travelTime: '5 - 15',
      maxWaitTime: '120 - 300'
    }));
    setFlags({
      hasServerBreaks: Math.random() > 0.5,
      hasClientAbandonment: Math.random() > 0.5,
      hasPriority: Math.random() > 0.5,
      hasSecurityZone: Math.random() > 0.5
    });
  }, []);



  /**
   * Calcula el progreso de la simulación para la barra visual.
   */
  const getProgress = () => {
    if (!currentState) return 0;
    const total = config.maxTime;
    const current = currentState.clock - config.startTime;
    if (total <= 0) return 100;
    return Math.min(100, (current / total) * 100);
  };

  /**
   * Exporta el historial de la simulación a un archivo CSV, replicando la estructura de la tabla de la interfaz.
   */
  const exportResults = () => {
    if (!currentState || currentState.history.length === 0) return;

    const history = currentState.history;
    const numServers = history.length > 0 ? history[0].servers.length : 1;
    const isMultiServer = numServers > 1;
    const topology = config?.topology || 'COLA_UNICA';
    const isSingleQueue = topology === 'COLA_UNICA';
    const isIsolated = topology === 'AISLADOS';

    const getMaxQueueSize = () => {
      if (!history.length) return 3;
      const maxInHistory = Math.max(3, ...history.map(h => h.queueLength || 0));
      return Math.min(maxInHistory, 4);
    };

    const maxQueue = getMaxQueueSize();

    const getServerStateCode = (s) => {
      if (s.state === 'OCUPADO') return '1';
      if (s.state === 'AUSENTE') return 'A';
      return '0';
    };

    const getFelEvents = (entry) => {
      const events = {
        nextArrival: isIsolated ? Array(numServers).fill(null) : null,
        nextServiceEnds: Array(numServers).fill(null)
      };
      if (!entry.fel) return events;
      for (const event of entry.fel) {
        if (event.type === 'LLEGADA' || event.type === 'LLEGADA_VIP') {
          if (isIsolated) {
            const sId = event.data?.serverId;
            if (sId && !events.nextArrival[sId - 1]) events.nextArrival[sId - 1] = event.time;
          } else {
            if (!events.nextArrival) events.nextArrival = event.time;
          }
        } else if (event.type === 'FIN_SERVICIO') {
          const sId = event.data?.serverId;
          if (sId && !events.nextServiceEnds[sId - 1]) {
            events.nextServiceEnds[sId - 1] = event.time;
          }
        }
      }
      return events;
    };

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Usamos punto y coma como separador y lo escapamos adecuadamente
      if (str.includes(';') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // 1. Crear Cabeceras
    const headers = [];
    headers.push('Hora actual');

    if (isIsolated) {
      for (let i = 0; i < numServers; i++) {
        headers.push(`Próx. Llegada S${i + 1}`);
      }
    } else {
      headers.push('Próx. Llegada');
    }

    for (let i = 0; i < numServers; i++) {
      headers.push(isMultiServer ? `Fin Servicio S${i + 1}` : 'Fin Servicio');
    }

    if (isSingleQueue) {
      headers.push('Cola');
    } else {
      for (let i = 0; i < numServers; i++) {
        headers.push(`Cola S${i + 1}`);
      }
    }

    for (let i = 0; i < numServers; i++) {
      headers.push(isMultiServer ? `Estado S${i + 1}` : 'Estado');
    }

    if (flags.hasServerBreaks) {
      if (isMultiServer) {
        for (let i = 0; i < numServers; i++) {
          headers.push(`S${i + 1} Desc`);
          headers.push(`S${i + 1} Trab`);
          headers.push(`P${i + 1}`);
        }
      } else {
        headers.push('Hora Desc.');
        headers.push('Hora Trab.');
        headers.push('Presencia');
      }
    }

    if (flags.hasClientAbandonment) {
      headers.push('Hora Aband.');
      for (let i = 0; i < maxQueue; i++) {
        headers.push(`C${i + 1}`);
      }
    }

    headers.push('Evento');

    // 2. Mapear Filas
    const rows = history.map(entry => {
      const row = [];
      const felEvents = getFelEvents(entry);

      // Hora actual
      row.push(formatTime(entry.time));

      // Próx. Llegada
      if (isIsolated) {
        for (let i = 0; i < numServers; i++) {
          const t = felEvents.nextArrival[i];
          row.push(t ? formatTime(t) : '-');
        }
      } else {
        row.push(felEvents.nextArrival ? formatTime(felEvents.nextArrival) : '-');
      }

      // Fin Servicio
      for (let i = 0; i < numServers; i++) {
        const t = felEvents.nextServiceEnds[i];
        row.push(t ? formatTime(t) : '-');
      }

      // Cola
      if (isSingleQueue) {
        row.push(entry.queueLength);
      } else {
        for (let i = 0; i < numServers; i++) {
          row.push(entry.servers[i].queue?.length || 0);
        }
      }

      // Estado PS
      for (let i = 0; i < numServers; i++) {
        row.push(getServerStateCode(entry.servers[i]));
      }

      // Descansos
      if (flags.hasServerBreaks) {
        if (isMultiServer) {
          for (let i = 0; i < numServers; i++) {
            const s = entry.servers[i];
            row.push(s.nextBreakTime ? formatTime(s.nextBreakTime) : '-');
            row.push(s.nextWorkTime ? formatTime(s.nextWorkTime) : '-');
            row.push(s.present ? 'P' : 'A');
          }
        } else {
          row.push(entry.servers[0].nextBreakTime ? formatTime(entry.servers[0].nextBreakTime) : '-');
          row.push(entry.servers[0].nextWorkTime ? formatTime(entry.servers[0].nextWorkTime) : '-');
          row.push(entry.servers[0].present ? 'P' : 'A');
        }
      }

      // Abandonos
      if (flags.hasClientAbandonment) {
        row.push(entry.eventType === 'ABANDONO' ? formatTime(entry.time) : '-');
        for (let ci = 0; ci < maxQueue; ci++) {
          const client = entry.queueClients?.[ci];
          const abandonTime = client && client.patienceTime !== Infinity
            ? client.arrivalTime + client.patienceTime : null;
          row.push(abandonTime && ci < entry.queueLength ? formatTime(abandonTime) : '-');
        }
      }

      // Evento
      row.push(entry.eventType);

      return row.map(escapeCSV).join(';');
    });

    // Indicamos explícitamente a Excel el separador utilizado mediante sep=;
    const csvContent = "\ufeffsep=;\n" + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacion_resultados_${topology.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Event<span>Master</span></h1>
        <p>Simulador de Eventos Discretos · Sistemas de Colas</p>
      </header>

      <main className="main">
        <ConfigPanel 
          config={config} 
          flags={flags} 
          initialState={initialState} 
          updateConfig={updateConfig} 
          updateFlags={updateFlags} 
          updateInitialState={updateInitialState} 
          checkpointRules={checkpointRules}
          setCheckpointRules={setCheckpointRules}
          generateRandomScenario={generateRandomScenario}
          activePreset={activePreset}
          applyPreset={applyPreset}
        />

        <ControlPanel 
          getProgress={getProgress} 
          speed={speed} 
          setSpeed={setSpeed} 
          initialize={initialize} 
          step={step} 
          run={run} 
          pause={pause} 
          resetAll={resetAll} 
          exportResults={exportResults} 
          hasStarted={hasStarted} 
          isRunning={isRunning} 
          currentState={currentState} 
          openModal={() => setIsModalOpen(true)}
        />

        <StatsPanel 
          currentState={currentState} 
          flags={flags} 
          formatTime={formatTime} 
          vocab={vocab}
          startTime={config.startTime}
        />

        {(() => {
          const ns = parseInt(config.numServers) || 1;
          const colCount = 5 + ns * 2
            + (flags.hasServerBreaks ? 3 : 0)
            + (flags.hasClientAbandonment ? 4 : 0);
          const expanded = colCount > 9;
          return (
            <section className={`results-section${expanded ? ' results-expanded' : ''}`}>
              <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={24} className="inline-icon" /> 
                  Tabla de Simulación de Eventos Discretos
                </h2>
                {!currentState || currentState.history.length === 0 ? (
                  <p className="empty">Inicialice y ejecute la simulación</p>
                ) : (
                  <AdvancedTable 
                    history={currentState.history} 
                    flags={flags}
                    config={config}
                    vocab={vocab}
                  />
                )}
              </div>
            </section>
          );
        })()}
      </main>

      <CheckpointsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        checkpoints={currentState?.checkpoints} 
        formatTime={formatTime}
        startTime={config.startTime}
      />
    </div>
  );
}

export default App;
