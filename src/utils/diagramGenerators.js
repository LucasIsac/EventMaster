export const mermaidStyles = `
classDef default fill:#f9f9f9,stroke:#333,stroke-width:1px;
classDef startEnd fill:#E1F5FE,stroke:#0288D1,stroke-width:2px;
classDef action fill:#FFF9C4,stroke:#FBC02D,stroke-width:1px;
classDef fel fill:#F3E5F5,stroke:#8E24AA,stroke-width:2px;
classDef decision fill:#FFF3E0,stroke:#E65100,stroke-width:2px;
classDef endNode fill:#FFEBEE,stroke:#D32F2F,stroke-width:2px;
`;

export function generateArrivalDiagram(config, flags) {
  let d = `flowchart TD\n${mermaidStyles}\n`;
  d += `  A(["Llegada de Cliente<br>Actualizar t"]):::startEnd --> B["Procesar Llegada<br>Total = Total + 1"]:::action\n`;
  d += `  B --> C["Instanciar Cliente"]:::action\n`;
  
  let currentNode = "C";

  if (flags.hasPriority) {
    d += `  ${currentNode} --> D{"¿Es VIP?<br>isVIP == 1"}:::decision\n`;
    d += `  D -->|Sí| E["Asignar Prioridad VIP"]:::action\n`;
    d += `  D -->|No| F["Asignar Prioridad Normal"]:::action\n`;
    d += `  E --> G[/"Próxima Llegada<br>LL = t + ΔtLL"/]:::fel\n`;
    d += `  F --> G\n`;
    currentNode = "G";
  } else {
    d += `  ${currentNode} --> G[/"Próxima Llegada<br>LL = t + ΔtLL"/]:::fel\n`;
    currentNode = "G";
  }

  if (config.topology === "COLA_UNICA") {
    const isMulti = config.numServers > 1;
    const lblPs = isMulti ? "¿Algún PS Libre?<br>∃ PS(i) == 0" : "¿Servidor Libre?<br>PS == 0";
    const lblInit = isMulti ? "Asignar PS<br>PS(i) = 1" : "Inicia Servicio<br>PS = 1";

    d += `  ${currentNode} --> H{"${lblPs}"}:::decision\n`;
    if (flags.hasSecurityZone) {
      d += `  H -->|Sí| I{"¿Z.Seguridad Libre?<br>SZ == 0"}:::decision\n`;
      
      d += `  I -->|Sí| I2{"¿Es VIP y<br>VIP ignora SZ?"}:::decision\n`;
      d += `  I2 -->|Sí| I3["${lblInit}"]:::action\n`;
      d += `  I3 --> I4[/"Fin Servicio<br>FS = t + ΔtS"/]:::fel\n`;
      d += `  I4 --> Z(["Fin Llegada"]):::startEnd\n`;
      
      d += `  I2 -->|No| J["Cliente a Zona Seg<br>SZ = 1"]:::action\n`;
      d += `  J --> K[/"Fin Zona Seguridad<br>LL_PS = t + ΔtSZ"/]:::fel\n`;
      d += `  K --> Z\n`;

      d += `  I -->|No| L{"¿Es VIP?<br>isVIP == 1"}:::decision\n`;
      d += `  L -->|Sí| M["A Cola VIP<br>Q_VIP = Q_VIP + 1"]:::action\n`;
      d += `  L -->|No| N["A Cola Normal<br>Q = Q + 1"]:::action\n`;
      d += `  M --> Z\n`;
      d += `  N --> Z\n`;
    } else {
      d += `  H -->|Sí| O["${lblInit}"]:::action\n`;
      d += `  O --> P[/"Fin Servicio<br>FS = t + ΔtS"/]:::fel\n`;
      d += `  P --> Z(["Fin Llegada"]):::startEnd\n`;
    }

    if (flags.hasPriority) {
      d += `  H -->|No| Q{"¿Es VIP?<br>isVIP == 1"}:::decision\n`;
      d += `  Q -->|Sí| R["A Cola VIP<br>Q_VIP = Q_VIP + 1"]:::action\n`;
      d += `  Q -->|No| S["A Cola Normal<br>Q = Q + 1"]:::action\n`;
    } else {
      d += `  H -->|No| S["A Cola Normal<br>Q = Q + 1"]:::action\n`;
    }

    if (flags.hasClientAbandonment) {
      if (flags.hasPriority) {
        d += `  R --> T[/"Paciencia Límite<br>Ab = t + ΔSC"/]:::fel\n`;
        d += `  S --> T\n`;
        d += `  T --> Z(["Fin Llegada"]):::startEnd\n`;
      } else {
        d += `  S --> T[/"Paciencia Límite<br>Ab = t + ΔSC"/]:::fel\n`;
        d += `  T --> Z(["Fin Llegada"]):::startEnd\n`;
      }
    } else {
      if (flags.hasPriority) {
        d += `  R --> Z(["Fin Llegada"]):::startEnd\n`;
        d += `  S --> Z\n`;
      } else {
        d += `  S --> Z(["Fin Llegada"]):::startEnd\n`;
      }
    }
  } else if (config.topology === "AISLADOS") {
    d += `  ${currentNode} --> H["Asignar Destino<br>i = Target"]:::action\n`;
    d += `  H --> I{"¿PS(i) Libre?<br>PS(i) == 0"}:::decision\n`;
    d += `  I -->|Sí| J["Inicia Servicio<br>PS(i) = 1"]:::action\n`;
    d += `  J --> K[/"Fin Servicio<br>FS(i) = t + ΔtS"/]:::fel\n`;
    d += `  K --> Z(["Fin Llegada"]):::startEnd\n`;
    
    if (flags.hasPriority) {
      d += `  I -->|No| L1{"¿Es VIP?<br>isVIP == 1"}:::decision\n`;
      d += `  L1 -->|Sí| L2["A Cola VIP(i)<br>Q_VIP(i)++"]:::action\n`;
      d += `  L1 -->|No| L3["A Cola Normal(i)<br>Q(i)++"]:::action\n`;
      if (flags.hasClientAbandonment) {
        d += `  L2 --> M[/"Paciencia Límite<br>Ab = t + ΔSC"/]:::fel\n`;
        d += `  L3 --> M\n`;
        d += `  M --> Z\n`;
      } else {
        d += `  L2 --> Z\n`;
        d += `  L3 --> Z\n`;
      }
    } else {
      d += `  I -->|No| L["Encolar S(i)<br>Q(i) = Q(i) + 1"]:::action\n`;
      if (flags.hasClientAbandonment) {
        d += `  L --> M[/"Paciencia Límite<br>Ab = t + ΔSC"/]:::fel\n`;
        d += `  M --> Z\n`;
      } else {
        d += `  L --> Z\n`;
      }
    }
  } else if (config.topology === "ENCADENADOS") {
    d += `  ${currentNode} --> H["Llegada a S1"]:::action\n`;
    if (flags.singleWorkerChained) {
      d += `  H --> I["A Cola S1<br>Q(1) = Q(1) + 1"]:::action\n`;
      if (flags.hasClientAbandonment) {
        d += `  I --> J[/"Paciencia Límite<br>Ab = t + ΔSC"/]:::fel\n`;
        d += `  J --> K["checkWorker()"]:::action\n`;
        d += `  K --> Z(["Fin Llegada"]):::startEnd\n`;
      } else {
        d += `  I --> K["checkWorker()"]:::action\n`;
        d += `  K --> Z(["Fin Llegada"]):::startEnd\n`;
      }
    } else {
      d += `  H --> I{"¿S1 Libre?<br>PS(1) == 0"}:::decision\n`;
      d += `  I -->|Sí| J["Inicia S1<br>PS(1) = 1"]:::action\n`;
      d += `  J --> K[/"Fin Serv S1<br>FS(1) = t + ΔtS"/]:::fel\n`;
      d += `  K --> Z(["Fin Llegada"]):::startEnd\n`;
      d += `  I -->|No| L["Encolar S1<br>Q(1) = Q(1) + 1"]:::action\n`;
      if (flags.hasClientAbandonment) {
        d += `  L --> M[/"Paciencia Límite<br>Ab = t + ΔSC"/]:::fel\n`;
        d += `  M --> Z\n`;
      } else {
        d += `  L --> Z\n`;
      }
    }
  }

  return d;
}

