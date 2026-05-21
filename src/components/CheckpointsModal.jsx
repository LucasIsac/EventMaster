import React from 'react';
import { Camera, X } from 'lucide-react';

export function CheckpointsModal({ isOpen, onClose, checkpoints, formatTime, startTime }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Camera size={24}/> Galería de Fotos (Checkpoints)</h2>
          <button className="btn-close" onClick={onClose}><X size={20}/></button>
        </div>
        <div className="modal-body">
          {checkpoints && checkpoints.length > 0 ? (
            <div className="checkpoints-grid">
              {checkpoints.map((cp, i) => (
                <div key={i} className="checkpoint-card">
                  <div className="checkpoint-header">
                    <h4>#{i + 1} - {cp.name}</h4>
                    <span className="checkpoint-time">{formatTime(cp.time - startTime, startTime)}</span>
                  </div>
                  <div className="checkpoint-details">
                    <div className="detail-item">
                      <span className="label">Atendidos:</span>
                      <span className="value">{cp.stats.clientsServed}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Abandonos:</span>
                      <span className="value">{cp.stats.clientsAbandoned}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Cola Total:</span>
                      <span className="value">{cp.queueLength}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Estado Servidor:</span>
                      <span className="value">{cp.serverState}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Todavía no se ha capturado ninguna foto en esta simulación.</p>
              <p className="help-text">Asegúrate de configurar reglas y ejecutar la simulación para ver los resultados aquí.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
