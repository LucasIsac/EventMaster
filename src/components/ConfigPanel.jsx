import React from 'react';
import TimeInput from './TimeInput';
import TimeField from './TimeField';
import { CheckpointsConfig } from './CheckpointsConfig';

export function ConfigPanel({ config, flags, initialState, updateConfig, updateFlags, updateInitialState, checkpointRules, setCheckpointRules }) {
  return (
    <section className="config-section">
      <div className="card">
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
              <span>Intervalo llegada (ej: 45 o 30,45,60 o 30 - 60)</span>
              <TimeField 
                value={config.arrivalInterval} 
                onChange={(val) => updateConfig('arrivalInterval', val)}
                placeholder="45"
              />
            </label>
          </div>

          <div className="config-group">
            <h3>ΔtS</h3>
            <label>
              <span>Tiempo servicio (ej: 40 o 30,50,25 o 30 - 50)</span>
              <TimeField 
                value={config.serviceTime} 
                onChange={(val) => updateConfig('serviceTime', val)}
                placeholder="40"
              />
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

          <CheckpointsConfig rules={checkpointRules} setRules={setCheckpointRules} />
        </div>
      </div>
    </section>
  );
}