export function generateServiceEndDiagram(config, flags) {
  let d = `flowchart TD\n${mermaidStyles}\n`;
  d += `  A(["Fin de Servicio<br>Actualizar t"]):::startEnd --> B["Actualizar métricas<br>Atendidos++"]:::action\n`;

  if (config.topology === "ENCADENADOS") {
    d += `  B --> C{"¿Última Etapa?<br>i == N"}:::decision\n`;
    d += `  C -->|Sí| D["Cliente Sale"]:::action\n`;
    d += `  D --> E["Completados++"]:::action\n`;
    d += `  C -->|No| F["Avanzar Etapa<br>i = i + 1"]:::action\n`;
    d += `  F --> G["Completados++"]:::action\n`;

    if (flags.singleWorkerChained) {
      d += `  E --> H["Servidor Libre<br>PS = 0"]:::action\n`;
      d += `  G --> I["A Cola Sig<br>Q(i+1) = Q(i+1) + 1"]:::action\n`;
      d += `  I --> H\n`;
      d += `  H --> J["checkWorker()"]:::action\n`;
      d += `  J --> Z(["Fin Salida"]):::startEnd\n`;
    } else {
      d += `  E --> H["Sig. Cliente Actual<br>Q(i) = Q(i) - 1"]:::action\n`;
      d += `  G --> I{"¿PS(i+1) Libre?<br>PS(i+1) == 0"}:::decision\n`;
      d += `  I -->|Sí| J["Inicia Siguiente<br>PS(i+1) = 1"]:::action\n`;
      d += `  J --> K[/"Fin Siguiente<br>FS(i+1) = t + ΔtS"/]:::fel\n`;
      d += `  I -->|No| L["A Cola Sig<br>Q(i+1) = Q(i+1) + 1"]:::action\n`;
      d += `  K --> H\n`;
      d += `  L --> H\n`;
      d += `  H --> Z(["Fin Salida"]):::startEnd\n`;
    }
  } else {
    d += `  B --> C["Cliente Sale"]:::action\n`;
    d += `  C --> D["Completados++"]:::action\n`;
    d += `  D --> E["Buscar prox cliente"]:::action\n`;

    if (config.topology === "COLA_UNICA") {
      d += `  Z(["Fin Salida"]):::startEnd\n`;
      if (flags.hasPriority) {
        d += `  E --> F{"¿Hay VIPs?<br>Q_VIP > 0"}:::decision\n`;
        d += `  F -->|Sí| G["Extraer VIP<br>Q_VIP = Q_VIP - 1"]:::action\n`;
        d += `  F -->|No| H{"¿Hay Normales?<br>Q > 0"}:::decision\n`;
        d += `  H -->|Sí| I["Extraer Normal<br>Q = Q - 1"]:::action\n`;
        d += `  H -->|No| J["Servidor Libre<br>PS = 0"]:::action\n`;
        
        if (flags.hasSecurityZone) {
          d += `  G --> G1{"¿VIP ignora SZ?"}:::decision\n`;
          d += `  G1 -->|Sí| K["Inicia Servicio<br>PS = 1"]:::action\n`;
          d += `  K --> L[/"Fin Servicio<br>FS = t + ΔtS"/]:::fel\n`;
          d += `  L --> Z\n`;
          
          d += `  G1 -->|No| G2["Cliente a Zona Seg<br>SZ = 1"]:::action\n`;
          d += `  G2 --> G3[/"Llegada a PS<br>LL_PS = t + ΔtSZ"/]:::fel\n`;
          d += `  G3 --> Z\n`;
          
          d += `  I --> I1["Cliente a Zona Seg<br>SZ = 1"]:::action\n`;
          d += `  I1 --> I2[/"Llegada a PS<br>LL_PS = t + ΔtSZ"/]:::fel\n`;
          d += `  I2 --> Z\n`;
        } else {
          d += `  G --> K["Inicia Servicio<br>PS = 1"]:::action\n`;
          d += `  I --> K\n`;
          d += `  K --> L[/"Fin Servicio<br>FS = t + ΔtS"/]:::fel\n`;
          d += `  L --> Z\n`;
        }
      } else {
        d += `  E --> H{"¿Hay fila?<br>Q > 0"}:::decision\n`;
        d += `  H -->|Sí| I["Extraer Cliente<br>Q = Q - 1"]:::action\n`;
        d += `  H -->|No| J["Servidor Libre<br>PS = 0"]:::action\n`;
        
        if (flags.hasSecurityZone) {
          d += `  I --> I1["Cliente a Zona Seg<br>SZ = 1"]:::action\n`;
          d += `  I1 --> I2[/"Llegada a PS<br>LL_PS = t + ΔtSZ"/]:::fel\n`;
          d += `  I2 --> Z\n`;
        } else {
          d += `  I --> K["Inicia Servicio<br>PS = 1"]:::action\n`;
          d += `  K --> L[/"Fin Servicio<br>FS = t + ΔtS"/]:::fel\n`;
          d += `  L --> Z\n`;
        }
      }
      
      d += `  J --> Z\n`;
    } else {
      // AISLADOS
      d += `  E --> F{"¿Hay fila local?<br>Q(i) > 0"}:::decision\n`;
      if (flags.hasPriority) {
        d += `  F -->|Sí| G1{"¿VIPs en S(i)?<br>Q_VIP(i) > 0"}:::decision\n`;
        d += `  G1 -->|Sí| G2["Extraer VIP<br>Q_VIP(i)--"]:::action\n`;
        d += `  G1 -->|No| G3["Extraer Normal<br>Q(i)--"]:::action\n`;
        d += `  G2 --> I["Inicia Servicio<br>PS(i) = 1"]:::action\n`;
        d += `  G3 --> I\n`;
      } else {
        d += `  F -->|Sí| G["Extraer Cliente<br>Q(i) = Q(i) - 1"]:::action\n`;
        d += `  G --> I["Inicia Servicio<br>PS(i) = 1"]:::action\n`;
      }
      d += `  F -->|No| H["Servidor Libre<br>PS(i) = 0"]:::action\n`;
      d += `  I --> J[/"Fin Servicio<br>FS(i) = t + ΔtS"/]:::fel\n`;
      d += `  J --> Z(["Fin Salida"]):::startEnd\n`;
      d += `  H --> Z\n`;
    }
  }
  
  return d;
}

