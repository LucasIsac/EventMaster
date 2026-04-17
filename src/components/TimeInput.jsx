import { useState, useRef } from 'react';

/**
 * Componente de entrada de tiempo segmentado (HH:MM:SS).
 * Permite ingresar partes de tiempo individualmente con validación automática.
 */
function TimeInput({ value, onChange }) {
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const secondsRef = useRef(null);

  /**
   * Descompone un valor en segundos en horas, minutos y segundos.
   */
  const getParts = (val) => ({
    h: Math.floor(val / 3600),
    m: Math.floor((val % 3600) / 60),
    s: val % 60
  });

  const [parts, setParts] = useState(() => getParts(value));

  /**
   * Actualiza una parte específica del tiempo y notifica el cambio al padre en segundos.
   */
  const updatePart = (part, newValue) => {
    let num = parseInt(newValue) || 0;
    
    // Validaciones de rangos de tiempo
    if (part === 'h') num = Math.min(23, Math.max(0, num));
    else num = Math.min(59, Math.max(0, num));
    
    const newParts = { ...parts, [part]: num };
    setParts(newParts);
    // Notifica el total de segundos
    onChange(newParts.h * 3600 + newParts.m * 60 + newParts.s);
  };

  /**
   * Gestiona la navegación entre campos usando las teclas de flecha.
   */
  const handleKeyDown = (part, e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (part === 'h') minutesRef.current?.focus();
      else if (part === 'm') secondsRef.current?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (part === 's') minutesRef.current?.focus();
      else if (part === 'm') hoursRef.current?.focus();
    }
  };

  /**
   * Limita la entrada a un máximo de 2 dígitos.
   */
  const handleInput = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-2);
    e.target.value = val;
  };

  return (
    <div className="time-input-container">
      {/* Campo de Horas */}
      <input
        ref={hoursRef}
        type="number"
        className="time-input"
        value={parts.h}
        min={0}
        max={23}
        onChange={(e) => updatePart('h', e.target.value)}
        onKeyDown={(e) => handleKeyDown('h', e)}
        onInput={handleInput}
        placeholder="00"
      />
      <span className="time-separator">:</span>
      {/* Campo de Minutos */}
      <input
        ref={minutesRef}
        type="number"
        className="time-input"
        value={parts.m}
        min={0}
        max={59}
        onChange={(e) => updatePart('m', e.target.value)}
        onKeyDown={(e) => handleKeyDown('m', e)}
        onInput={handleInput}
        placeholder="00"
      />
      <span className="time-separator">:</span>
      {/* Campo de Segundos */}
      <input
        ref={secondsRef}
        type="number"
        className="time-input"
        value={parts.s}
        min={0}
        max={59}
        onChange={(e) => updatePart('s', e.target.value)}
        onKeyDown={(e) => handleKeyDown('s', e)}
        onInput={handleInput}
        placeholder="00"
      />
    </div>
  );
}

export default TimeInput;