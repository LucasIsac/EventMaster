import { useState } from 'react';
import { parseTimeInput, getModeLabel } from '../utils/timeParser';

function TimeField({ value, onChange, placeholder }) {
  const [distType, setDistType] = useState('uniform');
  const parsed = parseTimeInput(value);
  const modeInfo = getModeLabel(parsed);

  const handleChange = (newValue) => {
    onChange(newValue);
  };

  const getModeColor = (type) => {
    switch (type) {
      case 'constant': return '#3b82f6';
      case 'list': return '#10b981';
      case 'range': return distType === 'exponential' ? '#8b5cf6' : '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#64748b';
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
      {modeInfo && (
        <div className="time-field-indicator" style={{ color: getModeColor(modeInfo.type) }}>
          {modeInfo.type === 'range' && (
            <>
              <span>{modeInfo.text}</span>
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