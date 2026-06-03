import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Network, X, Info } from 'lucide-react';
import {
  generateArrivalDiagram,
  generateServiceEndDiagram,
  generateBreakStartDiagram,
  generateBreakEndDiagram,
  generateAbandonmentDiagram
} from '../utils/diagramGenerators';

export function DiagramsModal({ isOpen, onClose, config, flags }) {
  const [activeTab, setActiveTab] = useState('arrival');
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
             backgroundColor: '#f8f9fa',
             border: '1px solid #ccc',
             borderRadius: '8px',
             padding: '12px',
             fontSize: '0.8rem',
             boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
             pointerEvents: 'none',
             opacity: 0.95
           }}>
             <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#333' }}><Info size={14}/> Glosario Académico</h4>
             <ul style={{ margin: 0, paddingLeft: '16px', listStyleType: 'circle', color: '#555', lineHeight: '1.4' }}>
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
        </div>
      </div>
    </div>
  );
}
