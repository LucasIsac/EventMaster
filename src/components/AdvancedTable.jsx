import React, { useState } from 'react';

export function AdvancedTable({ history, flags, config, vocab }) {
  const numServers = history.length > 0 ? history[0].servers.length : 1;
  const isMultiServer = numServers > 1;
  const topology = config?.topology || 'COLA_UNICA';
  const isSingleQueue = topology === 'COLA_UNICA';
  const isIsolated = topology === 'AISLADOS';

  const vClient = vocab?.client || 'Clientes';

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
      nextArrival: isIsolated ? Array(numServers).fill(null) : null,
      nextServiceEnds: Array(numServers).fill(null)
    };
    if (!entry.fel) return events;
    for (const event of entry.fel) {
      if (event.type === 'LLEGADA' || event.type === 'LLEGADA_VIP') {
        if (isIsolated) {
          const sId = event.data?.serverId;
          if (sId && !events.nextArrival[sId - 1]) events.nextArrival[sId - 1] = event.time;
        } else {
          if (!events.nextArrival) events.nextArrival = event.time;
        }
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

  const renderGraphic = (servers, queueLength) => {
    if (isSingleQueue) {
      const qStr = queueLength > 0 ? ' ' + '○ '.repeat(queueLength).trim() : '';
      if (isMultiServer) {
        return (
          <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
            {servers.map((s, i) => {
              const sym = s.state === 'OCUPADO' ? '(○)' : s.state === 'AUSENTE' ? '[A]' : '[ ]';
              return <div key={i}>{sym}{i === 0 ? qStr : ''}</div>;
            })}
          </div>
        );
      } else {
        const sym = servers[0].state === 'OCUPADO' ? '(○)' : servers[0].state === 'AUSENTE' ? '[A]' : '[ ]';
        return <span>{`${sym}${qStr}`}</span>;
      }
    } else {
      return (
        <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
          {servers.map((s, i) => {
            const sym = s.state === 'OCUPADO' ? '(○)' : s.state === 'AUSENTE' ? '[A]' : '[ ]';
            const qStr = s.queue && s.queue.length > 0 ? ' ' + '○ '.repeat(s.queue.length).trim() : '';
            return <div key={i}>{sym}{qStr}</div>;
          })}
        </div>
      );
    }
  };

  const felColSpan = (isIsolated ? numServers : 1) + numServers;
  const breaksColSpan = isMultiServer ? numServers * 3 : 3;

  return (
    <div className="table-outer">
      <div className="table-wrapper">
        <table className="advanced-table">
          <thead>
            <tr>
              <th rowSpan="2" className="th-time">Hora actual</th>

              {isIsolated ? (
                <th colSpan={numServers} className="th-fel">Próx. Llegada</th>
              ) : (
                <th rowSpan="2" className="th-fel">Próx. Llegada</th>
              )}

              {isMultiServer ? (
                <th colSpan={numServers} className="th-fel">Próx. Fin Servicio</th>
              ) : (
                <th rowSpan="2" className="th-fel">Próx. Fin Servicio</th>
              )}

              {isSingleQueue ? (
                <th rowSpan="2" className="th-queue-group">Cola</th>
              ) : (
                <th colSpan={numServers} className="th-queue-group">Cola por PS</th>
              )}

              {isMultiServer ? (
                <th colSpan={numServers} className="th-server-group">Estado</th>
              ) : (
                <th rowSpan="2" className="th-server-group">Estado</th>
              )}

              {flags.hasServerBreaks && (
                <th colSpan={breaksColSpan} className="th-special">Servidor (Descansos)</th>
              )}

              {flags.hasClientAbandonment && (
                <th colSpan={1 + maxQueue} className="th-special">
                  Abandono de {vClient}
                  {hasMoreClients && <span className="more-indicator">+</span>}
                </th>
              )}

              <th rowSpan="2" className="th-graphic">Esquema</th>
            </tr>
            <tr>
              {isIsolated && Array.from({ length: numServers }, (_, i) => (
                <th key={`fela-${i}`} className="th-fel">S{i + 1}</th>
              ))}

              {isMultiServer && Array.from({ length: numServers }, (_, i) => (
                <th key={`fel-${i}`} className="th-fel">PS{i + 1}</th>
              ))}

              {!isSingleQueue && Array.from({ length: numServers }, (_, i) => (
                <th key={`q-${i}`} className="th-queue-sub">PS{i + 1}</th>
              ))}

              {isMultiServer && Array.from({ length: numServers }, (_, i) => (
                <th key={`ps-${i}`} className="th-server-sub">PS{i + 1}</th>
              ))}

              {flags.hasServerBreaks && isMultiServer ? (
                Array.from({ length: numServers }, (_, i) => (
                  <React.Fragment key={`breaks-${i}`}>
                    <th className="th-special">S{i+1} Desc</th>
                    <th className="th-special">S{i+1} Trab</th>
                    <th className="th-special">P{i+1}</th>
                  </React.Fragment>
                ))
              ) : flags.hasServerBreaks ? (
                <>
                  <th className="th-special">Hora Desc.</th>
                  <th className="th-special">Hora Trab.</th>
                  <th className="th-special">Presencia</th>
                </>
              ) : null}

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
              const origin = entry.eventType;
              const felEvents = getFelEvents(entry);

              return (
                <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                  <td className="td-time">{formatTime(entry.time)}</td>

                  {isIsolated ? (
                    felEvents.nextArrival.map((t, si) => (
                      <td key={`fela-${si}`} className={`td-fel ${origin === 'LLEGADA' ? 'highlight-origin' : ''}`}>
                        {t ? formatTime(t) : '-'}
                      </td>
                    ))
                  ) : (
                    <td className={`td-fel ${(origin === 'LLEGADA' || origin === 'LLEGADA_VIP') ? 'highlight-origin' : ''}`}>
                      {felEvents.nextArrival ? formatTime(felEvents.nextArrival) : '-'}
                    </td>
                  )}

                  {isMultiServer ? (
                    felEvents.nextServiceEnds.map((t, si) => (
                      <td key={`fel-${si}`} className={`td-fel ${origin === 'FIN_SERVICIO' ? 'highlight-origin' : ''}`}>
                        {t ? formatTime(t) : '-'}
                      </td>
                    ))
                  ) : (
                    <td className={`td-fel ${origin === 'FIN_SERVICIO' ? 'highlight-origin' : ''}`}>
                      {felEvents.nextServiceEnds[0] ? formatTime(felEvents.nextServiceEnds[0]) : '-'}
                    </td>
                  )}

                  {isSingleQueue ? (
                    <td className="td-queue">{entry.queueLength}</td>
                  ) : (
                    entry.servers.map((s, si) => (
                      <td key={`q-${si}`} className="td-queue">{s.queue?.length || 0}</td>
                    ))
                  )}

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

                  {flags.hasServerBreaks && isMultiServer ? (
                    entry.servers.map((s, si) => (
                      <React.Fragment key={`breaks-${si}`}>
                        <td className={`td-special ${origin === 'SALIDA_SERVIDOR' ? 'highlight-origin' : ''}`}>{s.nextBreakTime ? formatTime(s.nextBreakTime) : '-'}</td>
                        <td className={`td-special ${origin === 'LLEGADA_SERVIDOR' ? 'highlight-origin' : ''}`}>{s.nextWorkTime ? formatTime(s.nextWorkTime) : '-'}</td>
                        <td className="td-special">{s.present ? 'P' : 'A'}</td>
                      </React.Fragment>
                    ))
                  ) : flags.hasServerBreaks ? (
                    <>
                      <td className={`td-special ${origin === 'SALIDA_SERVIDOR' ? 'highlight-origin' : ''}`}>
                        {entry.servers[0].nextBreakTime ? formatTime(entry.servers[0].nextBreakTime) : '-'}
                      </td>
                      <td className={`td-special ${origin === 'LLEGADA_SERVIDOR' ? 'highlight-origin' : ''}`}>
                        {entry.servers[0].nextWorkTime ? formatTime(entry.servers[0].nextWorkTime) : '-'}
                      </td>
                      <td className="td-special">
                        {entry.servers[0].present ? 'P' : 'A'}
                      </td>
                    </>
                  ) : null}

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

                  <td className="td-graphic" style={{ fontFamily: 'monospace', whiteSpace: 'nowrap', textAlign: 'left', minWidth: '100px' }}>
                    {renderGraphic(entry.servers, entry.queueLength)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