export function generateBreakStartDiagram(config, flags) {
  let d = `flowchart TD\n${mermaidStyles}\n`;
  if (!flags.hasServerBreaks) {
    d += `  A(["Descansos OFF"]):::startEnd\n`;
    return d;
  }
  d += `  A(["Inicio Descanso<br>Actualizar t"]):::startEnd --> B["Servidor a Descanso<br>PS = A"]:::action\n`;
  d += `  B --> C[/"Fin Descanso<br>LS = t + ΔD"/]:::fel\n`;
  d += `  C --> D{"¿Estaba Ocupado?<br>PS == 1 (previo)"}:::decision\n`;
  d += `  D -->|Sí| E["Pausar Cliente"]:::action\n`;
  d += `  E --> F["Calc. Remanente<br>TR = FS - t"]:::action\n`;
  d += `  F --> G[/"Borrar FS anterior"/]:::fel\n`;
  d += `  G --> Z(["Fin Salida a Descanso"]):::startEnd\n`;
  d += `  D -->|No| Z\n`;

  return d;
}

export function generateBreakEndDiagram(config, flags) {
  let d = `flowchart TD\n${mermaidStyles}\n`;
  if (!flags.hasServerBreaks) {
    d += `  A(["Descansos OFF"]):::startEnd\n`;
    return d;
  }
  d += `  A(["Fin Descanso<br>Actualizar t"]):::startEnd --> B["Servidor Presente"]:::action\n`;
  d += `  B --> C[/"Próximo Descanso<br>SS = t + ΔT"/]:::fel\n`;
  d += `  C --> D{"¿Cliente Pausado?"}:::decision\n`;
  d += `  D -->|Sí| E["Reanudar Servicio<br>PS = 1"]:::action\n`;
  d += `  E --> F[/"Fin Servicio<br>FS = t + TR"/]:::fel\n`;
  d += `  F --> Z(["Fin Retorno"]):::startEnd\n`;
  d += `  D -->|No| G["PS = 0<br>Llamar next()"]:::action\n`;
  d += `  G --> Z\n`;

  return d;
}

