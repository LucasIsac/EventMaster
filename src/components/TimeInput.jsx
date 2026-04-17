import { useState, useRef } from 'react';

function TimeInput({ value, onChange }) {
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const secondsRef = useRef(null);

  const getParts = (val) => ({
    h: Math.floor(val / 3600),
    m: Math.floor((val % 3600) / 60),
    s: val % 60
  });

  const [parts, setParts] = useState(() => getParts(value));

  const updatePart = (part, newValue) => {
    let num = parseInt(newValue) || 0;
    
    if (part === 'h') num = Math.min(23, Math.max(0, num));
    else num = Math.min(59, Math.max(0, num));
    
    const newParts = { ...parts, [part]: num };
    setParts(newParts);
    onChange(newParts.h * 3600 + newParts.m * 60 + newParts.s);
  };

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

  const handleInput = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-2);
    e.target.value = val;
  };

  return (
    <div className="time-input-container">
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