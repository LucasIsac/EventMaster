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

  const getServerState = (entry) => {
    if (entry.serverState === 'LIBRE') return '0';
    if (entry.serverState === 'OCUPADO') return '1';
    return 'A';
  };

  const getFelEvents = (entry) => {
    const events = {
      nextArrival: null,
      nextServiceEnd: null,
      nextBreakStart: null,
      nextBreakEnd: null,
      nextAbandonment: null
    };
    
    if (!entry.fel) return events;
    
    for (const event of entry.fel) {
      if (event.type === 'LLEGADA' && !events.nextArrival) {
        events.nextArrival = event.time;
      } else if (event.type === 'FIN_SERVICIO' && !events.nextServiceEnd) {
        events.nextServiceEnd = event.time;
      } else if (event.type === 'SALIDA_SERVIDOR' && !events.nextBreakStart) {
        events.nextBreakStart = event.time;
      } else if (event.type === 'LLEGADA_SERVIDOR' && !events.nextBreakEnd) {
        events.nextBreakEnd = event.time;
      }
    }
    
    return events;
  };

  const getMaxQueueSize = () => {
    if (!history.length) return 3;
    const maxInHistory = Math.max(3, ...history.map(h => h.queueLength));
    return Math.min(maxInHistory, 4); // Limitar a 4 columnas máximo
  };

  const maxQueue = getMaxQueueSize();
  const hasMoreClients = history.length > 0 && Math.max(...history.map(h => h.queueLength)) > maxQueue;

  return (
    <div className="table-wrapper">
      <table className="advanced-table">
        <thead>
          <tr>
            <th rowSpan="2" className="th-num">#</th>
            <th rowSpan="2" className="th-time">Hora Actual</th>
            <th rowSpan="2">Evento</th>
            <th rowSpan="2">Estado P.S.</th>
            <th rowSpan="2">Cant. Cola</th>
            <th colSpan="2" className="th-fel">FEL - Próximos Eventos</th>
            
            {flags.hasServerBreaks && (
              <th colSpan="3" className="th-special">Servidor (Descansos)</th>
            )}
            
            {flags.hasClientAbandonment && (
              <th colSpan={1 + maxQueue} className="th-special">
                Abandono de Clientes
                {hasMoreClients && <span className="more-indicator">+</span>}
              </th>
            )}
          </tr>
          <tr>
            <th className="th-fel">Hora próx. Llegada</th>
            <th className="th-fel">Hora próx. Fin Serv.</th>
            
            {flags.hasServerBreaks && (
              <>
                <th className="th-special">Hora Desc.</th>
                <th className="th-special">Hora Trab.</th>
                <th className="th-special">Presencia</th>
              </>
            )}
            
            {flags.hasClientAbandonment && (
              <>
                <th className="th-special">Hora Aband.</th>
                {[...Array(maxQueue)].map((_, i) => (
                  <th key={i} className="th-special th-client">C{i + 1}</th>
                ))}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {history.map((entry, i) => {
            const origin = getEventOrigin(entry, history);
            const felEvents = getFelEvents(entry);
            
            return (
              <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td className="td-num">{entry.step}</td>
                <td className="td-time">{formatTime(entry.time)}</td>
                <td className="td-event">
                  <span className={`event-badge ${entry.eventType.toLowerCase().replace('_', '-')}`}>
                    {entry.eventType}
                  </span>
                </td>
                <td className="td-state">{getServerState(entry)}</td>
                <td className="td-queue">{entry.queueLength}</td>
                <td className={`td-fel ${origin === 'LLEGADA' ? 'highlight-origin' : ''}`}>
                  {felEvents.nextArrival ? formatTime(felEvents.nextArrival) : '-'}
                </td>
                <td className={`td-fel ${origin === 'FIN_SERVICIO' ? 'highlight-origin' : ''}`}>
                  {felEvents.nextServiceEnd ? formatTime(felEvents.nextServiceEnd) : '-'}
                </td>
                
                {flags.hasServerBreaks && (
                  <>
                    <td className={`td-special ${origin === 'SALIDA_SERVIDOR' ? 'highlight-origin' : ''}`}>
                      {entry.nextBreakTime ? formatTime(entry.nextBreakTime) : '-'}
                    </td>
                    <td className={`td-special ${origin === 'LLEGADA_SERVIDOR' ? 'highlight-origin' : ''}`}>
                      {entry.nextWorkTime ? formatTime(entry.nextWorkTime) : '-'}
                    </td>
                    <td className={`td-special ${entry.serverPresent ? 'server-present' : 'server-absent'}`}>
                      {entry.serverPresent ? 'Presente' : 'Ausente'}
                    </td>
                  </>
                )}
                
                {flags.hasClientAbandonment && (
                  <>
                    <td className={`td-special ${origin === 'ABANDONO' ? 'highlight-origin' : ''}`}>
                      {entry.eventType === 'ABANDONO' ? formatTime(entry.time) : '-'}
                    </td>
                    {[...Array(maxQueue)].map((_, ci) => {
                      const client = entry.queueClients?.[ci];
                      const abandonTime = client ? client.arrivalTime + client.patienceTime : null;
                      return (
                        <td key={ci} className="td-special td-client">
                          {abandonTime && ci < entry.queueLength ? formatTime(abandonTime) : '-'}
                        </td>
                      );
                    })}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
