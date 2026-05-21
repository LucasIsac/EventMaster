import React, { useState } from 'react';
import TimeInput from './TimeInput';
import TimeField from './TimeField';
import { CheckpointsConfig } from './CheckpointsConfig';
import { Settings, Dices } from 'lucide-react';
import { academicPresets } from '../presets';

// Tooltip "i" button for config groups
function InfoTooltip({ text }) {
  const [active, setActive] = useState(false);
  return (
    <button
      className={`info-btn${active ? ' active' : ''}`}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onClick={() => setActive(v => !v)}
      title={text}
      type="button"
      aria-label="Más información"
    >
      i
      <span className="info-tooltip">{text}</span>
    </button>
  );
}

export function ConfigPanel({ 
  config, flags, initialState, updateConfig, updateFlags, updateInitialState, 
  checkpointRules, setCheckpointRules, generateRandomScenario,
  activePreset, applyPreset
}) {
  return (
    <section className="config-section">
      <div className="card">
        <div className="config-header">
          <h2><Settings size={18}/> Configuración</h2>
          <div className="config-actions">
            <select 
              value={activePreset} 
              onChange={(e) => applyPreset(e.target.value)}
              className="preset-select"
            >
              {Object.entries(academicPresets).map(([id, preset]) => (
                <option key={id} value={id}>{preset.label}</option>
              ))}
            </select>
            <button className="btn btn-secondary btn-icon btn-sm" onClick={generateRandomScenario}>
              <Dices size={14}/> Aleatorio
            </button>
          </div>
        </div>

        <div className="config-grid">

          {/* Tiempo */}
          <div className="config-group">
            <div className="config-group-header">
              <h3>Tiempo</h3>
              <InfoTooltip text="Duración total de la simulación en minutos y el reloj de inicio del sistema." />
            </div>
            <label>
              <span>Duración (minutos)</span>
              <input type="number" value={config.maxTime / 60} onChange={(e) => updateConfig('maxTime', (parseInt(e.target.value) || 0) * 60)} />
            </label>
            <label>
              <span>Hora de inicio (HH:MM:SS)</span>
              <TimeInput 
                value={config.startTime} 
                onChange={(val) => updateConfig('startTime', val)}
              />
            </label>
          </div>

          {/* ΔtLL */}
          <div className="config-group">
            <div className="config-group-header">
              <h3>ΔtLL — Llegadas</h3>
              <InfoTooltip text="Intervalo de tiempo entre llegadas consecutivas de clientes. Puede ser un valor fijo, un rango uniforme (ej: 30-60) o exponencial." />
            </div>
            <label>
              <span>Intervalo de llegada (seg)</span>
              <TimeField 
                value={config.arrivalInterval} 
                onChange={(val) => updateConfig('arrivalInterval', val)}
                placeholder="30 - 60"
              />
            </label>
          </div>

          {/* ΔtS */}
          <div className="config-group">
            <div className="config-group-header">
              <h3>ΔtS — Servicio</h3>
              <InfoTooltip text="Duración de la atención de cada cliente en el servidor. Acepta constante, rango o distribución exponencial." />
            </div>
            <label>
              <span>Tiempo de servicio (seg)</span>
              <TimeField 
                value={config.serviceTime} 
                onChange={(val) => updateConfig('serviceTime', val)}
                placeholder="20 - 40"
              />
            </label>
          </div>

          {/* Topología */}
          <div className="config-group">
            <div className="config-group-header">
              <h3>Topología y Servidores</h3>
              <InfoTooltip text="Define cómo están organizados los servidores: paralelos independientes, cola única compartida (supermercado) o servidores en cadena." />
            </div>
            <label>
              <span>Tipo de sistema</span>
              <select value={config.topology} onChange={(e) => updateConfig('topology', e.target.value)}>
                <option value="AISLADOS">Aislados / Paralelos</option>
                <option value="COLA_UNICA">Cola Única (Supermercado)</option>
                <option value="ENCADENADOS">Sucesivos / Chained</option>
              </select>
            </label>
            <label>
              <span>Número de servidores</span>
              <input type="number" min="1" max="10" value={config.numServers} onChange={(e) => updateConfig('numServers', parseInt(e.target.value) || 1)} />
            </label>
          </div>

          {/* Estado Inicial */}
          <div className="config-group">
            <div className="config-group-header">
              <h3>Estado Inicial</h3>
              <InfoTooltip text="Condición del sistema al inicio de la simulación: clientes que ya están esperando y si el servidor comienza ocupado." />
            </div>
            <label>
              <span>Clientes en cola al inicio</span>
              <input type="number" value={initialState.clientsInQueue} onChange={(e) => updateInitialState('clientsInQueue', parseInt(e.target.value) || 0)} />
            </label>
            {initialState.clientsInQueue > 0 && (
              <label>
                <span>Tiempo ya esperado (seg)</span>
                <input type="number" value={initialState.initialWaitTime} onChange={(e) => updateInitialState('initialWaitTime', parseInt(e.target.value) || 0)} />
              </label>
            )}
            <label className="checkbox">
              <input type="checkbox" checked={initialState.serverBusy} onChange={(e) => updateInitialState('serverBusy', e.target.checked)} />
              <span>Servidor 1 ocupado</span>
            </label>
            {initialState.serverBusy && (
              <label>
                <span>Ocupado hasta (HH:MM:SS)</span>
                <TimeInput 
                  value={initialState.busyUntil + config.startTime} 
                  onChange={(val) => updateInitialState('busyUntil', val - config.startTime)}
                />
              </label>
            )}
          </div>

          {/* Ciclo Trabajo-Descanso */}
          <div className="config-group">
            <div className="config-group-header">
              <h3>Ciclo Trabajo-Descanso</h3>
              <InfoTooltip text="El servidor alterna entre períodos de trabajo activo (ΔT) y descanso (ΔD). Durante el descanso no atiende clientes y figura como 'Ausente'." />
            </div>
            <label className="switch">
              <input type="checkbox" checked={flags.hasServerBreaks} onChange={(e) => updateFlags('hasServerBreaks', e.target.checked)} />
              <span className="slider"></span>
              <span>Activar</span>
            </label>
            {flags.hasServerBreaks && (
              <>
                <label>
                  <span>ΔT — Tiempo de trabajo (seg)</span>
                  <TimeField 
                    value={config.workTime} 
                    onChange={(val) => updateConfig('workTime', val)}
                    placeholder="600"
                  />
                </label>
                <label>
                  <span>ΔD — Tiempo de descanso (seg)</span>
                  <TimeField 
                    value={config.restTime} 
                    onChange={(val) => updateConfig('restTime', val)}
                    placeholder="60"
                  />
                </label>
              </>
            )}
          </div>

          {/* Reglas Extra */}
          <div className="config-group">
            <div className="config-group-header">
              <h3>Reglas Extra</h3>
              <InfoTooltip text="Comportamientos opcionales: abandonos (clientes que se van si esperan demasiado), prioridad VIP y zona de seguridad previa al servidor." />
            </div>
            <label className="switch">
              <input type="checkbox" checked={flags.hasClientAbandonment} onChange={(e) => updateFlags('hasClientAbandonment', e.target.checked)} />
              <span className="slider"></span>
              <span>Abandonos</span>
            </label>
            {flags.hasClientAbandonment && (
              <label>
                <span>ΔSC — Espera máxima (seg)</span>
                <TimeField 
                  value={config.maxWaitTime} 
                  onChange={(val) => updateConfig('maxWaitTime', val)}
                  placeholder="∞"
                />
              </label>
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
              <label>
                <span>ΔtSZ→PS — Tiempo de traslado (seg)</span>
                <TimeField 
                  value={config.travelTime} 
                  onChange={(val) => updateConfig('travelTime', val)}
                  placeholder="10"
                />
              </label>
            )}
          </div>

          <CheckpointsConfig rules={checkpointRules} setRules={setCheckpointRules} />
        </div>
      </div>
    </section>
  );
}
