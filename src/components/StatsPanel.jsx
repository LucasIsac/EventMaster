import React from 'react';
import { Settings, Moon, CheckCircle, ClipboardList } from 'lucide-react';

export function StatBox({ label, value, color, icon }) {
  return (
    <div className={`stat-box stat-${color}`}>
      {icon && <div className="stat-icon">{icon}</div>}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function StatsPanel({ currentState, formatTime, vocab, startTime = 0 }) {
  const isFinished = currentState?.isFinished;
  const globalQueueClients = currentState
    ? [...currentState.queues.vip, ...currentState.queues.default]
    : [];
  const localQueueClients = currentState?.servers.flatMap(server => server.queue || []) || [];
  const totalQueueLength = globalQueueClients.length + localQueueClients.length;
  
  return (
    <section className="stats-section">
      <div className="stats-grid">
        <StatBox
          label="Reloj"
          value={currentState ? formatTime(currentState.clock) : '--:--:--'}
          color="blue"
        />

        {currentState?.servers.map(server => (
          <StatBox
            key={server.id}
            label={`Servidor ${server.id}`}
            value={
              server.state === 'OCUPADO'  ? `C${server.clientInService?.id}` :
              server.state === 'AUSENTE'  ? 'A' : '0'
            }
            color={
              server.state === 'OCUPADO'  ? 'orange' :
              server.state === 'AUSENTE'  ? 'red' : 'green'
            }
            icon={
              server.state === 'OCUPADO'  ? <Settings size={16}/> :
              server.state === 'AUSENTE'  ? <Moon size={16}/> :
              <CheckCircle size={16}/>
            }
          />
        ))}

        <StatBox
          label="Cola Total"
          value={totalQueueLength}
          color="purple"
        />
        <StatBox
          label={`${vocab?.served || 'Atend.'} Total`}
          value={currentState?.stats.clientsServed || 0}
          color="blue"
        />
        <StatBox
          label={`${vocab?.abandon || 'Aband.'} Total`}
          value={currentState?.stats.clientsAbandoned || 0}
          color="red"
        />
        <StatBox label="Aband. 1ra h"           value={currentState?.stats.abandonmentsFirstHour || 0}          color="red" />
        <StatBox label="Atend. hasta 2° desc"    value={currentState?.stats.clientsServedUntilSecondBreak || 0}  color="blue" />
      </div>

      {isFinished && (
        <div className="conclusions-card">
          <h3><ClipboardList size={16}/> Conclusiones Finales</h3>
          <div className="conclusions-grid">
            <div>
              <p><strong>Resumen en:</strong> {Math.floor((currentState.clock - startTime) / 60)} minutos</p>
              <p><strong>Total que llegaron:</strong> {currentState.stats.totalArrivals} {(vocab?.client || 'clientes').toLowerCase()}</p>
            </div>
            <div>
              <p><strong>{vocab?.served || 'Atendidos'}:</strong> {currentState.stats.clientsServed}</p>
              <p><strong>{vocab?.abandon || 'Abandonados'}:</strong> {currentState.stats.clientsAbandoned}</p>
            </div>
          </div>
        </div>
      )}

      {currentState && totalQueueLength > 0 && (
        <div className="visual-queue">
          <span className="queue-label">Cola:</span>
          <div className="queue-clients">
            {currentState.queues.vip.map((c) => (
              <div key={c.id} className="client-dot vip" title={`Cliente ${c.id} (VIP)`}>
                {c.id}
              </div>
            ))}
            {currentState.queues.default.map((c) => (
              <div key={c.id} className="client-dot" title={`Cliente ${c.id}`}>
                {c.id}
              </div>
            ))}
            {localQueueClients.map((c) => (
              <div key={`local-${c.id}`} className={`client-dot${c.priority === 'B' ? ' vip' : ''}`} title={`Cliente ${c.id}`}>
                {c.id}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
