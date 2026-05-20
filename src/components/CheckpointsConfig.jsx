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
    } else if (type === 'break_n') {
      newRule.value = valueNum;
      newRule.label = `Al iniciar el descanso #${valueNum}`;
    } else if (type === 'break_end_n') {
      newRule.value = valueNum;
      newRule.label = `Al terminar el descanso #${valueNum}`;
    } else if (type === 'served_n') {
      newRule.value = valueNum;
      newRule.label = `Al atender al cliente #${valueNum}`;
    } else if (type === 'abandon_n') {
      newRule.value = valueNum;
      newRule.label = `Al ocurrir el abandono #${valueNum}`;
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
          <option value="break_n">Al iniciar el descanso N</option>
          <option value="break_end_n">Al terminar el descanso N</option>
          <option value="served_n">Al atender al cliente N</option>
          <option value="abandon_n">Al ocurrir el abandono N</option>
        </select>

        {(type === 'interval' || type === 'abandon' || type === 'break_n' || type === 'break_end_n' || type === 'served_n' || type === 'abandon_n') && (
          <input type="number" min="1" value={valueNum} onChange={(e) => setValueNum(parseInt(e.target.value) || 1)} placeholder="N / Cantidad" />
        )}
        
        {type === 'absolute' && (
          <TimeInput value={valueTime} onChange={setValueTime} />
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
