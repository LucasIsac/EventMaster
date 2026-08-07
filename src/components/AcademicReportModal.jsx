import React from 'react';
import { X, FileText } from 'lucide-react';

export function AcademicReportModal({ isOpen, onClose, config, flags, vocab }) {
  if (!isOpen) return null;

  const clientName = vocab?.client || 'Pallet';
  const arriveVerb = vocab?.arrive || 'Llega';
  const servedVerb = vocab?.served || 'Despachado';
  const abandonVerb = vocab?.abandon || 'Desviado';

  const isVipEnabled = flags?.hasPriority;
  const numServers = parseInt(config?.numServers) || 1;
  const maintEveryN = parseInt(config?.maintenanceEveryN) || 0;
  const maxCap = config?.maxQueueCapacity && config.maxQueueCapacity < Infinity ? config.maxQueueCapacity : null;

  // 1. Representación con Simbología Habitual
  const renderTopology = () => {
    if (isVipEnabled) {
      let flow = `                  ┌─► [ Fila B (VIP - Ilimitada) ] ──┐\n[ Escáner (30% B / 70% A) ]                                  ├─► [ Servidores (${numServers}) ] ──► [ ${servedVerb} ]\n                  └─► [ Fila A (${maxCap ? `Máx ${maxCap}` : 'Ilimitada'}) ] ──────┘`;
      if (maxCap) {
        flow += `\n                             └─► (Saturación) ──► [ ${abandonVerb} ]`;
      }
      return flow;
    }

    let topo = '[LL] --> ( Q )';
    if (flags?.hasSecurityZone) {
      topo += ' --> [ SZ ]';
    }
    topo += ` --> [ PS (1..${numServers}) ] --> [ FS ]`;

    if (config?.topology === 'AISLADOS') {
      return `Sistema de ${numServers} servidores en paralelo (Colas independientes):\n` +
             Array.from({ length: numServers }).map((_, i) => `S${i + 1}: ${topo}`).join('\n');
    } else if (config?.topology === 'ENCADENADOS') {
      let chained = '[LL]';
      for (let i = 0; i < numServers; i++) {
        chained += ` --> ( Q${i + 1} ) --> [ PS${i + 1} ]`;
      }
      chained += ' --> [ FS ]';
      return chained;
    }
    return topo;
  };

  // 2. Vector de Control y Variables de Estado V(t)
  const renderStateVector = () => {
    const vectorFields = ['Reloj', 'Prox_Llegada'];
    if (isVipEnabled) {
      vectorFields.push('Fila_B');
      vectorFields.push(`Fila_A (0..${maxCap || '∞'})`);
    } else {
      vectorFields.push('Cola');
    }

    vectorFields.push(`Estado_Servidor[1..${numServers}] (0=Libre, 1=Ocupado${maintEveryN > 0 ? ', 2=En_Mantenimiento' : flags?.hasServerBreaks ? ', A=Ausente' : ''})`);

    if (maintEveryN > 0) {
      vectorFields.push(`Viajes_Servidor[1..${numServers}] (0..${maintEveryN})`);
      vectorFields.push(`Prox_Fin_Mantenimiento[1..${numServers}]`);
    }
    vectorFields.push(`Prox_Fin_Servicio[1..${numServers}]`);

    return `V(t) = (\n  ${vectorFields.join(',\n  ')}\n)\n\nNota: Cada cliente VIP en fila almacena su hora_llegada para el cálculo del tiempo máximo de espera.`;
  };

  // 3. Determinación de Eventos (FEL)
  const renderEvents = () => {
    const events = [];
    events.push(`Llegada_${clientName}\t│ Sí\t│ ${config?.arrivalInterval || '4'} min (${config?.arrivalDistType || 'Constante'})`);
    
    if (isVipEnabled && config?.serviceTimeVip) {
      events.push(`Fin_Servicio_${clientName}_A(i)\t│ Sí\t│ ${config?.serviceTime} min (${config?.serviceDistType || 'Uniforme'})`);
      events.push(`Fin_Servicio_${clientName}_B(i)\t│ Sí\t│ ${config?.serviceTimeVip} min (${config?.serviceDistType || 'Uniforme'})`);
    } else {
      events.push(`Fin_Servicio_${clientName}(i)\t│ Sí\t│ ${config?.serviceTime} min (${config?.serviceDistType || 'Uniforme'})`);
    }

    if (maintEveryN > 0) {
      events.push(`Fin_Mantenimiento(i)\t│ Sí\t│ ${config?.maintenanceTime || '20'} min (Constante cada ${maintEveryN} viajes)`);
    }

    if (flags?.hasServerBreaks) {
      events.push(`Salida_Servidor(i)\t│ Sí\t│ ${config?.workTime} min`);
      events.push(`Llegada_Servidor(i)\t│ Sí\t│ ${config?.restTime} min`);
    }

    if (flags?.hasClientAbandonment) {
      events.push(`Abandono_Cola\t│ Sí\t│ ${config?.maxWaitTime} min`);
    }

    return `Evento\t\t\t│ Consume Tiempo │ Distribución / Frecuencia\n` +
           `────────────────────────┼────────────────┼────────────────────────────────────────\n` +
           events.join('\n');
  };

  // 4. Mini-especificaciones de Código (Pseudocódigo)
  const renderPseudocode = () => {
    const code = [];

    // EVENTO Llegada
    code.push(`EVENTO Llegada_${clientName}:`);
    code.push(`    Programar Llegada_${clientName} en Reloj + ${config?.arrivalInterval || '4'}`);
    code.push(``);
    if (isVipEnabled) {
      const prob = Math.round((config?.vipProbability !== undefined ? config.vipProbability : 0.3) * 100);
      code.push(`    r = Random()`);
      code.push(`    SI r <= ${prob / 100} ENTONCES              // Clase B (VIP)`);
      code.push(`        pallet.clase = "B"`);
      code.push(`        pallet.hora_llegada = Reloj`);
      code.push(`        Fila_B.encolar(pallet)`);
      code.push(`    SINO                               // Clase A (Estándar)`);
      if (maxCap) {
        code.push(`        SI Fila_A.Longitud < ${maxCap} ENTONCES`);
        code.push(`            Fila_A.encolar(pallet)`);
        code.push(`        SINO`);
        code.push(`            Pallets_Desviados_FilaA <- Pallets_Desviados_FilaA + 1 // Desvío por saturación`);
        code.push(`        FIN SI`);
      } else {
        code.push(`        Fila_A.encolar(pallet)`);
      }
      code.push(`    FIN SI`);
    } else {
      code.push(`    Cola.encolar(cliente)`);
    }
    code.push(``);
    code.push(`    SI existe i / Estado_Servidor[i] = Libre ENTONCES`);
    code.push(`        AsignarSiguientePallet(i)`);
    code.push(`    FIN SI`);
    code.push(``);

    // EVENTO Fin_Servicio / Fin_Viaje
    code.push(`EVENTO Fin_Servicio(i):`);
    if (maintEveryN > 0) {
      code.push(`    Viajes_Servidor[i] <- Viajes_Servidor[i] + 1`);
      code.push(`    SI Viajes_Servidor[i] = ${maintEveryN} ENTONCES`);
      code.push(`        Estado_Servidor[i] <- En_Mantenimiento`);
      code.push(`        Viajes_Servidor[i] <- 0`);
      code.push(`        Programar Fin_Mantenimiento(i) en Reloj + ${config?.maintenanceTime || '20'}`);
      code.push(`    SINO`);
      code.push(`        Estado_Servidor[i] <- Libre`);
      code.push(`        AsignarSiguientePallet(i)`);
      code.push(`    FIN SI`);
    } else {
      code.push(`    Estado_Servidor[i] <- Libre`);
      code.push(`    Clientes_Atendidos <- Clientes_Atendidos + 1`);
      code.push(`    AsignarSiguientePallet(i)`);
    }
    code.push(``);

    // EVENTO Fin_Mantenimiento
    if (maintEveryN > 0) {
      code.push(`EVENTO Fin_Mantenimiento(i):`);
      code.push(`    Estado_Servidor[i] <- Libre`);
      code.push(`    Viajes_Servidor[i] <- 0`);
      code.push(`    Recargas_Completadas_Total <- Recargas_Completadas_Total + 1`);
      code.push(`    AsignarSiguientePallet(i)`);
      code.push(``);
    }

    // PROCEDIMIENTO AsignarSiguientePallet
    code.push(`PROCEDIMIENTO AsignarSiguientePallet(i):`);
    if (isVipEnabled) {
      code.push(`    SI Fila_B.Longitud > 0 ENTONCES`);
      code.push(`        pallet <- Fila_B.desencolar()`);
      code.push(`        espera <- Reloj - pallet.hora_llegada`);
      code.push(`        SI espera > Espera_Max_FilaB ENTONCES`);
      code.push(`            Espera_Max_FilaB <- espera`);
      code.push(`        FIN SI`);
      code.push(`        Estado_Servidor[i] <- Ocupado`);
      code.push(`        Programar Fin_Servicio(i) en Reloj + Uniforme(${config?.serviceTimeVip || '8 - 12'})`);
      code.push(`    SINO SI Fila_A.Longitud > 0 ENTONCES`);
      code.push(`        Fila_A.desencolar()`);
      code.push(`        Estado_Servidor[i] <- Ocupado`);
      code.push(`        Programar Fin_Servicio(i) en Reloj + Uniforme(${config?.serviceTime || '10 - 14'})`);
      code.push(`    FIN SI`);
    } else {
      code.push(`    SI Cola.Longitud > 0 ENTONCES`);
      code.push(`        cliente <- Cola.desencolar()`);
      code.push(`        Estado_Servidor[i] <- Ocupado`);
      code.push(`        Programar Fin_Servicio(i) en Reloj + ${config?.serviceTime}`);
      code.push(`    FIN SI`);
    }

    return code.join('\n');
  };

  // 5. Variables Auxiliares y Métricas
  const renderVariables = () => {
    const vars = [];

    if (maintEveryN > 0) {
      vars.push(`• Recargas_Completadas_Total → Se incrementa en Fin_Mantenimiento. Mide total de eventos de recarga completados.`);
      vars.push(`  ↳ Corresponde en EventMaster a: Panel "Ciclos Mant." (stats.maintenanceCycles)`);
    }

    if (isVipEnabled) {
      vars.push(`• Espera_Max_FilaB → Se actualiza en AsignarSiguientePallet cada vez que se desencola un cliente VIP.`);
      vars.push(`  ↳ Corresponde en EventMaster a: Panel "Máx. espera VIP" (stats.maxWaitTimeVip)`);
    }

    if (maxCap) {
      vars.push(`• Pallets_Desviados_FilaA → Se incrementa en Llegada_${clientName} cuando Fila_A alcanza capacidad máxima (${maxCap}).`);
      vars.push(`  ↳ Corresponde en EventMaster a: Panel "Rechazados" (stats.clientsRejected)`);
    }

    vars.push(`• Clientes_Atendidos → Se incrementa al completar la atención de un ${clientName.toLowerCase()}.`);
    vars.push(`  ↳ Corresponde en EventMaster a: Panel "${vocab?.served || 'Atend.'} Total" (stats.clientsServed)`);

    return vars.join('\n\n');
  };

  // 6. Encabezado de la Matriz de Simulación
  const renderHeaders = () => {
    let headers = ['Reloj (t)', 'Próx LL'];
    if (isVipEnabled) {
      headers.push('Fila B', 'Fila A');
    } else {
      headers.push('Cola');
    }

    for (let i = 1; i <= numServers; i++) {
      headers.push(`AGV_${i}`);
      if (maintEveryN > 0) headers.push(`Viajes_${i}`);
      headers.push(`Próx FS_${i}`);
      if (maintEveryN > 0) headers.push(`Próx Recarga_${i}`);
    }

    return `| ${headers.join(' | ')} |`;
  };

  const preStyle = {
    background: 'var(--bg-card)',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '0.88rem',
    fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    color: 'var(--text-color)',
    lineHeight: '1.45'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2><FileText size={20} /> Formulación Académica del Examen (Modelos y Simulación)</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <h3 style={{ marginBottom: '8px' }}>1. Diagrama del Sistema (Simbología Habitual)</h3>
            <pre style={preStyle}>{renderTopology()}</pre>
          </div>

          <div>
            <h3 style={{ marginBottom: '8px' }}>2. Variables del Sistema y Vector de Control V(t)</h3>
            <pre style={preStyle}>{renderStateVector()}</pre>
          </div>

          <div>
            <h3 style={{ marginBottom: '8px' }}>3. Lista de Eventos Futuros (FEL)</h3>
            <pre style={preStyle}>{renderEvents()}</pre>
          </div>

          <div>
            <h3 style={{ marginBottom: '8px' }}>4. Mini-especificaciones de Código (Tratamiento Especial)</h3>
            <pre style={preStyle}>{renderPseudocode()}</pre>
          </div>

          <div>
            <h3 style={{ marginBottom: '8px' }}>5. Variables Auxiliares y Métricas Mapeadas a EventMaster</h3>
            <pre style={preStyle}>{renderVariables()}</pre>
          </div>

          <div>
            <h3 style={{ marginBottom: '8px' }}>6. Encabezado de la Matriz de Simulación</h3>
            <pre style={preStyle}>{renderHeaders()}</pre>
          </div>

        </div>
      </div>
    </div>
  );
}

