import React, { useState } from 'react';
import { RotateCcw, SkipForward, Pause, Play, Trash2, Download, Camera } from 'lucide-react';

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
          <input
            type="range"
            min="1"
            max="10"
            value={speed}
            onChange={(e) => setSpeed(parseInt(e.target.value))}
          />
          <span className="speed-label">{speed}x</span>
        </div>
        <button className="btn btn-help" onClick={() => setShowHelp(!showHelp)} title="Atajos de teclado">?</button>
      </div>

      <div className="controls">
        <button className="btn btn-primary btn-icon" onClick={initialize} title="Inicializar (I)">
          <RotateCcw size={14}/> Inicializar
        </button>
        <button className="btn btn-secondary btn-icon" onClick={step} disabled={!hasStarted || isRunning} title="Paso (S)">
          <SkipForward size={14}/> Paso
        </button>
        <button
          className={`btn btn-icon ${isRunning ? 'btn-danger' : 'btn-success'}`}
          onClick={isRunning ? pause : run}
          disabled={!hasStarted}
          title={isRunning ? 'Pausar (P)' : 'Ejecutar (P)'}
        >
          {isRunning ? <><Pause size={14}/> Pausar</> : <><Play size={14}/> Ejecutar</>}
        </button>
        <button className="btn btn-warning btn-icon" onClick={resetAll} title="Reiniciar todo (R)">
          <Trash2 size={14}/> Reiniciar
        </button>
        <button
          className="btn btn-export btn-icon"
          onClick={exportResults}
          disabled={!currentState || currentState.history.length === 0}
          title="Exportar CSV"
        >
          <Download size={14}/> Exportar
        </button>
        <button className="btn btn-info btn-icon" onClick={openModal} title="Ver Galería de Fotos">
          <Camera size={14}/> Ver Fotos
        </button>
      </div>

      {showHelp && (
        <div className="help-panel">
          <h4>Atajos de teclado</h4>
          <ul>
            <li><kbd>I</kbd> Inicializar</li>
            <li><kbd>P</kbd> Play / Pausar</li>
            <li><kbd>S</kbd> Siguiente paso</li>
            <li><kbd>R</kbd> Reiniciar todo</li>
          </ul>
        </div>
      )}
    </section>
  );
}
