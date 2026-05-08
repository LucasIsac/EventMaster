import React, { useState } from 'react';
import TimeInput from './TimeInput';

export function CheckpointsConfig({ rules, setRules }) {
  const [type, setType] = useState('interval');
  const [valueNum, setValueNum] = useState(60);
  const [valueTime, setValueTime] = useState(3600);

  const addRule = () => {
    let newRule = { id: Date.now().toString(), type };
    if (type === 'interval') {
      newRule.value = valueNum * 60;
      newRule.label = `Cada ${valueNum} minuto(s)`;
    } else if (type === 'absolute') {
      newRule.value = valueTime;
      const h = Math.floor(valueTime / 3600).toString().padStart(2, '0');
      const m = Math.floor((valueTime % 3600) / 60).toString().padStart(2, '0');
      const s = (valueTime % 60).toString().padStart(2, '0');
      newRule.label = `En el tiempo +${h}:${m}:${s}`;
    } else if (type === 'break') {
      newRule.label = `En cada descanso (Salida del servidor)`;
    } else if (type === 'abandon') {
      newRule.value = valueNum;
      newRule.label = `Cada ${valueNum} abandono(s)`;
    }

    setRules([...rules, newRule]);
  };

  const removeRule = (id) => {
    setRules(rules.filter(r => r.id !== id));
  };

  return (
    <div className="config-group checkpoints-config">
      <h3>📸 Fotos / Checkpoints</h3>
      <p className="help-text">Configura cuándo tomar una "foto" del estado (ideal para responder preguntas específicas).</p>
      
      <div className="add-rule-form">
        <select value={type} onChange={(e) => setType(e.target.value)} className="rule-select">
          <option value="interval">Cada X minutos (Intervalo)</option>
          <option value="absolute">En una hora específica (Absoluto)</option>
          <option value="break">En cada descanso</option>
          <option value="abandon">Cada X abandonos</option>
        </select>

        {type === 'interval' && (
          <input type="number" value={valueNum} onChange={(e) => setValueNum(parseInt(e.target.value) || 1)} placeholder="Minutos" />
        )}
        
        {type === 'absolute' && (
          <TimeInput value={valueTime} onChange={setValueTime} />
        )}
        
        {type === 'abandon' && (
          <input type="number" value={valueNum} onChange={(e) => setValueNum(parseInt(e.target.value) || 1)} placeholder="Cantidad" />
        )}

        <button className="btn btn-primary btn-small" onClick={addRule}>+ Agregar</button>
      </div>

      <ul className="rules-list">
        {rules.map(rule => (
          <li key={rule.id} className="rule-item">
            <span>📷 {rule.label}</span>
            <button className="btn-remove" onClick={() => removeRule(rule.id)}>❌</button>
          </li>
        ))}
        {rules.length === 0 && <li className="empty-rules">Sin fotos configuradas</li>}
      </ul>
    </div>
  );
}
