import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Network, X, Info } from 'lucide-react';
import {
  generateArrivalDiagram,
  generateServiceEndDiagram,
  generateBreakStartDiagram,
  generateBreakEndDiagram,
  generateAbandonmentDiagram,
  generateSecurityZoneEndDiagram
} from '../utils/diagramGenerators';

export function DiagramsModal({ isOpen, onClose, config, flags }) {
  const [activeTab, setActiveTab] = useState('arrival');
  const [showGlossary, setShowGlossary] = useState(false);
  const mermaidRef = useRef(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('arrival'); // Reset tab when closed
      return;
    }

    if (mermaidRef.current && config && flags) {
      let diagramStr = '';
      if (activeTab === 'arrival') diagramStr = generateArrivalDiagram(config, flags);
      else if (activeTab === 'serviceEnd') diagramStr = generateServiceEndDiagram(config, flags);
      else if (activeTab === 'securityZoneEnd') diagramStr = generateSecurityZoneEndDiagram(config, flags);
      else if (activeTab === 'breakStart') diagramStr = generateBreakStartDiagram(config, flags);
      else if (activeTab === 'breakEnd') diagramStr = generateBreakEndDiagram(config, flags);
      else if (activeTab === 'abandonment') diagramStr = generateAbandonmentDiagram(config, flags);

      // Limpiamos el SVG previo para evitar parpadeos
      mermaidRef.current.innerHTML = '';
      
      // Renderizamos el nuevo SVG usando un ID único para evitar colisiones
      const id = `mermaid-svg-${Date.now()}`;
      mermaid.render(id, diagramStr).then(result => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
        }
      }).catch(err => {
        console.error('Error rendering mermaid diagram:', err);
      });
    }
  }, [isOpen, activeTab, config, flags]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-content diagrams-modal" onClick={e => e.stopPropagation()} style={{ width: '85%', maxWidth: '1200px', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Network size={24}/> Lógica Dinámica del Sistema (Eventos)</h2>
          <button className="btn-close" onClick={onClose}><X size={20}/></button>
        </div>
        
        <div className="tabs" style={{ display: 'flex', gap: '10px', padding: '15px 20px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
          <button className={`btn ${activeTab === 'arrival' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('arrival')}>Llegada</button>
          <button className={`btn ${activeTab === 'serviceEnd' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('serviceEnd')}>Fin de Servicio</button>
          {flags.hasSecurityZone && (
            <button className={`btn ${activeTab === 'securityZoneEnd' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('securityZoneEnd')}>Llegada a PS</button>
          )}
          {flags.hasServerBreaks && (
            <>
              <button className={`btn ${activeTab === 'breakStart' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('breakStart')}>Salida a Descanso</button>
              <button className={`btn ${activeTab === 'breakEnd' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('breakEnd')}>Retorno de Descanso</button>
            </>
          )}
          {flags.hasClientAbandonment && (
            <button className={`btn ${activeTab === 'abandonment' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('abandonment')}>Abandono</button>
          )}
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '30px', backgroundColor: '#fff', position: 'relative' }}>
           <div ref={mermaidRef} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingBottom: '150px' }}>
             {/* El SVG de Mermaid será inyectado aquí */}
           </div>
           
           <div style={{
             position: 'absolute',
             bottom: '20px',
             right: '20px',
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'flex-end',
             gap: '10px'
           }}>
             <button 
               className="btn btn-outline" 
               onClick={() => setShowGlossary(!showGlossary)}
               style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
             >
               <Info size={16}/> {showGlossary ? 'Ocultar Glosario' : 'Ver Glosario'}
             </button>

             {showGlossary && (
               <div style={{
                 backgroundColor: '#f8f9fa',
                 border: '1px solid #ccc',
                 borderRadius: '8px',
                 padding: '16px',
                 fontSize: '0.85rem',
                 boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                 opacity: 0.98,
                 minWidth: '220px'
               }}>
                 <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>
                   Glosario Académico
                 </h4>
                 <ul style={{ margin: 0, paddingLeft: '16px', listStyleType: 'circle', color: '#555', lineHeight: '1.5' }}>
                   <li><strong>t</strong> = Reloj de Simulación</li>
                   <li><strong>PS</strong> = Servidor (0=Libre, 1=Ocupado, A=Ausente)</li>
                   <li><strong>Q</strong> = Tamaño de Cola</li>
                   <li><strong>LL</strong> = Próx. Llegada (t + ΔtLL)</li>
                   <li><strong>FS</strong> = Fin Servicio (t + ΔtS)</li>
                   <li><strong>SS</strong> = Inicio Descanso (t + ΔT)</li>
                   <li><strong>LS</strong> = Fin Descanso (t + ΔD)</li>
                   <li><strong>Ab</strong> = Paciencia Límite (t + ΔSC)</li>
                   <li><strong>TR</strong> = Tiempo Remanente</li>
                 </ul>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
