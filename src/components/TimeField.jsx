import { useState } from 'react';
import { parseTimeInput, getModeLabel } from '../utils/timeParser';

/**
 * Componente de entrada de texto inteligente que detecta si el usuario ingresa
 * un valor constante, una lista de valores o un rango, y permite elegir la distribución.
 */
function TimeField({ value, onChange, placeholder }) {
  const [distType, setDistType] = useState('uniform');
  const parsed = parseTimeInput(value);
  const modeInfo = getModeLabel(parsed);

  const handleChange = (newValue) => {
    onChange(newValue);
  };

  /**
   * Retorna un color representativo para cada modo detectado.
   */
  const getModeColor = (type) => {
    switch (type) {
      case 'constant': return '#3b82f6'; // Azul
      case 'list': return '#10b981';     // Verde
      case 'range': return distType === 'exponential' ? '#8b5cf6' : '#f59e0b'; // Violeta o Naranja
      case 'error': return '#ef4444';    // Rojo
      default: return '#64748b';         // Gris
    }
  };

  return (
    <div className="time-field">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="time-field-input"
      />
      {/* Indicador visual del modo detectado (constante, lista, rango) */}
      {modeInfo && (
        <div className="time-field-indicator" style={{ color: getModeColor(modeInfo.type) }}>
          {modeInfo.type === 'range' && (
            <>
              <span>{modeInfo.text}</span>
              {/* Selector de distribución para el modo rango */}
              <div className="dist-selector">
                <button
                  type="button"
                  className={distType === 'uniform' ? 'active' : ''}
                  onClick={() => setDistType('uniform')}
                >
                  Uniforme
                </button>
                <button
                  type="button"
                  className={distType === 'exponential' ? 'active' : ''}
                  onClick={() => setDistType('exponential')}
                >
                  Exponencial
                </button>
              </div>
            </>
          )}
          {modeInfo.type !== 'range' && <span>{modeInfo.text}</span>}
          {modeInfo.type === 'error' && <span className="error-text">{modeInfo.text}</span>}
        </div>
      )}
    </div>
  );
}

export default TimeField;