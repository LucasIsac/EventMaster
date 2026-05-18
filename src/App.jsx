import { useState, useCallback, useEffect, useRef } from 'react';
import { Simulator, formatTime } from './engine/Simulator';
import { ConfigPanel } from './components/ConfigPanel';
import { ControlPanel } from './components/ControlPanel';
import { StatsPanel } from './components/StatsPanel';
import { AdvancedTable } from './components/AdvancedTable';
import { CheckpointsModal } from './components/CheckpointsModal';
import './App.css';

function App() {
  const [config, setConfig] = useState({
    maxTime: 3600, // 1 hora de simulación
    startTime: 28800, // 08:00:00
    arrivalInterval: '60 - 120',
    serviceTime: '45 - 90',
    workTime: '600 - 1200',
    restTime: '60 - 180',
    maxWaitTime: '600', // 10 min por defecto
    travelTime: '0',
    topology: 'COLA_UNICA',
    numServers: 1
  });
  
  const [flags, setFlags] = useState({
    hasServerBreaks: true,
    hasClientAbandonment: true,
    hasPriority: false,
    hasSecurityZone: false
  });
  
  const [initialState, setInitialState] = useState({
    clientsInQueue: 0,
    vipClientsInQueue: 0,
    initialWaitTime: 0,
    serverBusy: false,
    busyUntil: 0
  });
  
  // Referencias al motor de simulación y el estado actual capturado
  const [simulator, setSimulator] = useState(null);
  const [currentState, setCurrentState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [speed, setSpeed] = useState(100);
  const [checkpointRules, setCheckpointRules] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const intervalRef = useRef(null);

  /**
   * Inicializa una nueva instancia del simulador con la configuración actual.
   */
  const initialize = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    
    const adjustedConfig = { ...config };
    
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
    const interval = Math.max(10, 500 / speed);
    intervalRef.current = setInterval(() => {
      if (simulator.isFinished()) {
        clearInterval(intervalRef.current);
        setIsRunning(false);
        setCurrentState(simulator.getCurrentState());
        return;
      }
      simulator.step();
      setCurrentState(simulator.getCurrentState());
    }, interval);
  }, [simulator, speed]);

  /**
   * Reinicia todo el sistema a su estado original.
   */
  const resetAll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setHasStarted(false);
    setSimulator(null);
    setCurrentState(null);
  }, []);

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
  }, []);

  // Limpieza de intervalos al desmontar el componente
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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
   * Calcula el porcentaje de utilización del servidor.
   */
  const calculateUtilization = () => {
    if (!currentState) return '0.0';
    const totalTime = currentState.clock - config.startTime;
    if (totalTime <= 0) return '0.0';

    // Si es un rango, intentamos usar un valor medio para la estimación visual rápida
    let svcTime = parseFloat(config.serviceTime);
    if (String(config.serviceTime).includes(' - ')) {
      const parts = String(config.serviceTime).split(' - ').map(parseFloat);
      svcTime = (parts[0] + parts[1]) / 2;
    }

    const busyTime = currentState.stats.clientsServed * svcTime;
    return (busyTime / totalTime * 100).toFixed(1);
  };

  /**
   * Calcula el progreso de la simulación para la barra visual.
   */
  const getProgress = () => {
    if (!currentState) return 0;
    const total = config.startTime + config.maxTime;
    const current = currentState.clock;
    return Math.min(100, (current / total) * 100);
  };

  /**
   * Exporta el historial de la simulación a un archivo CSV.
   */
  const exportResults = () => {
    if (!currentState || currentState.history.length === 0) return;
    const csv = [
      ['Paso', 'Hora', 'Evento', 'Estado PS', 'Cola', 'Atendidos', 'Abandonados'].join(','),
      ...currentState.history.map(h => [
        h.step,
        formatTime(h.time),
        h.eventType,
        h.serverState === 'LIBRE' ? '0' : h.serverState === 'OCUPADO' ? '1' : 'A',
        h.queueLength,
        currentState.stats.clientsServed,
        currentState.stats.clientsAbandoned
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulacion_resultados.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>EventMaster - Simulador de Colas</h1>
        <p>SIMULACIÓN DE EVENTOS DISCRETOS</p>
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
          calculateUtilization={calculateUtilization} 
          formatTime={formatTime} 
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
                <h2>📊 Tabla de Simulación de Eventos Discretos</h2>
                {!currentState || currentState.history.length === 0 ? (
                  <p className="empty">Inicialice y ejecute la simulación</p>
                ) : (
                  <AdvancedTable 
                    history={currentState.history} 
                    flags={flags}
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
