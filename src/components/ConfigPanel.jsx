import React from 'react';
import TimeInput from './TimeInput';
import TimeField from './TimeField';
import { CheckpointsConfig } from './CheckpointsConfig';

export function ConfigPanel({ 
  config, flags, initialState, updateConfig, updateFlags, updateInitialState, 
  checkpointRules, setCheckpointRules, generateRandomScenario 
}) {
  return (
    <section className="config-section">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>⚙️ Configuración</h2>
          <button className="btn btn-secondary" onClick={generateRandomScenario} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            🎲 Escenario Aleatorio
          </button>
        </div>
        <div className="config-grid">
          <div className="config-group">
            <h3>Tiempo</h3>
            <label>
              <span>Duración (minutos)</span>
              <input type="number" value={config.maxTime / 60} onChange={(e) => updateConfig('maxTime', (parseInt(e.target.value) || 0) * 60)} />
            </label>
            <label>
              <span>Hora inicio (HH:MM:SS)</span>
              <TimeInput 
                value={config.startTime} 
                onChange={(val) => updateConfig('startTime', val)}
              />
            </label>
          </div>

          <div className="config-group">
            <h3>ΔtLL</h3>
            <label>
              <span>Intervalo llegada</span>
              <TimeField 
                value={config.arrivalInterval} 
                onChange={(val) => updateConfig('arrivalInterval', val)}
                placeholder="30 - 60"
              />
            </label>
          </div>

          <div className="config-group">
            <h3>ΔtS</h3>
            <label>
              <span>Tiempo servicio</span>
              <TimeField 
                value={config.serviceTime} 
                onChange={(val) => updateConfig('serviceTime', val)}
                placeholder="20 - 40"
              />
            </label>
          </div>

          <div className="config-group">
            <h3>Topología y Servidores</h3>
            <label>
              <span>Tipo de Sistema</span>
              <select value={config.topology} onChange={(e) => updateConfig('topology', e.target.value)}>
                <option value="AISLADOS">Aislados / Paralelos</option>
                <option value="COLA_UNICA">Cola Única (Supermercado)</option>
                <option value="ENCADENADOS">Sucesivos / Chained</option>
              </select>
            </label>
            <label>
              <span>Número de Servidores</span>
              <input type="number" min="1" max="10" value={config.numServers} onChange={(e) => updateConfig('numServers', parseInt(e.target.value) || 1)} />
            </label>
          </div>

          <div className="config-group">
            <h3>Estado Inicial</h3>
            <label>
              <span>Clientes en cola</span>
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
                  <TimeField 
                    value={config.workTime} 
                    onChange={(val) => updateConfig('workTime', val)}
                    placeholder="600"
                  />
                </label>
                <label>
                  <span>ΔD - Tiempo Descanso (seg)</span>
                  <TimeField 
                    value={config.restTime} 
                    onChange={(val) => updateConfig('restTime', val)}
                    placeholder="60"
                  />
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
              <label>
                <span>ΔSC (seg)</span>
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
                <span>ΔtSZ→PS (seg)</span>
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