export function generateAbandonmentDiagram(config, flags) {
  let d = `flowchart TD\n${mermaidStyles}\n`;
  if (!flags.hasClientAbandonment) {
    d += `  A(["Abandonos OFF"]):::startEnd\n`;
    return d;
  }
  d += `  A(["Vence Paciencia<br>Actualizar t"]):::startEnd --> B["Buscar en colas"]:::action\n`;
  d += `  B --> C{"¿Aún en Cola?"}:::decision\n`;
  d += `  C -->|Sí| D["Remover de Cola<br>Q = Q - 1"]:::action\n`;
  d += `  D --> E["Abandonos++"]:::endNode\n`;
  d += `  E --> Z(["Fin Abandono"]):::startEnd\n`;
  d += `  C -->|No| F["Ignorar (ya atendido)"]:::action\n`;
  d += `  F --> Z\n`;

  
  return d;
}

export function generateSecurityZoneEndDiagram(config, flags) {
  let d = `flowchart TD\n${mermaidStyles}\n`;
  if (!flags.hasSecurityZone) {
    d += `  A(["Zona Seg OFF"]):::startEnd\n`;
    return d;
  }
  
  d += `  A(["Llegada a PS (Fin de SZ)<br>Actualizar t"]):::startEnd --> B["Liberar Zona Seg<br>SZ = 0"]:::action\n`;
  d += `  B --> C{"¿PS Libre?<br>PS == 0"}:::decision\n`;
  d += `  C -->|Sí| D["Inicia Servicio<br>PS = 1"]:::action\n`;
  d += `  D --> E[/"Fin Servicio<br>FS = t + ΔtS"/]:::fel\n`;
  d += `  E --> Z(["Fin Evento"]):::startEnd\n`;
  
  if (flags.hasPriority) {
    d += `  C -->|No| F{"¿Es VIP?<br>isVIP == 1"}:::decision\n`;
    d += `  F -->|Sí| G["A Cola VIP<br>Q_VIP = Q_VIP + 1"]:::action\n`;
    d += `  F -->|No| H["A Cola Normal<br>Q = Q + 1"]:::action\n`;
    d += `  G --> Z\n`;
    d += `  H --> Z\n`;
  } else {
    d += `  C -->|No| H["A Cola Normal<br>Q = Q + 1"]:::action\n`;
    d += `  H --> Z\n`;
  }
  
  return d;
}
