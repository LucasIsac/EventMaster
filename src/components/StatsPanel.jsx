import React from 'react';

export function StatBox({ label, value, color, icon }) {
  return (
    <div className={`stat-box stat-${color}`}>
      {icon && <div className="stat-icon">{icon}</div>}
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function StatsPanel({ currentState, flags, calculateUtilization, formatTime }) {
  return (
    <section className="stats-section">
      <div className="stats-grid">
        <StatBox label="Tiempo" value={currentState ? formatTime(currentState.clock) : '--:--'} color="blue" />
        <StatBox 
          label="Estado P.S." 
          value={currentState?.serverState === 'OCUPADO' ? '1' : currentState?.serverState === 'AUSENTE' ? 'A' : '0'} 
          color={currentState?.serverState === 'OCUPADO' ? 'orange' : currentState?.serverState === 'AUSENTE' ? 'red' : 'green'}
          icon={currentState?.serverState === 'OCUPADO' ? '⚙️' : currentState?.serverState === 'AUSENTE' ? '🌙' : '✅'}
        />
        {flags.hasServerBreaks && (
          <StatBox 
            label="Servidor" 
            value={currentState?.serverPresent ? 'Presente' : 'Ausente'} 
            color={currentState?.serverPresent ? 'green' : 'red'}
            icon={currentState?.serverPresent ? '👨‍💼' : '🏖️'}
          />
        )}
        <StatBox label="Cola" value={currentState?.queue.length || 0} color="purple" />
        <StatBox label="Utiliz." value={`${calculateUtilization()}%`} color="green" />
        <StatBox label="Atend." value={currentState?.stats.clientsServed || 0} color="blue" />
        <StatBox label="Aband." value={currentState?.stats.clientsAbandoned || 0} color="red" />
        <StatBox label="FEL" value={currentState?.fel.length || 0} color="gray" />
        <StatBox label="Inic." value={currentState?.stats.clientsInQueueAtStart || 0} color="gray" />
      </div>
      {currentState && currentState.queue.length > 0 && (
        <div className="visual-queue">
          <span className="queue-label">Cola visual:</span>
          <div className="queue-clients">
            {currentState.queue.map((c) => (
              <div key={c.id} className={`client-dot ${c.priority === 'B' ? 'vip' : ''}`} title={`Cliente ${c.id}${c.priority === 'B' ? ' (VIP)' : ''}`}>
                {c.id}
              </div>
            ))}
          </div>
        </div>
      )}
      {currentState && currentState.clientInService && (
        <div className="visual-server">
          <span className="server-label">En servicio:</span>
          <div className={`server-client ${currentState.clientInService.priority === 'B' ? 'vip' : ''}`}>
            Cliente {currentState.clientInService.id}
          </div>
        </div>
      )}
      {flags.hasServerBreaks && currentState && (
        <div className="visual-cycle">
          <span className="cycle-label">Próximo cambio:</span>
          <span className={`cycle-info ${currentState.serverPresent ? 'to-rest' : 'to-work'}`}>
            {currentState.serverPresent 
              ? (currentState.nextBreakTime ? `Descanso a las ${formatTime(currentState.nextBreakTime)}` : 'Sin descanso programado')
              : (currentState.nextWorkTime ? `Trabajo a las ${formatTime(currentState.nextWorkTime)}` : 'Sin regreso programado')
            }
          </span>
        </div>
      )}
    </section>
  );
}
