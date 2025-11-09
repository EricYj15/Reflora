import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import styles from './TrackingModal.module.css';

export default function TrackingModal({ trackingCode, onClose }) {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTracking();
  }, [trackingCode]);

  async function fetchTracking() {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch(`/api/tracking/${trackingCode}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Não foi possível consultar o rastreamento.');
      }

      setTracking(data.tracking);
    } catch (err) {
      console.error('Erro ao buscar rastreamento:', err);
      setTracking(null);
      setError(err.message || 'Não foi possível consultar o rastreamento. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) {
      return 'Data indisponível';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Rastreamento do Pedido</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>
              <p>Consultando rastreamento...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>{error}</p>
              <button onClick={fetchTracking} className={styles.retryButton}>
                Tentar Novamente
              </button>
            </div>
          ) : tracking ? (
            <>
              <div className={styles.trackingInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Código:</span>
                  <span className={styles.value}>{tracking.code}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.label}>Serviço:</span>
                  <span className={styles.value}>{tracking.service || 'Correios'}</span>
                </div>
              </div>

              <div className={styles.timeline}>
                <h3>Histórico de Movimentação</h3>
                {tracking.events && tracking.events.length > 0 ? (
                  <div className={styles.events}>
                    {tracking.events.map((event, index) => (
                      <div key={index} className={styles.event}>
                        <div className={styles.eventMarker}>
                          <div className={styles.eventDot}></div>
                          {index < tracking.events.length - 1 && (
                            <div className={styles.eventLine}></div>
                          )}
                        </div>
                        <div className={styles.eventContent}>
                          <div className={styles.eventDate}>
                            {formatDate(event.date)}
                          </div>
                          <div className={styles.eventStatus}>
                            {event.status}
                          </div>
                          {event.location && (
                            <div className={styles.eventLocation}>
                              📍 {event.location}
                            </div>
                          )}
                          {event.description && (
                            <div className={styles.eventDescription}>
                              {event.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.noEvents}>
                    Nenhum evento de rastreamento disponível ainda.
                  </p>
                )}
              </div>

              <div className={styles.footer}>
                <p className={styles.disclaimer}>
                  ℹ️ As informações são atualizadas automaticamente pelos Correios.
                  Em caso de dúvidas, entre em contato conosco.
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
