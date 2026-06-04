import React, { useState } from 'react';
import TimeInput from './TimeInput';
import TimeField from './TimeField';
import { CheckpointsConfig } from './CheckpointsConfig';
import { Settings, Dices, Clock, Upload } from 'lucide-react';
import { academicPresets } from '../presets';
import { scaleTimeString } from '../utils/timeParser';

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
  activePreset, applyPreset, onImportPreset
}) {
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  const handleImportApply = () => {
    try {
      if (!importText.trim()) {
        setImportError('El texto está vacío');
        return;
      }
      
      // Intentar limpiar posibles envoltorios markdown como ```json ... ```
      let cleanedText = importText.trim();
      if (cleanedText.startsWith('```')) {
        const matches = cleanedText.match(/^```(?:json)?([\s\S]*?)```$/);
        if (matches && matches[1]) {
          cleanedText = matches[1].trim();
        }
      }
      
      const parsed = JSON.parse(cleanedText);
      
      if (!parsed.config || !parsed.flags || !parsed.initialState) {
        setImportError('El JSON debe contener los objetos "config", "flags" e "initialState".');
        return;
      }

      if (typeof parsed.config.maxTime !== 'number' || typeof parsed.config.startTime !== 'number') {
        setImportError('El JSON es inválido: "config.maxTime" y "config.startTime" deben ser números.');
        return;
      }

      if (!parsed.checkpointRules) parsed.checkpointRules = [];
      if (!parsed.vocab) {
        parsed.vocab = { client: 'Cliente', arrive: 'Arriba', served: 'Atendido', abandon: 'Abandona' };
      }

      onImportPreset(parsed);
      setImportSuccess(true);
      setImportError('');
      
      setTimeout(() => {
        setShowImport(false);
        setImportSuccess(false);
        setImportText('');
      }, 1000);
    } catch (e) {
      setImportError(`JSON inválido: ${e.message}`);
    }
  };

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
              {activePreset === 'imported' && (
                <option value="imported">📥 Preset Importado</option>
              )}
            </select>
            <button 
              className={`btn btn-secondary btn-icon btn-sm ${showImport ? 'active' : ''}`}
              onClick={() => setShowImport(prev => !prev)}
              title="Importar preset desde texto de IA (JSON)"
            >
              <Upload size={14}/> Importar
            </button>
            <button 
              className="btn btn-secondary btn-icon btn-sm" 
              onClick={() => {
                const currentUnit = config.timeUnit || 'seg';
                const newUnit = currentUnit === 'seg' ? 'min' : 'seg';
                const factor = newUnit === 'min' ? (1/60) : 60;
                
                updateConfig('timeUnit', newUnit);
                
                const keysToScale = ['arrivalInterval', 'serviceTime', 'workTime', 'restTime', 'travelTime', 'maxWaitTime'];
                keysToScale.forEach(k => {
                  if (config[k]) {
                    updateConfig(k, scaleTimeString(config[k], factor));
                  }
                });
              }}
              title="Cambiar unidad de tiempo de los campos (min/seg)"
            >
              <Clock size={14}/> {(config.timeUnit || 'seg') === 'min' ? 'Minutos' : 'Segundos'}
            </button>
            <button className="btn btn-secondary btn-icon btn-sm" onClick={generateRandomScenario}>
              <Dices size={14}/> Aleatorio
            </button>
          </div>
        </div>

        {showImport && (
          <div className="import-container">
            <textarea
              className={`import-textarea ${importError ? 'error' : importSuccess ? 'success' : ''}`}
              placeholder="Pegue aquí el preset JSON generado por la IA..."
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError('');
                setImportSuccess(false);
              }}
            />
            {importError && <p className="import-error-msg">⚠️ {importError}</p>}
            {importSuccess && <p className="import-success-msg">✓ Configuración cargada con éxito.</p>}
            <div className="import-actions">
              <button className="btn btn-primary btn-sm" onClick={handleImportApply}>
                Aplicar
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setShowImport(false);
                setImportText('');
                setImportError('');
                setImportSuccess(false);
              }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

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
              <span>Intervalo de llegada ({config.timeUnit === 'min' ? 'min' : 'seg'})</span>
              <TimeField 
                value={config.arrivalInterval} 
                onChange={(val) => updateConfig('arrivalInterval', val)}
                distType={config.arrivalDistType || 'uniform'}
                onDistTypeChange={(val) => updateConfig('arrivalDistType', val)}
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
              <span>Tiempo de servicio ({config.timeUnit === 'min' ? 'min' : 'seg'})</span>
              <TimeField 
                value={config.serviceTime} 
                onChange={(val) => updateConfig('serviceTime', val)}
                distType={config.serviceDistType || 'uniform'}
                onDistTypeChange={(val) => updateConfig('serviceDistType', val)}
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
            {config.topology === 'ENCADENADOS' && (
              <>
                <label className="checkbox">
                  <input 
                    type="checkbox" 
                    checked={flags.singleWorkerChained || false} 
                    onChange={(e) => updateFlags('singleWorkerChained', e.target.checked)} 
                  />
                  <span>Operario Único (Carpintero)</span>
                </label>
                {flags.singleWorkerChained && (
                  <label>
                    <span>Estrategia del operario</span>
                    <select 
                      value={config.singleWorkerStrategy || 'silla_por_silla'} 
                      onChange={(e) => updateConfig('singleWorkerStrategy', e.target.value)}
                    >
                      <option value="silla_por_silla">Silla por silla (Escenario B)</option>
                      <option value="por_lotes">Por lotes (Escenario C)</option>
                    </select>
                  </label>
                )}
              </>
            )}
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
                <span>Tiempo ya esperado ({config.timeUnit === 'min' ? 'min' : 'seg'})</span>
                <input 
                  type="number" 
                  value={config.timeUnit === 'min' ? (initialState.initialWaitTime / 60) : initialState.initialWaitTime} 
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 0;
                    if (config.timeUnit === 'min') val *= 60;
                    updateInitialState('initialWaitTime', val);
                  }} 
                />
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
                  <span>ΔT — Tiempo de trabajo ({config.timeUnit === 'min' ? 'min' : 'seg'})</span>
                  <TimeField 
                    value={config.workTime} 
                    onChange={(val) => updateConfig('workTime', val)}
                    distType={config.workDistType || 'uniform'}
                    onDistTypeChange={(val) => updateConfig('workDistType', val)}
                    placeholder="600"
                  />
                </label>
                <label>
                  <span>ΔD — Tiempo de descanso ({config.timeUnit === 'min' ? 'min' : 'seg'})</span>
                  <TimeField 
                    value={config.restTime} 
                    onChange={(val) => updateConfig('restTime', val)}
                    distType={config.restDistType || 'uniform'}
                    onDistTypeChange={(val) => updateConfig('restDistType', val)}
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
                <span>ΔSC — Espera máxima ({config.timeUnit === 'min' ? 'min' : 'seg'})</span>
                <TimeField 
                  value={config.maxWaitTime} 
                  onChange={(val) => updateConfig('maxWaitTime', val)}
                  distType={config.patienceDistType || 'uniform'}
                  onDistTypeChange={(val) => updateConfig('patienceDistType', val)}
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
                <span>ΔtSZ→PS — Tiempo de traslado ({config.timeUnit === 'min' ? 'min' : 'seg'})</span>
                <TimeField 
                  value={config.travelTime} 
                  onChange={(val) => updateConfig('travelTime', val)}
                  distType={config.travelDistType || 'uniform'}
                  onDistTypeChange={(val) => updateConfig('travelDistType', val)}
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
