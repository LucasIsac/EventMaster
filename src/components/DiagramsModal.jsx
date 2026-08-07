import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Network, X, Info, Code, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const [currentMermaidCode, setCurrentMermaidCode] = useState('');
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
      return;
    }

    // Si el caso tiene caída catastrófica, seleccionar por defecto el evento exclusivo SS
    if (flags?.catastrophicBreakdown && activeTab === 'arrival') {
      setActiveTab('breakStart');
      return;
    }

    if (config && flags) {
      let diagramStr = '';
      if (activeTab === 'arrival') diagramStr = generateArrivalDiagram(config, flags);
      else if (activeTab === 'serviceEnd') diagramStr = generateServiceEndDiagram(config, flags);
      else if (activeTab === 'securityZoneEnd') diagramStr = generateSecurityZoneEndDiagram(config, flags);
      else if (activeTab === 'breakStart') diagramStr = generateBreakStartDiagram(config, flags);
      else if (activeTab === 'breakEnd') diagramStr = generateBreakEndDiagram(config, flags);
      else if (activeTab === 'abandonment') diagramStr = generateAbandonmentDiagram(config, flags);

      setCurrentMermaidCode(diagramStr);

      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = '';
        const id = `mermaid-svg-${Date.now()}`;
        mermaid.render(id, diagramStr).then(result => {
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = result.svg;
          }
        }).catch(err => {
          console.error('Error rendering mermaid diagram:', err);
        });
      }
    }
  }, [isOpen, activeTab, config, flags]);

  const handleCopyCode = () => {
    if (currentMermaidCode) {
      navigator.clipboard.writeText(currentMermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-content diagrams-modal" onClick={e => e.stopPropagation()} style={{ width: '92%', maxWidth: '1400px', height: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={24}/> Lógica Dinámica del Sistema (Diagrama & Código Mermaid)
          </h2>
          <button className="btn-close" onClick={onClose}><X size={20}/></button>
        </div>
        
        <div className="tabs" style={{ display: 'flex', gap: '10px', padding: '12px 20px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
          <button className={`btn ${activeTab === 'arrival' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('arrival')}>Llegada</button>
          <button className={`btn ${activeTab === 'serviceEnd' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('serviceEnd')}>Fin de Servicio</button>
          {flags.hasSecurityZone && (
            <button className={`btn ${activeTab === 'securityZoneEnd' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('securityZoneEnd')}>Llegada a PS</button>
          )}
          {flags.hasServerBreaks && (
            <>
              <button className={`btn ${activeTab === 'breakStart' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('breakStart')}>
                {flags.catastrophicBreakdown ? '⚡ Específico: Caída del Sistema (SS)' : 'Salida a Descanso'}
              </button>
              <button className={`btn ${activeTab === 'breakEnd' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('breakEnd')}>
                {flags.catastrophicBreakdown ? 'Restablecimiento (LS)' : 'Retorno de Descanso'}
              </button>
            </>
          )}
          {flags.hasClientAbandonment && (
            <button className={`btn ${activeTab === 'abandonment' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('abandonment')}>Abandono</button>
          )}
        </div>

        {/* Modal Body: Split view (Diagram vs Code) */}
        <div className="modal-body" style={{ flex: 1, overflow: 'hidden', display: 'flex', gap: '20px', padding: '20px', backgroundColor: '#f1f5f9' }}>
          
          {/* Columna Izquierda: Diagrama Visual */}
          <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '20px', overflow: 'auto', position: 'relative' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Network size={18}/> Diagrama de Flujo Visual
            </h3>
            <div ref={mermaidRef} style={{ width: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto' }}>
              {/* SVG rendered by Mermaid */}
            </div>

            {/* Glosario Flotante */}
            <div style={{ position: 'absolute', bottom: '15px', right: '15px' }}>
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
                  padding: '12px 16px',
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  marginTop: '8px',
                  minWidth: '220px'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#333', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
                    Glosario Académico
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '16px', color: '#555', lineHeight: '1.4' }}>
                    <li><strong>t</strong> = Reloj de Simulación</li>
                    <li><strong>PS</strong> = Servidor (0=Libre, 1=Ocupado, A=Ausente)</li>
                    <li><strong>Q</strong> = Tamaño de Cola</li>
                    <li><strong>LL</strong> = Próx. Llegada (t + ΔtLL)</li>
                    <li><strong>FS</strong> = Fin Servicio (t + ΔtS)</li>
                    <li><strong>SS</strong> = Inicio Descanso (t + ΔT)</li>
                    <li><strong>LS</strong> = Fin Descanso (t + ΔD)</li>
                    <li><strong>Ab</strong> = Paciencia Límite (t + ΔSC)</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Código Mermaid Raw */}
          <div style={{ flex: '0.8', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#f8fafc', padding: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code size={18}/> Código Mermaid (Diagrama)
              </h3>
              <button 
                onClick={handleCopyCode}
                className="btn"
                style={{ 
                  backgroundColor: copied ? '#16a34a' : '#2563eb', 
                  color: '#fff', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '6px 12px', 
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {copied ? <><Check size={14}/> ¡Copiado!</> : <><Copy size={14}/> Copiar Código</>}
              </button>
            </div>

            <pre style={{ 
              flex: 1, 
              overflow: 'auto', 
              margin: 0, 
              padding: '12px', 
              backgroundColor: '#020617', 
              borderRadius: '6px', 
              color: '#e2e8f0', 
              fontFamily: 'monospace', 
              fontSize: '0.82rem',
              lineHeight: '1.45',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {currentMermaidCode}
            </pre>
          </div>

        </div>
      </div>
    </div>
  );
}
