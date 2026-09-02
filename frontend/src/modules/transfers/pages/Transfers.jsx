import { Fragment } from 'react';
import AppShell from '../../../shared/components/AppShell';
import {
  useTransfers,
  STATUS_LABELS,
  STATUS_CLASSES,
  URGENCY_LABELS,
  URGENCY_CLASSES,
  TREATMENT_LABELS,
} from '../hooks/useTransfers';
import './Transfers.css';

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatMoney(value) {
  if (value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatDelay(transfer) {
  if (transfer.deliveryDelayDays === null || transfer.deliveryDelayDays === undefined) {
    return { text: transfer.status === 'in_transit' ? 'Pendiente de llegada' : '—', color: 'var(--text-muted)' };
  }
  const days = Math.round(transfer.deliveryDelayDays * 10) / 10;
  if (days === 0) return { text: 'A tiempo', color: 'var(--success)' };
  const sign = days > 0 ? '+' : '−';
  return {
    text: `${sign}${Math.abs(days)} d`,
    color: days > 0 ? 'var(--warning)' : 'var(--success)',
  };
}

// Índice del paso alcanzado en el seguimiento visual — 'cancelled' se muestra
// aparte (banner), no como un quinto valor de este arreglo.
const STEP_ORDER = ['requested', 'preparing', 'in_transit', 'fully_received'];
function stepIndexFor(status) {
  if (status === 'partially_received') return 3;
  return STEP_ORDER.indexOf(status);
}

function Stepper({ transfer }) {
  if (transfer.status === 'cancelled') {
    return (
      <div className="trf-shortage-note" style={{ background: 'var(--danger-soft)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
        Esta transferencia fue cancelada.
      </div>
    );
  }

  const idx = stepIndexFor(transfer.status);
  const steps = [
    { label: 'Solicitada', date: formatDate(transfer.requestDate) },
    { label: 'En preparación', date: null },
    { label: 'En tránsito', date: idx >= 2 ? formatDateTime(transfer.actualShipDate) : null },
    {
      label: transfer.status === 'partially_received' ? 'Recibida con faltante' : 'Recibida',
      date: idx >= 3 ? formatDateTime(transfer.actualArrivalDate) : null,
    },
  ];

  return (
    <div className="trf-stepper">
      {steps.map((step, i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : 'pending';
        return (
          <Fragment key={step.label}>
            <div className="trf-step">
              <div className={`trf-step-dot trf-step-dot-${state}`}>
                {state === 'done' ? '✓' : i + 1}
              </div>
              <div className="trf-step-label" style={{ color: state === 'pending' ? 'var(--text-muted)' : 'var(--text)' }}>
                {step.label}
              </div>
              {step.date && <div className="trf-step-date text-muted">{step.date}</div>}
            </div>
            {i < steps.length - 1 && (
              <div className={`trf-step-line ${i < idx ? 'trf-step-line-done' : ''}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default function Transfers() {
  const {
    branches, branchId, setBranchId, isGeneralAdmin, canRequestTransfer,
    products, transfers, transfersPage, setTransfersPage, transfersTotalPages, transfersKpi, loading, error,
    tab, setTab,
    transfersFilterFrom, setTransfersFilterFrom, transfersFilterTo, setTransfersFilterTo,
    originBranchId, setOriginBranchId, urgency, setUrgency,
    lines, addLine, removeLine, updateLine,
    formError, formSuccess, handleCreateTransfer,
    isRequestModalOpen, openRequestModal, closeRequestModal,
    viewTransfer, openView, closeView,
    prepareTarget, prepareQuantities, setPrepareQuantity, prepareNotes, setPrepareNotes, prepareError,
    openPrepare, closePrepare, handleSubmitPrepare,
    shipTarget, carrier, setCarrier, estimatedDeliveryDate, setEstimatedDeliveryDate,
    routePriority, setRoutePriority, shippingCost, setShippingCost, shipNotes, setShipNotes, shipError,
    openShip, closeShip, handleSubmitShip,
    receiveTarget, receiveQuantities, setReceiveQuantity, receiveHasShortage,
    treatment, setTreatment, receiveNotes, setReceiveNotes, receiveError,
    openReceive, closeReceive, handleSubmitReceive,
    canPrepare, canShip, canReceiveTransfer,
  } = useTransfers();

  // transfersKpi viene de un endpoint de agregados aparte (GetKpiSummaryAsync)
  // — no se puede calcular desde `transfers` porque esa lista ahora está
  // paginada (y filtrada por la pestaña activa).
  const enTransito = transfersKpi?.inTransit ?? 0;
  const pendientesAccion = transfersKpi?.pendingAction ?? 0;
  const recibidasEsteMesCount = transfersKpi?.receivedThisMonth ?? 0;
  const conFaltante = transfersKpi?.receivedWithShortageThisMonth ?? 0;
  const avgDelay = transfersKpi?.averageDelayDays ?? null;

  return (
    <AppShell title="Transferencias">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <h1 className="page-title">Transferencias</h1>

        {isGeneralAdmin && (
          <div className="field" style={{ margin: 0, flex: '0 0 260px' }}>
            <label htmlFor="trf-branch">Sucursal</label>
            <select id="trf-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="trf-kpi-grid">
            <div className="trf-kpi-card">
              <span className="trf-kpi-label">EN TRÁNSITO</span>
              <span className="trf-kpi-value trf-kpi-value-cyan">{enTransito}</span>
              <span className="trf-kpi-sub">Camino a su destino</span>
            </div>
            <div className="trf-kpi-card">
              <span className="trf-kpi-label">PENDIENTES DE ACCIÓN</span>
              <span className="trf-kpi-value trf-kpi-value-warning">{pendientesAccion}</span>
              <span className="trf-kpi-sub">Solicitadas o en preparación</span>
            </div>
            <div className="trf-kpi-card">
              <span className="trf-kpi-label">RECIBIDAS ESTE MES</span>
              <span className="trf-kpi-value">{recibidasEsteMesCount}</span>
              <span className="trf-kpi-sub">{conFaltante} con faltante detectado</span>
            </div>
            <div className="trf-kpi-card">
              <span className="trf-kpi-label">RETRASO PROMEDIO</span>
              <span className="trf-kpi-value" style={{ color: avgDelay > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {avgDelay === null ? '—' : `${avgDelay > 0 ? '+' : '−'}${Math.abs(Math.round(avgDelay * 10) / 10)} d`}
              </span>
              <span className="trf-kpi-sub">Estimado vs. real de llegada</span>
            </div>
          </div>

          <div className="trf-tabs">
            <button type="button" className={`trf-tab ${tab === 'todas' ? 'trf-tab-active' : ''}`} onClick={() => setTab('todas')}>Todas</button>
            <button type="button" className={`trf-tab ${tab === 'solicitadas' ? 'trf-tab-active' : ''}`} onClick={() => setTab('solicitadas')}>Solicitadas</button>
            <button type="button" className={`trf-tab ${tab === 'transito' ? 'trf-tab-active' : ''}`} onClick={() => setTab('transito')}>En tránsito</button>
            <button type="button" className={`trf-tab ${tab === 'recibidas' ? 'trf-tab-active' : ''}`} onClick={() => setTab('recibidas')}>Recibidas</button>
          </div>

          {canRequestTransfer && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-primary" onClick={openRequestModal}>
                <PlusIcon />
                Solicitar transferencia
              </button>
            </div>
          )}

          <div className="filter-row">
            <div className="field" style={{ margin: 0, flex: '0 0 160px' }}>
              <label htmlFor="trf-filter-from">Desde</label>
              <input
                id="trf-filter-from"
                type="date"
                value={transfersFilterFrom}
                max={transfersFilterTo || undefined}
                onChange={(e) => setTransfersFilterFrom(e.target.value)}
              />
            </div>
            <div className="field" style={{ margin: 0, flex: '0 0 160px' }}>
              <label htmlFor="trf-filter-to">Hasta</label>
              <input
                id="trf-filter-to"
                type="date"
                value={transfersFilterTo}
                min={transfersFilterFrom || undefined}
                onChange={(e) => setTransfersFilterTo(e.target.value)}
              />
            </div>
            <span className="inv-filter-hint" style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '12.5px' }}>
              Filtra por fecha de solicitud
            </span>
          </div>

          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° TRANSFERENCIA</th>
                  <th>ORIGEN</th>
                  <th>DESTINO</th>
                  <th>URGENCIA</th>
                  <th>ESTADO</th>
                  <th>SOLICITADA</th>
                  <th>TRANSPORTISTA</th>
                  <th>RETRASO</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => {
                  const delay = formatDelay(t);
                  return (
                    <tr key={t.id}>
                      <td className="mono">{t.transferNumber}</td>
                      <td>{t.originBranchName}</td>
                      <td>{t.destinationBranchName}</td>
                      <td><span className={`status-pill ${URGENCY_CLASSES[t.urgency]}`}>{URGENCY_LABELS[t.urgency]}</span></td>
                      <td><span className={`status-pill ${STATUS_CLASSES[t.status]}`}>{STATUS_LABELS[t.status]}</span></td>
                      <td className="mono text-muted">{formatDate(t.requestDate)}</td>
                      <td className="text-muted">{t.carrier || '—'}</td>
                      <td className="mono" style={{ color: delay.color }}>{delay.text}</td>
                      <td>
                        <div className="trf-actions">
                          <button type="button" className="trf-action-view" onClick={() => openView(t)}>Ver detalle</button>
                          {canPrepare(t) && <button type="button" className="trf-action-prepare" onClick={() => openPrepare(t)}>Preparar</button>}
                          {canShip(t) && <button type="button" className="trf-action-ship" onClick={() => openShip(t)}>Despachar</button>}
                          {canReceiveTransfer(t) && <button type="button" className="trf-action-receive" onClick={() => openReceive(t)}>Recibir</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="inv-pagination">
            <button
              type="button"
              className="btn-secondary"
              disabled={transfersPage <= 1}
              onClick={() => setTransfersPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span className="mono text-muted">Página {transfersPage} de {transfersTotalPages}</span>
            <button
              type="button"
              className="btn-secondary"
              disabled={transfersPage >= transfersTotalPages}
              onClick={() => setTransfersPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>

          {viewTransfer && (
            <div className="form-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ margin: 0 }}>{viewTransfer.transferNumber}</h2>
                  <div className="trf-route text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                    <span>{viewTransfer.originBranchName}</span>
                    <svg className="trf-route-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    <span>{viewTransfer.destinationBranchName}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`status-pill ${STATUS_CLASSES[viewTransfer.status]}`}>{STATUS_LABELS[viewTransfer.status]}</span>
                  <button type="button" className="btn-secondary" onClick={closeView} style={{ marginLeft: 0 }}>Cerrar</button>
                </div>
              </div>

              <div className="trf-logistics-grid">
                <div className="trf-logistics-field"><div className="trf-lf-label">Transportista</div><div className="trf-lf-value">{viewTransfer.carrier || '—'}</div></div>
                <div className="trf-logistics-field"><div className="trf-lf-label">Costo de envío</div><div className="trf-lf-value">{formatMoney(viewTransfer.shippingCost)}</div></div>
                <div className="trf-logistics-field"><div className="trf-lf-label">Prioridad de ruta</div><div className="trf-lf-value">{viewTransfer.routePriority ? URGENCY_LABELS[viewTransfer.routePriority] : '—'}</div></div>
                <div className="trf-logistics-field">
                  <div className="trf-lf-label">Retraso (estimado vs. real)</div>
                  <div className="trf-lf-value" style={{ color: formatDelay(viewTransfer).color }}>{formatDelay(viewTransfer).text}</div>
                </div>
                <div className="trf-logistics-field"><div className="trf-lf-label">Llegada estimada</div><div className="trf-lf-value">{formatDate(viewTransfer.estimatedArrivalDate)}</div></div>
                <div className="trf-logistics-field"><div className="trf-lf-label">Llegada real</div><div className="trf-lf-value">{formatDateTime(viewTransfer.actualArrivalDate)}</div></div>
              </div>

              <Stepper transfer={viewTransfer} />

              <div className="trf-lines-table" style={{ marginTop: '16px' }}>
                <table>
                  <thead>
                    <tr><th>Producto</th><th>Cant. solicitada</th><th>Cant. despachada</th><th>Cant. recibida</th><th>Diferencia</th></tr>
                  </thead>
                  <tbody>
                    {viewTransfer.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.productName}<span className="text-muted mono" style={{ fontSize: '11px', display: 'block' }}>{item.productSku}</span></td>
                        <td className="mono">{item.requestedQuantity}</td>
                        <td className="mono text-muted">{item.shippedQuantity}</td>
                        <td className="mono text-muted">{item.receivedQuantity}</td>
                        <td className="mono" style={{ color: item.difference > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{item.difference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {prepareTarget && (
            <form onSubmit={handleSubmitPrepare} className="form-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ margin: 0 }}>Preparar despacho — {prepareTarget.transferNumber}</h2>
                <button type="button" className="btn-secondary" onClick={closePrepare} style={{ marginLeft: 0 }}>Cerrar</button>
              </div>

              <div className="trf-lines-table">
                <table>
                  <thead><tr><th>Producto</th><th>Cant. solicitada</th><th>Cant. a despachar</th></tr></thead>
                  <tbody>
                    {prepareTarget.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.productName}</td>
                        <td className="mono">{item.requestedQuantity}</td>
                        <td>
                          <input
                            type="number" min="0" max={item.requestedQuantity} step="0.01"
                            value={prepareQuantities[item.id] ?? ''}
                            onChange={(e) => setPrepareQuantity(item.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="field" style={{ marginBottom: '16px' }}>
                <label htmlFor="prepare-notes">Notas (opcional)</label>
                <input id="prepare-notes" value={prepareNotes} onChange={(e) => setPrepareNotes(e.target.value)} />
              </div>

              {prepareError && <p className="form-error">{prepareError}</p>}

              <button type="submit" className="btn-primary">CONFIRMAR PREPARACIÓN</button>
            </form>
          )}

          {shipTarget && (
            <form onSubmit={handleSubmitShip} className="form-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ margin: 0 }}>Despachar transferencia — {shipTarget.transferNumber}</h2>
                <button type="button" className="btn-secondary" onClick={closeShip} style={{ marginLeft: 0 }}>Cerrar</button>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="field">
                  <label htmlFor="ship-carrier">Transportista</label>
                  <input id="ship-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Ej. Transportes Rápido S.A.S." />
                </div>
                <div className="field">
                  <label htmlFor="ship-eta">Fecha estimada de llegada</label>
                  <input id="ship-eta" type="date" value={estimatedDeliveryDate} onChange={(e) => setEstimatedDeliveryDate(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="ship-priority">Prioridad de ruta (opcional)</label>
                  <select id="ship-priority" value={routePriority} onChange={(e) => setRoutePriority(e.target.value)}>
                    <option value="">Sin definir</option>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="ship-cost">Costo de envío (opcional)</label>
                  <input id="ship-cost" type="number" min="0" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
                </div>
              </div>

              <div className="field" style={{ marginBottom: '16px' }}>
                <label htmlFor="ship-notes">Notas (opcional)</label>
                <input id="ship-notes" value={shipNotes} onChange={(e) => setShipNotes(e.target.value)} />
              </div>

              {shipError && <p className="form-error">{shipError}</p>}

              <button type="submit" className="btn-primary">CONFIRMAR DESPACHO</button>
            </form>
          )}

          {receiveTarget && (
            <form onSubmit={handleSubmitReceive} className="form-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h2 style={{ margin: 0 }}>Confirmar recepción — {receiveTarget.transferNumber}</h2>
                <button type="button" className="btn-secondary" onClick={closeReceive} style={{ marginLeft: 0 }}>Cerrar</button>
              </div>

              <div className="trf-lines-table">
                <table>
                  <thead><tr><th>Producto</th><th>Cant. despachada</th><th>Cant. recibida</th></tr></thead>
                  <tbody>
                    {receiveTarget.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.productName}</td>
                        <td className="mono">{item.shippedQuantity}</td>
                        <td>
                          <input
                            type="number" min="0" max={item.shippedQuantity} step="0.01"
                            value={receiveQuantities[item.id] ?? ''}
                            onChange={(e) => setReceiveQuantity(item.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {receiveHasShortage && (
                <div className="trf-shortage-note">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
                  Hay una diferencia entre lo despachado y lo recibido. El tratamiento del faltante es obligatorio antes de confirmar.
                </div>
              )}

              <div className="form-grid" style={{ gridTemplateColumns: receiveHasShortage ? '1fr 1fr' : '1fr' }}>
                {receiveHasShortage && (
                  <div className="field">
                    <label htmlFor="receive-treatment">Tratamiento del faltante</label>
                    <select id="receive-treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)}>
                      <option value="">Seleccione un tratamiento</option>
                      {Object.entries(TREATMENT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label htmlFor="receive-notes">Notas (opcional)</label>
                  <input id="receive-notes" value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} />
                </div>
              </div>

              {receiveError && <p className="form-error">{receiveError}</p>}

              <button type="submit" className="btn-primary">CONFIRMAR RECEPCIÓN</button>
            </form>
          )}
        </>
      )}

      {isRequestModalOpen && (
        <div className="modal-overlay" onClick={closeRequestModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Solicitar transferencia</h2>
              <button type="button" className="modal-close" onClick={closeRequestModal} aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer}>
              <div className="modal-body">
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="field">
                    <label htmlFor="trf-origin">Sucursal origen</label>
                    <select id="trf-origin" value={originBranchId} onChange={(e) => setOriginBranchId(e.target.value)}>
                      <option value="">Seleccione una sucursal</option>
                      {branches.filter((b) => String(b.id) !== String(branchId)).map((b) => (
                        <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="trf-urgency">Urgencia</label>
                    <select id="trf-urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>

                <div className="trf-lines-table">
                  <table>
                    <thead>
                      <tr><th>Producto</th><th>Cantidad solicitada</th><th></th></tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => (
                        <tr key={i}>
                          <td>
                            <select value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)}>
                              <option value="">Seleccione</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number" min="0.01" step="0.01"
                              value={line.requestedQuantity}
                              onChange={(e) => updateLine(i, 'requestedQuantity', e.target.value)}
                            />
                          </td>
                          <td>
                            {lines.length > 1 && (
                              <button type="button" className="trf-remove-line" onClick={() => removeLine(i)}>Quitar</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="trf-form-note">
                  La sucursal destino es la tuya — se toma de tu sesión, no se elige acá. La sucursal origen revisará
                  disponibilidad y confirmará cuánto puede despachar de cada línea.
                </p>

                <button type="button" className="trf-add-line" onClick={addLine}>+ Agregar línea</button>

                {formError && <p className="form-error" style={{ marginBottom: 0 }}>{formError}</p>}
                {formSuccess && <p className="trf-form-success" style={{ marginBottom: 0 }}>{formSuccess}</p>}
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-primary">SOLICITAR TRANSFERENCIA</button>
                <button type="button" className="btn-secondary" onClick={closeRequestModal}>Cerrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
