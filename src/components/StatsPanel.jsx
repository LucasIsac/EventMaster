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

export function StatsPanel({ currentState, flags, formatTime, vocab }) {
  const isFinished = currentState?.isFinished;
  
  const calculateUtilization = () => {
    if (!currentState || currentState.servers.length === 0) return '0.0';
    const totalUtil = currentState.servers.reduce((acc, s) => acc + parseFloat(s.utilization || 0), 0);
    return (totalUtil / currentState.servers.length).toFixed(1);
  };
  
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
        <StatBox label={`${vocab?.served || 'Atend.'} Total`} value={currentState?.stats.clientsServed || 0} color="blue" />
        <StatBox label={`${vocab?.abandon || 'Aband.'} Total`} value={currentState?.stats.clientsAbandoned || 0} color="red" />
        
        {/* Nuevas Métricas Solicitadas */}
        <StatBox label="Aband. 1ra h" value={currentState?.stats.abandonmentsFirstHour || 0} color="red" />
        <StatBox label="Atend. hasta 2° desc" value={currentState?.stats.clientsServedUntilSecondBreak || 0} color="blue" />
      </div>

      {isFinished && (
        <div className="conclusions-card card" style={{ marginTop: '20px', borderLeft: '5px solid #007bff' }}>
          <h3>📋 Conclusiones Finales</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <p><strong>Resumen en:</strong> {Math.floor(currentState.clock / 60)} minutos</p>
              <p><strong>Total que llegaron:</strong> {currentState.stats.totalArrivals} {(vocab?.client || 'clientes').toLowerCase()}</p>
            </div>
            <div>
              <p><strong>{vocab?.served || 'Atendidos'}:</strong> {currentState.stats.clientsServed}</p>
              <p><strong>{vocab?.abandon || 'Abandonados'}:</strong> {currentState.stats.clientsAbandoned}</p>
            </div>
          </div>
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
