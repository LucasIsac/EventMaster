import React, { useState } from 'react';

export function AdvancedTable({ history, flags }) {
  const [showAction, setShowAction] = useState(false);

  const numServers = history.length > 0 ? history[0].servers.length : 1;
  const isMultiServer = numServers > 1;

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

  const getServerStateCode = (s) => {
    if (s.state === 'OCUPADO') return '1';
    if (s.state === 'AUSENTE') return 'A';
    return '0';
  };

  const getServerStateCss = (s) => {
    if (s.state === 'OCUPADO') return 'td-server-busy';
    if (s.state === 'AUSENTE') return 'td-server-break';
    return 'td-server-idle';
  };

  const getFelEvents = (entry) => {
    const events = {
      nextArrival: null,
      nextServiceEnds: entry.servers.map(() => null)
    };
    if (!entry.fel) return events;
    for (const event of entry.fel) {
      if ((event.type === 'LLEGADA' || event.type === 'LLEGADA_VIP') && !events.nextArrival) {
        events.nextArrival = event.time;
      } else if (event.type === 'FIN_SERVICIO') {
        const sId = event.data?.serverId;
        if (sId && !events.nextServiceEnds[sId - 1]) {
          events.nextServiceEnds[sId - 1] = event.time;
        }
      }
    }
    return events;
  };

  const getMaxQueueSize = () => {
    if (!history.length) return 3;
    const maxInHistory = Math.max(3, ...history.map(h => h.queueLength || 0));
    return Math.min(maxInHistory, 4);
  };

  const maxQueue = getMaxQueueSize();
  const hasMoreClients = history.length > 0 && Math.max(...history.map(h => h.queueLength || 0)) > maxQueue;

  // FEL column span: 1 arrival + 1 per server for service end
  const felColSpan = 1 + numServers;

  return (
    <div className="table-outer">
      <div className="table-toolbar">
        <button
          className={`btn-toggle-action ${showAction ? 'active' : ''}`}
          onClick={() => setShowAction(prev => !prev)}
          title={showAction ? 'Ocultar columna de acción' : 'Mostrar columna de acción'}
        >
          <span className="toggle-icon">{showAction ? '👁' : '👁‍🗨'}</span>
          <span>{showAction ? 'Ocultar Acción' : 'Mostrar Acción'}</span>
        </button>
      </div>
      <div className="table-wrapper">
        <table className="advanced-table">
          <thead>
            {/* ---- Header Row 1 ---- */}
            <tr>
              <th rowSpan="2" className="th-num">#</th>
              <th rowSpan="2" className="th-time">Hora Actual</th>
              <th rowSpan="2">Evento</th>
              {showAction && <th rowSpan="2" className="th-action">Acción</th>}

              {isMultiServer ? (
                <th colSpan={numServers} className="th-server-group">Estado P.S.</th>
              ) : (
                <th rowSpan="2">Estado P.S.</th>
              )}

              <th rowSpan="2">Cola</th>
              <th colSpan={felColSpan} className="th-fel">FEL - Próximos Eventos</th>

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

            {/* ---- Header Row 2 (sub-headers) ---- */}
            <tr>
              {/* Per-server sub-headers for Estado P.S. */}
              {isMultiServer && Array.from({ length: numServers }, (_, i) => (
                <th key={`ps-${i}`} className="th-server-sub">S{i + 1}</th>
              ))}

              {/* FEL sub-headers */}
              <th className="th-fel">Próx. Llegada</th>
              {Array.from({ length: numServers }, (_, i) => (
                <th key={`fel-${i}`} className="th-fel">
                  {isMultiServer ? `Fin S${i + 1}` : 'Próx. Fin Serv.'}
                </th>
              ))}

              {/* Breaks sub-headers */}
              {flags.hasServerBreaks && (
                <>
                  <th className="th-special">Hora Desc.</th>
                  <th className="th-special">Hora Trab.</th>
                  <th className="th-special">Presencia</th>
                </>
              )}

              {/* Abandonment sub-headers */}
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

                  {showAction && (
                    <td className="td-action">{entry.action}</td>
                  )}

                  {/* Estado P.S. — per-server cells or single piped cell */}
                  {isMultiServer ? (
                    entry.servers.map((s, si) => (
                      <td key={`ps-${si}`} className={`td-state ${getServerStateCss(s)}`}>
                        {getServerStateCode(s)}
                      </td>
                    ))
                  ) : (
                    <td className="td-state">
                      {getServerStateCode(entry.servers[0])}
                    </td>
                  )}

                  <td className="td-queue">{entry.queueLength}</td>

                  {/* FEL — arrival */}
                  <td className={`td-fel ${origin === 'LLEGADA' || origin === 'LLEGADA_VIP' ? 'highlight-origin' : ''}`}>
                    {felEvents.nextArrival ? formatTime(felEvents.nextArrival) : '-'}
                  </td>

                  {/* FEL — fin servicio per server */}
                  {felEvents.nextServiceEnds.map((t, si) => (
                    <td key={`fel-${si}`} className={`td-fel ${origin === 'FIN_SERVICIO' ? 'highlight-origin' : ''}`}>
                      {t ? formatTime(t) : '-'}
                    </td>
                  ))}

                  {/* Server breaks (piped format for compactness) */}
                  {flags.hasServerBreaks && (
                    <>
                      <td className={`td-special ${origin === 'SALIDA_SERVIDOR' ? 'highlight-origin' : ''}`}>
                        {entry.servers.map(s => s.nextBreakTime ? formatTime(s.nextBreakTime) : '-').join(' | ')}
                      </td>
                      <td className={`td-special ${origin === 'LLEGADA_SERVIDOR' ? 'highlight-origin' : ''}`}>
                        {entry.servers.map(s => s.nextWorkTime ? formatTime(s.nextWorkTime) : '-').join(' | ')}
                      </td>
                      <td className="td-special">
                        {entry.servers.map(s => s.present ? 'P' : 'A').join(' | ')}
                      </td>
                    </>
                  )}

                  {/* Abandonment */}
                  {flags.hasClientAbandonment && (
                    <>
                      <td className={`td-special ${origin === 'ABANDONO' ? 'highlight-origin' : ''}`}>
                        {entry.eventType === 'ABANDONO' ? formatTime(entry.time) : '-'}
                      </td>
                      {[...Array(maxQueue)].map((_, ci) => {
                        const client = entry.queueClients?.[ci];
                        const abandonTime = client && client.patienceTime !== Infinity
                          ? client.arrivalTime + client.patienceTime : null;
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
    </div>
  );
}
