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
  const isFinished = currentState?.isFinished;
  
  return (
    <section className="stats-section">
      <div className="stats-grid">
        <StatBox label="Reloj" value={currentState ? formatTime(currentState.clock) : '--:--:--'} color="blue" />
        
        {/* Estado de Servidores */}
        {currentState?.servers.map(server => (
          <StatBox 
            key={server.id}
            label={`Servidor ${server.id}`} 
            value={server.state === 'OCUPADO' ? `C${server.clientInService?.id}` : server.state === 'AUSENTE' ? 'A' : '0'} 
            color={server.state === 'OCUPADO' ? 'orange' : server.state === 'AUSENTE' ? 'red' : 'green'}
            icon={server.state === 'OCUPADO' ? '⚙️' : server.state === 'AUSENTE' ? '🌙' : '✅'}
          />
        ))}

        <StatBox label="Cola Total" value={currentState?.queues.default.length + currentState?.queues.vip.length || 0} color="purple" />
        <StatBox label="Atend. Total" value={currentState?.stats.clientsServed || 0} color="blue" />
        <StatBox label="Aband. Total" value={currentState?.stats.clientsAbandoned || 0} color="red" />
        
        {/* Nuevas Métricas Solicitadas */}
        <StatBox label="Aband. 1ra h" value={currentState?.stats.abandonmentsFirstHour || 0} color="red" />
        <StatBox label="Atend. hasta 2° desc" value={currentState?.stats.clientsServedUntilSecondBreak || 0} color="blue" />
      </div>

      {isFinished && (
        <div className="conclusions-card card" style={{ marginTop: '20px', borderLeft: '5px solid #007bff' }}>
          <h3>📋 Conclusiones Finales</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <p><strong>Eficiencia:</strong> La utilización promedio fue del {calculateUtilization()}%.</p>
              <p><strong>Pérdida:</strong> Hubo {currentState.stats.clientsAbandoned} abandonos en total.</p>
            </div>
            <div>
              <p><strong>Productividad:</strong> Se atendieron {currentState.stats.clientsServed} clientes.</p>
              <p><strong>Ritmo:</strong> {currentState.stats.totalArrivals} llegadas totales al sistema.</p>
            </div>
          </div>
          <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
            * Basado en {currentState.servers.length} servidor(es) bajo topología de sistema.
          </p>
        </div>
      )}

      {currentState && (currentState.queues.default.length > 0 || currentState.queues.vip.length > 0) && (
        <div className="visual-queue">
          <span className="queue-label">Cola visual:</span>
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
          </div>
        </div>
      )}
    </section>
  );
}
