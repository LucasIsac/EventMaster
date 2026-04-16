import { useState, useCallback, useEffect, useRef } from 'react';
import { Simulator } from './engine/Simulator';
import './App.css';

function App() {
  const [config, setConfig] = useState({
    maxTime: 600,
    startTime: 28800,
    arrivalInterval: '45',
    serviceTime: '40',
    workTime: 0,
    restTime: 0,
    maxWaitTime: Infinity,
    travelTime: 0
  });
  
  const [flags, setFlags] = useState({
    hasServerBreaks: false,
    hasClientAbandonment: false,
    hasPriority: false,
    hasSecurityZone: false
  });
  
  const [initialState, setInitialState] = useState({
    clientsInQueue: 0,
    serverBusy: false,
    busyUntil: 0
  });
  
  const [simulator, setSimulator] = useState(null);
  const [currentState, setCurrentState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [speed, setSpeed] = useState(100);
  const [showHelp, setShowHelp] = useState(false);
  const intervalRef = useRef(null);

  const initialize = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    
    const adjustedConfig = { ...config };
    if (config.startTime > 0) {
      adjustedConfig.maxTime = config.startTime + config.maxTime;
    }
    
    const sim = new Simulator(adjustedConfig, flags, initialState);
    setSimulator(sim);
    setCurrentState(sim.getCurrentState());
    setHasStarted(true);
  }, [config, flags, initialState]);

  const step = useCallback(() => {
    if (!simulator) return;
    if (simulator.isFinished()) {
      setIsRunning(false);
      return;
    }
    simulator.step();
    setCurrentState(simulator.getCurrentState());
  }, [simulator]);

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

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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

  const calculateUtilization = () => {
    if (!currentState) return '0.0';
    const totalTime = currentState.clock - config.startTime;
    if (totalTime <= 0) return '0.0';
    const busyTime = currentState.stats.clientsServed * config.serviceTime;
    return (busyTime / totalTime * 100).toFixed(1);
  };

  const formatTimeInput = (seconds, isRelative = false) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00:00';
    const absSeconds = isRelative ? config.startTime + seconds : seconds;
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = absSeconds % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const parseTime = (str, asRelative = false) => {
    if (!str || typeof str !== 'string') return 0;
    const parts = str.split(':').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const absTime = parts[0] * 3600 + parts[1] * 60 + parts[2];
      return asRelative ? absTime - config.startTime : absTime;
    }
    if (parts.length === 2 && !parts.some(isNaN)) {
      const absTime = parts[0] * 3600 + parts[1] * 60;
      return asRelative ? absTime - config.startTime : absTime;
    }
    return 0;
  };

  const getProgress = () => {
    if (!currentState) return 0;
    const total = config.startTime + config.maxTime;
    const current = currentState.clock;
    return Math.min(100, (current / total) * 100);
  };

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
        <section className="config-section">
          <div className="card">
            <div className="config-grid">
              <div className="config-group">
                <h3>Tiempo</h3>
                <label>
                  <span>Duración (segundos)</span>
                  <input type="number" value={config.maxTime} onChange={(e) => updateConfig('maxTime', parseInt(e.target.value) || 0)} />
                </label>
                <label>
                  <span>Hora inicio (HH:MM:SS)</span>
                  <input 
                    type="text" 
                    value={config.startTime === 0 ? '00:00:00' : formatTimeInput(config.startTime)} 
                    onChange={(e) => updateConfig('startTime', parseTime(e.target.value))}
                    placeholder="00:00:00"
                  />
                </label>
              </div>

              <div className="config-group">
                <h3>ΔtLL</h3>
                <label>
                  <span>Intervalo llegada (ej: 45 o 65,6,2,21)</span>
                  <input type="text" value={config.arrivalInterval} onChange={(e) => updateConfig('arrivalInterval', e.target.value)} />
                </label>
              </div>

              <div className="config-group">
                <h3>ΔtS</h3>
                <label>
                  <span>Tiempo servicio (ej: 40 o 30,50,25)</span>
                  <input type="text" value={config.serviceTime} onChange={(e) => updateConfig('serviceTime', e.target.value)} />
                </label>
              </div>

              <div className="config-group">
                <h3>Estado Inicial</h3>
                <label>
                  <span>Clientes en cola</span>
                  <input type="number" value={initialState.clientsInQueue} onChange={(e) => updateInitialState('clientsInQueue', parseInt(e.target.value) || 0)} />
                </label>
                <label className="checkbox">
                  <input type="checkbox" checked={initialState.serverBusy} onChange={(e) => updateInitialState('serverBusy', e.target.checked)} />
                  <span>Servidor ocupado</span>
                </label>
                {initialState.serverBusy && (
                  <label>
                    <span>Ocupado hasta (HH:MM:SS)</span>
                    <input 
                      type="text" 
                      value={formatTimeInput(initialState.busyUntil, true)} 
                      onChange={(e) => updateInitialState('busyUntil', parseTime(e.target.value, true))}
                      placeholder="00:00:00"
                    />
                  </label>
                )}
              </div>

              <div className="config-group">
                <h3>Ciclo Trabajo-Descanso</h3>
                <label className="switch">
                  <input type="checkbox" checked={flags.hasServerBreaks} onChange={(e) => updateFlags('hasServerBreaks', e.target.checked)} />
                  <span className="slider"></span>
                  <span>Activar</span>
                </label>
                {flags.hasServerBreaks && (
                  <>
                    <label>
                      <span>ΔT - Tiempo Trabajo (seg)</span>
                      <input type="number" value={config.workTime} onChange={(e) => updateConfig('workTime', parseInt(e.target.value) || 0)} />
                    </label>
                    <label>
                      <span>ΔD - Tiempo Descanso (seg)</span>
                      <input type="number" value={config.restTime} onChange={(e) => updateConfig('restTime', parseInt(e.target.value) || 0)} />
                    </label>
                  </>
                )}
              </div>

              <div className="config-group">
                <h3>Reglas Extra</h3>
                <label className="switch">
                  <input type="checkbox" checked={flags.hasClientAbandonment} onChange={(e) => updateFlags('hasClientAbandonment', e.target.checked)} />
                  <span className="slider"></span>
                  <span>Abandonos</span>
                </label>
                {flags.hasClientAbandonment && (
                  <label><span>ΔSC (seg)</span><input type="number" value={config.maxWaitTime === Infinity ? '' : config.maxWaitTime} onChange={(e) => updateConfig('maxWaitTime', parseInt(e.target.value) || Infinity)} placeholder="∞" /></label>
                )}
                <label className="switch">
                  <input type="checkbox" checked={flags.hasPriority} onChange={(e) => updateFlags('hasPriority', e.target.checked)} />
                  <span className="slider"></span>
                  <span>Clientes VIP</span>
                </label>
                <label className="switch">
                  <input type="checkbox" checked={flags.hasSecurityZone} onChange={(e) => updateFlags('hasSecurityZone', e.target.checked)} />
                  <span className="slider"></span>
                  <span>Zona de Seguridad</span>
                </label>
                {flags.hasSecurityZone && (
                  <label><span>ΔtSZ→PS (seg)</span><input type="number" value={config.travelTime} onChange={(e) => updateConfig('travelTime', parseInt(e.target.value) || 0)} /></label>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="control-section">
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${getProgress()}%` }}></div>
          </div>
          <div className="controls-top">
            <div className="speed-control">
              <label>Velocidad:</label>
              <input type="range" min="1" max="10" value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))} />
              <span className="speed-label">{speed}x</span>
            </div>
            <button className="btn btn-help" onClick={() => setShowHelp(!showHelp)}>?</button>
          </div>
          <div className="controls">
            <button className="btn btn-primary" onClick={initialize} title="Inicializar (I)">🔄 Inicializar</button>
            <button className="btn btn-secondary" onClick={step} disabled={!hasStarted || isRunning} title="Paso (S)">⏭️ Paso</button>
            <button className={`btn ${isRunning ? 'btn-danger' : 'btn-success'}`} onClick={isRunning ? pause : run} disabled={!hasStarted} title={isRunning ? 'Pausar (P)' : 'Ejecutar (P)'}>
              {isRunning ? '⏸️ Pausar' : '▶️ Ejecutar'}
            </button>
            <button className="btn btn-warning" onClick={resetAll} title="Reiniciar todo (R)">🗑️ Reiniciar</button>
            <button className="btn btn-export" onClick={exportResults} disabled={!currentState || currentState.history.length === 0} title="Exportar CSV">📥 Exportar</button>
          </div>
          {showHelp && (
            <div className="help-panel">
              <h4>Atajos de teclado</h4>
              <ul>
                <li><kbd>I</kbd> - Inicializar</li>
                <li><kbd>P</kbd> - Play/Pausar</li>
                <li><kbd>S</kbd> - Siguiente paso</li>
                <li><kbd>R</kbd> - Reiniciar</li>
              </ul>
            </div>
          )}
        </section>

        <section className="stats-section">
          <div className="stats-grid">
            <StatBox label="Tiempo" value={currentState ? formatTime(currentState.clock) : '--:--'} color="blue" />
            <StatBox 
              label="Estado P.S." 
              value={currentState?.serverState === 'OCUPADO' ? '1' : currentState?.serverState === 'AUSENTE' ? 'A' : '0'} 
              color={currentState?.serverState === 'OCUPADO' ? 'orange' : currentState?.serverState === 'AUSENTE' ? 'red' : 'green'}
              icon={currentState?.serverState === 'OCUPADO' ? '⚙️' : currentState?.serverState === 'AUSENTE' ? '🌙' : '✅'}
            />
            {flags.hasServerBreaks && (
              <StatBox 
                label="Servidor" 
                value={currentState?.serverPresent ? 'Presente' : 'Ausente'} 
                color={currentState?.serverPresent ? 'green' : 'red'}
                icon={currentState?.serverPresent ? '👨‍💼' : '🏖️'}
              />
            )}
            <StatBox label="Cola" value={currentState?.queue.length || 0} color="purple" />
            <StatBox label="Utiliz." value={`${calculateUtilization()}%`} color="green" />
            <StatBox label="Atend." value={currentState?.stats.clientsServed || 0} color="blue" />
            <StatBox label="Aband." value={currentState?.stats.clientsAbandoned || 0} color="red" />
            <StatBox label="FEL" value={currentState?.fel.length || 0} color="gray" />
            <StatBox label="Inic." value={currentState?.stats.clientsInQueueAtStart || 0} color="gray" />
          </div>
          {currentState && currentState.queue.length > 0 && (
            <div className="visual-queue">
              <span className="queue-label">Cola visual:</span>
              <div className="queue-clients">
                {currentState.queue.map((c) => (
                  <div key={c.id} className={`client-dot ${c.priority === 'B' ? 'vip' : ''}`} title={`Cliente ${c.id}${c.priority === 'B' ? ' (VIP)' : ''}`}>
                    {c.id}
                  </div>
                ))}
              </div>
            </div>
          )}
          {currentState && currentState.clientInService && (
            <div className="visual-server">
              <span className="server-label">En servicio:</span>
              <div className={`server-client ${currentState.clientInService.priority === 'B' ? 'vip' : ''}`}>
                Cliente {currentState.clientInService.id}
              </div>
            </div>
          )}
          {flags.hasServerBreaks && currentState && (
            <div className="visual-cycle">
              <span className="cycle-label">Próximo cambio:</span>
              <span className={`cycle-info ${currentState.serverPresent ? 'to-rest' : 'to-work'}`}>
                {currentState.serverPresent 
                  ? (currentState.nextBreakTime ? `Descanso a las ${formatTime(currentState.nextBreakTime)}` : 'Sin descanso programado')
                  : (currentState.nextWorkTime ? `Trabajo a las ${formatTime(currentState.nextWorkTime)}` : 'Sin regreso programado')
                }
              </span>
            </div>
          )}
        </section>

        <section className="results-section">
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
      </main>
    </div>
  );
}

function AdvancedTable({ history, flags }) {
  const formatTime = (seconds, startTime = 0) => {
    if (seconds === null || seconds === undefined || seconds === Infinity) return '-';
    const abs = startTime + seconds;
    const t = Math.floor(abs);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const getEventOrigin = (entry, history) => {
    if (entry.step === 1) return null;
    const prevEntry = history[entry.step - 2];
    if (!prevEntry) return null;
    return prevEntry.eventType;
  };

  const getServerState = (entry) => {
    if (entry.serverState === 'LIBRE') return '0';
    if (entry.serverState === 'OCUPADO') return '1';
    return 'A';
  };

  const getFelEvents = (entry) => {
    const events = {
      nextArrival: null,
      nextServiceEnd: null,
      nextBreakStart: null,
      nextBreakEnd: null,
      nextAbandonment: null
    };
    
    if (!entry.fel) return events;
    
    for (const event of entry.fel) {
      if (event.type === 'LLEGADA' && !events.nextArrival) {
        events.nextArrival = event.time;
      } else if (event.type === 'FIN_SERVICIO' && !events.nextServiceEnd) {
        events.nextServiceEnd = event.time;
      } else if (event.type === 'SALIDA_SERVIDOR' && !events.nextBreakStart) {
        events.nextBreakStart = event.time;
      } else if (event.type === 'LLEGADA_SERVIDOR' && !events.nextBreakEnd) {
        events.nextBreakEnd = event.time;
      }
    }
    
    return events;
  };

  const getMaxQueueSize = () => {
    if (!history.length) return 3;
    return Math.max(3, ...history.map(h => h.queueLength));
  };

  const maxQueue = getMaxQueueSize();

  return (
    <div className="table-wrapper">
      <table className="advanced-table">
        <thead>
          <tr>
            <th rowSpan="2" className="th-num">#</th>
            <th rowSpan="2" className="th-time">Hora Actual</th>
            <th rowSpan="2">Evento</th>
            <th rowSpan="2">Estado P.S.</th>
            <th rowSpan="2">Cant. Cola</th>
            <th colSpan="2" className="th-fel">FEL - Próximos Eventos</th>
            
            {flags.hasServerBreaks && (
              <th colSpan="3" className="th-special">Servidor (Descansos)</th>
            )}
            
            {flags.hasClientAbandonment && (
              <th colSpan={1 + maxQueue} className="th-special">
                Abandono de Clientes
              </th>
            )}
          </tr>
          <tr>
            <th className="th-fel">Hora próx. Llegada</th>
            <th className="th-fel">Hora próx. Fin Serv.</th>
            
            {flags.hasServerBreaks && (
              <>
                <th className="th-special">Hora Desc.</th>
                <th className="th-special">Hora Trab.</th>
                <th className="th-special">Presencia</th>
              </>
            )}
            
            {flags.hasClientAbandonment && (
              <>
                <th className="th-special">Hora Aband.</th>
                {[...Array(maxQueue)].map((_, i) => (
                  <th key={i} className="th-special th-client">C{i + 1}</th>
                ))}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {history.map((entry, i) => {
            const origin = getEventOrigin(entry, history);
            const felEvents = getFelEvents(entry);
            
            return (
              <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td className="td-num">{entry.step}</td>
                <td className="td-time">{formatTime(entry.time)}</td>
                <td className="td-event">
                  <span className={`event-badge ${entry.eventType.toLowerCase().replace('_', '-')}`}>
                    {entry.eventType}
                  </span>
                </td>
                <td className="td-state">{getServerState(entry)}</td>
                <td className="td-queue">{entry.queueLength}</td>
                <td className={`td-fel ${origin === 'LLEGADA' ? 'highlight-origin' : ''}`}>
                  {felEvents.nextArrival ? formatTime(felEvents.nextArrival) : '-'}
                </td>
                <td className={`td-fel ${origin === 'FIN_SERVICIO' ? 'highlight-origin' : ''}`}>
                  {felEvents.nextServiceEnd ? formatTime(felEvents.nextServiceEnd) : '-'}
                </td>
                
                {flags.hasServerBreaks && (
                  <>
                    <td className={`td-special ${origin === 'SALIDA_SERVIDOR' ? 'highlight-origin' : ''}`}>
                      {entry.nextBreakTime ? formatTime(entry.nextBreakTime) : '-'}
                    </td>
                    <td className={`td-special ${origin === 'LLEGADA_SERVIDOR' ? 'highlight-origin' : ''}`}>
                      {entry.nextWorkTime ? formatTime(entry.nextWorkTime) : '-'}
                    </td>
                    <td className={`td-special ${entry.serverPresent ? 'server-present' : 'server-absent'}`}>
                      {entry.serverPresent ? 'Presente' : 'Ausente'}
                    </td>
                  </>
                )}
                
                {flags.hasClientAbandonment && (
                  <>
                    <td className={`td-special ${origin === 'ABANDONO' ? 'highlight-origin' : ''}`}>
                      {entry.eventType === 'ABANDONO' ? formatTime(entry.time) : '-'}
                    </td>
                    {[...Array(maxQueue)].map((_, ci) => {
                      const client = entry.queueClients?.[ci];
                      const abandonTime = client ? client.arrivalTime + client.patienceTime : null;
                      return (
                        <td key={ci} className="td-special td-client">
                          {abandonTime && ci < entry.queueLength ? formatTime(abandonTime) : '-'}
                        </td>
                      );
                    })}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatBox({ label, value, color, icon }) {
  return (
    <div className={`stat-box stat-${color}`}>
      {icon && <div className="stat-icon">{icon}</div>}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function formatTime(seconds, startTime = 0) {
  const abs = startTime + seconds;
  const t = Math.floor(abs);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default App;
