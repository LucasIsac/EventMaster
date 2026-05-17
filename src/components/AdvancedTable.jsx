import React from 'react';

export function AdvancedTable({ history, flags }) {
  const formatTime = (seconds, startTime = 0) => {
    if (seconds === null || seconds === undefined || seconds === Infinity) return '-';
    const abs = startTime + seconds;
    const t = Math.floor(abs);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const getEventOrigin = (entry, history) => {
    if (entry.step === 1) return null;
    const prevEntry = history[entry.step - 2];
    if (!prevEntry) return null;
    return prevEntry.eventType;
  };

  const getServerStates = (entry) => {
    return entry.servers.map(s => {
      if (s.state === 'OCUPADO') return '1';
      if (s.state === 'AUSENTE') return 'A';
      return '0';
    }).join(' | ');
  };

  return (
    <div className="table-wrapper">
      <table className="advanced-table">
        <thead>
          <tr>
            <th className="th-num">#</th>
            <th className="th-time">Hora Actual</th>
            <th>Evento</th>
            <th>Acción</th>
            <th>Estado P.S. (S1 | S2 | ...)</th>
            <th>Cant. Cola</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, i) => {
            return (
              <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td className="td-num">{entry.step}</td>
                <td className="td-time">{formatTime(entry.time)}</td>
                <td className="td-event">
                  <span className={`event-badge ${entry.eventType.toLowerCase().replace('_', '-')}`}>
                    {entry.eventType}
                  </span>
                </td>
                <td className="td-action" style={{ fontSize: '0.8rem', textAlign: 'left', padding: '0 10px' }}>
                  {entry.action}
                </td>
                <td className="td-state" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {getServerStates(entry)}
                </td>
                <td className="td-queue">{entry.queueLength}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
