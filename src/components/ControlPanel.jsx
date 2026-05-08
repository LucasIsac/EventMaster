import React, { useState } from 'react';

export function ControlPanel({ 
  getProgress, speed, setSpeed, initialize, step, run, pause, resetAll, 
  exportResults, hasStarted, isRunning, currentState, openModal 
}) {
  const [showHelp, setShowHelp] = useState(false);

  return (
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
        <button className="btn btn-info" onClick={openModal} title="Ver Galería de Fotos">📸 Ver Fotos</button>
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
  );
}
