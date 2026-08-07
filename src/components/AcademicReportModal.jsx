import React from 'react';
import { X, FileText } from 'lucide-react';

export function AcademicReportModal({ isOpen, onClose, config, flags, vocab }) {
  if (!isOpen) return null;

  const clientName = vocab?.client || 'Clientes';

  // 1. Representación con Simbología Habitual
  const renderTopology = () => {
    if (flags.catastrophicBreakdown) {
      return (
        "          Sitio web funcionando\n" +
        "              ▲       │\n" +
        "           E3 │       │ E4\n" +
        "              │       ▼\n" +
        "┌──────────────────────────────────────────┐\n" +
        "│                                          │\n" +
        "│  E1 ➔   ○ ○ ○ (q1)    [ ps1 ] ➔ E2       │\n" +
        "│                                          │\n" +
        "└──────────────────────────────────────(PSW)┘"
      );
    }

    let topo = '[LL] --> ( Q )';
    if (flags.hasSecurityZone) {
      topo += ' --> [ SZ ]';
    }
    topo += ' --> [ PS ] --> [ FS ]';

    if (config.topology === 'AISLADOS') {
      return `Sistema de ${config.numServers} servidores en paralelo (Colas independientes):\n` +
             Array.from({length: config.numServers}).map((_, i) => `S${i+1}: ${topo}`).join('\n');
      let chained = '[LL]';
      for(let i=0; i<config.numServers; i++) {
        chained += ` --> ( Q${i+1} ) --> [ PS${i+1} ]`;
      }
      chained += ' --> [ FS ]';
      return chained;
    } else if (config.topology === 'TOTEM_SPECIALISTS') {
      const numSpecialists = config.numServers - 1;
      let specialistsFlow = Array.from({length: numSpecialists}).map((_, i) => `[ Especialista ${i+1} ]`).join(' / ');
      return `[Llegada] --> ( Fila Tótem ) --> [ Tótem ] --> ( Sala Espera ) --> ${specialistsFlow} --> [ Atendidos ]\n` + 
             `      |                                 |\n` +
             `    [Abandona > 10m]                  [Abandona sin asiento]`;
    }
    return topo;
  };

  // 2. Determinación de Eventos
  const renderEvents = () => {
    if (flags.catastrophicBreakdown) {
      return [
        'E1 = Llegada de clave del usuario.',
        'E2 = Clave encriptada.',
        'E3 = Caida del sistema.',
        'E4 = Regreso del sistema.'
      ];
    }

    const events = [];
    if (flags.hasPriority) {
      events.push(`- Llegada VIP (LL_VIP): ${config.arrivalInterval} (Dist: ${config.arrivalDistType || 'uniform'})`);
      events.push(`- Llegada Normal (LL_N): ${config.arrivalInterval} (Dist: ${config.arrivalDistType || 'uniform'})`);
    } else {
      events.push(`- Llegada al sistema (LL): ${config.arrivalInterval} (Dist: ${config.arrivalDistType || 'uniform'})`);
    }

    if (config.topology === 'TOTEM_SPECIALISTS') {
      events.push(`- Fin de Servicio (Tótem): ${config.serviceTime} (Dist: ${config.serviceDistType || 'uniform'})`);
      events.push(`- Fin de Servicio (Consultorios): ${config.specialistServiceTime} (Dist: ${config.serviceDistType || 'uniform'})`);
    } else {
      events.push(`- Fin de Servicio (FS): ${config.serviceTime} (Dist: ${config.serviceDistType || 'uniform'})`);
    }

    if (flags.hasServerBreaks) {
      events.push(`- Salida del Servidor (SS): ${config.workTime} (Dist: ${config.workDistType || 'uniform'})`);
      events.push(`- Llegada del Servidor (LS): ${config.restTime} (Dist: ${config.restDistType || 'uniform'})`);
    }

    if (flags.hasClientAbandonment) {
      events.push(`- Abandono de cola (Ab): ${config.maxWaitTime} (Dist: ${config.patienceDistType || 'uniform'})`);
    }
    return events;
  };

  // 3. Variables del Sistema y Auxiliares
  const renderVariables = () => {
    if (flags.catastrophicBreakdown) {
      return [
        'Estado del puesto de encriptación (ps1)',
        'Cantidad de claves en cola (q1)',
        'Estado del sitio web (caído/no caído)'
      ];
    }

    const vars = [
      'Variables de Estado:',
      '- t: Reloj de la simulación'
    ];

    if (config.topology === 'TOTEM_SPECIALISTS') {
      vars.push('- Q_totem: Cantidad de pacientes esperando en la fila del tótem');
      vars.push('- estado_totem: Estado del servidor tótem (0=Libre, 1=Ocupado)');
      vars.push('- Q_sala: Cantidad de pacientes esperando en la sala de espera (capacidad=10)');
      vars.push(`- estado_cons: Estado de los ${config.numServers - 1} consultorios (0=Libre, 1=Ocupado)`);
    } else {
      vars.push('- PS: Estado del Puesto de Servicio (0=Libre, 1=Ocupado, A=Ausente)');
      vars.push('- Q: Cantidad de clientes en cola');
    }
    
    if (flags.hasSecurityZone) {
      vars.push('- SZ: Estado de la Zona de Seguridad (0=Libre, 1=Ocupado)');
    }
    if (flags.hasPriority) {
      vars.push('- Q_VIP: Cantidad de clientes VIP en cola');
    }

    vars.push('');
    vars.push('Variables Auxiliares:');
    vars.push(`- Clientes_Atendidos: Cantidad total de ${clientName.toLowerCase()} que finalizaron el servicio`);
    
    if (config.topology === 'TOTEM_SPECIALISTS') {
      vars.push(`- total_abandonos_totem: Pacientes que superan ${config.maxWaitTime}s en fila del tótem`);
      vars.push(`- total_abandonos_sala: Pacientes que abandonan al ver la sala de espera llena (>= ${config.specialistSeats} asientos)`);
    } else if (flags.hasClientAbandonment) {
      vars.push(`- Clientes_Abandonados: Cantidad total de ${clientName.toLowerCase()} que abandonaron la cola`);
    }
    return vars;
  };

  // 4. Encabezado de la Matriz de Simulación
  const renderHeaders = () => {
    if (flags.catastrophicBreakdown) {
      return [
        'Hora actual',
        'Hora Prox llegada (E1)',
        'Hora Prox fin de servicio (E2)',
        'Hora prox caída (E3)',
        'Hora prox regreso (E4)',
        'Cantidad de clientes en cola q1',
        'Estado del puesto de servicio (ps1)',
        'Estado del sitio web'
      ].join('\n');
    }

    let headers = ['Reloj (t)', 'Próx LL', 'Próx FS', 'Q', 'PS'];
    if (flags.hasServerBreaks) {
      headers.push('Próx SS');
      headers.push('Próx LS');
    }
    if (flags.hasClientAbandonment) {
      headers.push('Hora Abandono');
    }
    return `| ${headers.join(' | ')} |`;
  };

  const preStyle = { 
    background: 'var(--bg-card)', 
    padding: '12px', 
    borderRadius: '6px', 
    border: '1px solid var(--border)', 
    fontSize: '0.9rem', 
    overflowX: 'auto', 
    whiteSpace: 'pre-wrap',
    color: 'var(--text-color)'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <h2><FileText size={20} /> Reporte Académico</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <h3 style={{ marginBottom: '8px' }}>1. Representación con Simbología Habitual</h3>
            <pre style={preStyle}>{renderTopology()}</pre>
          </div>

          <div>
            <h3 style={{ marginBottom: '8px' }}>2. Determinación de Eventos</h3>
            <pre style={preStyle}>{renderEvents().join('\n')}</pre>
          </div>

          <div>
            <h3 style={{ marginBottom: '8px' }}>3. Variables del Sistema y Auxiliares</h3>
            <pre style={preStyle}>{renderVariables().join('\n')}</pre>
          </div>

          <div>
            <h3 style={{ marginBottom: '8px' }}>4. Encabezado de la Matriz de Simulación</h3>
            <pre style={preStyle}>{renderHeaders()}</pre>
          </div>

          <div>
            <h3 style={{ marginBottom: '8px' }}>5. Diagramas de Flujo</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Ver sección <strong>"Ver Lógica"</strong> para el despliegue en Mermaid.js de los diagramas de flujo detallados para cada evento activo.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
