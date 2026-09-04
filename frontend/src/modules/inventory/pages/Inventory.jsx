import { useState } from 'react';
import AppShell from '../../../shared/components/AppShell';
import { KpiModal, KpiModalTrigger } from '../../../shared/components/KpiModal';
import {
  useInventory,
  INCOMING_TYPES,
  OUTGOING_TYPES,
  STOCK_STATUS_OPTIONS,
  isIncomingMovement,
  movementTypeLabel,
  stockStatus,
} from '../hooks/useInventory';
import './Inventory.css';

const STATUS_LABELS = { ok: 'OK', bajo: 'BAJO', critico: 'CRÍTICO' };
const STATUS_CLASSES = {
  ok: 'status-pill-active',
  bajo: 'status-pill-warn',
  critico: 'status-pill-inactive',
};

const ALERT_TYPE_LABELS = { low_stock: 'Stock bajo', high_stock: 'Stock alto' };
const ALERT_STATUS_LABELS = { pending: 'PENDIENTE', resolved: 'RESUELTA' };
const ALERT_STATUS_CLASSES = { pending: 'status-pill-warn', resolved: 'status-pill-active' };

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

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 3 7v10l9 5 9-5V7z" />
      <path d="M3 7l9 5 9-5" />
      <path d="M12 12v10" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 9v5M12 17h.01" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}

function formatMoney(value) {
  if (value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Inventory() {
  const {
    branches, products, categories, branchId, setBranchId, isGeneralAdmin, canMutate, canRegisterMovement,
    items, pagedItems, itemsPage, setItemsPage, itemsTotalCount, itemsTotalPages,
    itemSearch, setItemSearch, itemCategoryFilter, setItemCategoryFilter, itemStatusFilter, setItemStatusFilter,
    movements, alerts, loading, error,
    tab, setTab, movementFilterProductId, setMovementFilterProductId,
    movementFilterFrom, setMovementFilterFrom, movementFilterTo, setMovementFilterTo,
    movementsPage, setMovementsPage, movementsTotalPages,
    direction, handleDirectionChange,
    productId, setProductId,
    movementType, setMovementType,
    quantity, setQuantity,
    unitCost, setUnitCost,
    movementDate, setMovementDate,
    reason, setReason,
    formError, handleSubmitMovement,
    isMovementModalOpen, openMovementModal, closeMovementModal,
    thresholdEditingItem, thresholdMin, setThresholdMin, thresholdMax, setThresholdMax,
    thresholdError, handleEditThreshold, cancelThresholdEdit, handleSubmitThreshold,
    alertError, resolvingAlertId, handleResolveAlert,
  } = useInventory();

  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);

  const currentBranch = branches.find((b) => String(b.id) === branchId);
  const today = new Date().toISOString().slice(0, 10);

  const lowStockCount = items.filter((i) => i.minimumStock > 0 && i.currentQuantity <= i.minimumStock).length;
  const activeAlertsCount = alerts.filter((a) => a.status === 'pending').length;
  const inventoryValue = items.reduce((sum, i) => sum + i.currentQuantity * i.weightedAverageCost, 0);
  const movementsToday = movements.filter((m) => m.movementDate.slice(0, 10) === today);
  const incomingToday = movementsToday.filter((m) => isIncomingMovement(m.movementType)).length;
  const outgoingToday = movementsToday.length - incomingToday;

  const movementTypeOptions = direction === 'ingreso' ? INCOMING_TYPES : OUTGOING_TYPES;

  return (
    <AppShell title="Inventario">
      <div className="inv-topline">
        <div>
          <h1 className="page-title">Inventario</h1>
          {currentBranch && (
            <p className="page-subtitle mono">
              {currentBranch.code} · {currentBranch.name} · {currentBranch.city}
            </p>
          )}
        </div>

        <div className="inv-topline-actions">
          <KpiModalTrigger onClick={() => setIsKpiModalOpen(true)} />

          <div className="inv-branch-picker">
            <div className="inv-branch-row">
              {isGeneralAdmin && (
                <span className="status-pill status-pill-accent">ACCESO TOTAL</span>
              )}
              {!isGeneralAdmin && canMutate && (
                <span className="status-pill status-pill-accent">TU SUCURSAL</span>
              )}
              {!isGeneralAdmin && !canMutate && branchId && (
                <span className="status-pill status-pill-warn">SOLO LECTURA</span>
              )}
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name} — {branch.city}</option>
                ))}
              </select>
            </div>
            {!isGeneralAdmin && (
              <span className="inv-branch-note">Podés consultar otras sucursales en solo lectura.</span>
            )}
          </div>
        </div>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <KpiModal title="Indicadores — Inventario" open={isKpiModalOpen} onClose={() => setIsKpiModalOpen(false)}>
            <div className="inv-kpi-grid">
              <div className="inv-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge"><BoxIcon /></span>
                  <span className="inv-kpi-label">PRODUCTOS EN INVENTARIO</span>
                </div>
                <span className="inv-kpi-value">{items.length}</span>
              </div>
              <div className="inv-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge kpi-icon-badge-warning"><AlertIcon /></span>
                  <span className="inv-kpi-label">ALERTAS ACTIVAS</span>
                </div>
                <span className="inv-kpi-value inv-kpi-value-warning">{activeAlertsCount}</span>
                <span className="inv-kpi-sub">{lowStockCount} productos por debajo del mínimo</span>
              </div>
              <div className="inv-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge kpi-icon-badge-cyan"><CashIcon /></span>
                  <span className="inv-kpi-label">VALOR DE INVENTARIO</span>
                </div>
                <span className="inv-kpi-value">{formatMoney(inventoryValue)}</span>
                <span className="inv-kpi-sub">Costo promedio ponderado</span>
              </div>
              <div className="inv-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge kpi-icon-badge-success"><ActivityIcon /></span>
                  <span className="inv-kpi-label">MOVIMIENTOS HOY</span>
                </div>
                <span className="inv-kpi-value">{movementsToday.length}</span>
                <span className="inv-kpi-sub">{incomingToday} ingresos · {outgoingToday} retiros</span>
              </div>
            </div>
          </KpiModal>

          <div className="inv-tabs">
            <button
              type="button"
              className={`inv-tab ${tab === 'existencias' ? 'inv-tab-active' : ''}`}
              onClick={() => setTab('existencias')}
            >
              Existencias
            </button>
            <button
              type="button"
              className={`inv-tab ${tab === 'movimientos' ? 'inv-tab-active' : ''}`}
              onClick={() => setTab('movimientos')}
            >
              Movimientos
            </button>
            <button
              type="button"
              className={`inv-tab ${tab === 'alertas' ? 'inv-tab-active' : ''}`}
              onClick={() => setTab('alertas')}
            >
              Alertas{activeAlertsCount > 0 && ` (${activeAlertsCount})`}
            </button>
          </div>

          {tab === 'existencias' && (
            <>
              {canRegisterMovement ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-primary" onClick={openMovementModal}>
                    <PlusIcon />
                    Registrar movimiento
                  </button>
                </div>
              ) : canMutate ? (
                <p className="inv-readonly-note">
                  Tu rol no registra movimientos de inventario directamente — es responsabilidad del Operador de inventario (o del Admin general).
                </p>
              ) : (
                <p className="inv-readonly-note">
                  Estás viendo el inventario de otra sucursal en modo solo lectura. Para registrar movimientos, cambiá a tu propia sucursal.
                </p>
              )}

              <div className="filter-row">
                <div className="field" style={{ margin: 0, flex: '0 0 240px' }}>
                  <label htmlFor="inv-item-search">Buscar producto</label>
                  <input
                    id="inv-item-search"
                    type="text"
                    placeholder="SKU o nombre"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                </div>
                <div className="field" style={{ margin: 0, flex: '0 0 220px' }}>
                  <label htmlFor="inv-item-category">Categoría</label>
                  <select
                    id="inv-item-category"
                    style={{ width: '100%' }}
                    value={itemCategoryFilter}
                    onChange={(e) => setItemCategoryFilter(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ margin: 0, flex: '0 0 160px' }}>
                  <label htmlFor="inv-item-status">Estado</label>
                  <select
                    id="inv-item-status"
                    style={{ width: '100%' }}
                    value={itemStatusFilter}
                    onChange={(e) => setItemStatusFilter(e.target.value)}
                  >
                    {STOCK_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <span className="inv-filter-hint">
                  {itemsTotalCount} producto{itemsTotalCount === 1 ? '' : 's'} en esta sucursal
                </span>
              </div>

              {thresholdEditingItem && canMutate && (
                <form onSubmit={handleSubmitThreshold} className="form-card">
                  <h2>Umbral — {thresholdEditingItem.productName}</h2>
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <div className="field">
                      <label htmlFor="th-min">Stock mínimo</label>
                      <input
                        id="th-min"
                        type="number"
                        min="0"
                        step="0.01"
                        value={thresholdMin}
                        onChange={(e) => setThresholdMin(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="th-max">Stock máximo (opcional)</label>
                      <input
                        id="th-max"
                        type="number"
                        min="0"
                        step="0.01"
                        value={thresholdMax}
                        onChange={(e) => setThresholdMax(e.target.value)}
                      />
                    </div>
                  </div>

                  {thresholdError && <p className="form-error">{thresholdError}</p>}

                  <button type="submit" className="btn-primary">GUARDAR UMBRAL</button>
                  <button type="button" className="btn-secondary" onClick={cancelThresholdEdit}>Cancelar</button>
                </form>
              )}

              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>PRODUCTO</th>
                      <th>CATEGORÍA</th>
                      <th>UNIDAD</th>
                      <th>CANTIDAD</th>
                      <th>MÍNIMO</th>
                      <th>COSTO PROM.</th>
                      <th>ESTADO</th>
                      <th>ACTUALIZADO</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedItems.map((item) => {
                      const status = stockStatus(item);
                      return (
                        <tr key={item.id}>
                          <td className="mono">{item.productSku}</td>
                          <td style={{ fontWeight: 600 }}>{item.productName}</td>
                          <td>{item.categoryName || '—'}</td>
                          <td>{item.baseUnitName} ({item.baseUnitAbbreviation})</td>
                          <td className="mono">{item.currentQuantity}</td>
                          <td className="mono text-muted">{item.minimumStock}</td>
                          <td className="mono">{formatMoney(item.weightedAverageCost)}</td>
                          <td>
                            <span className={`status-pill ${STATUS_CLASSES[status]}`}>{STATUS_LABELS[status]}</span>
                          </td>
                          <td className="mono text-muted">{formatDateTime(item.updatedAt)}</td>
                          <td>
                            {canMutate && (
                              <button type="button" className="table-action" onClick={() => handleEditThreshold(item)}>
                                Umbral
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {pagedItems.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>
                          Ningún producto coincide con los filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="inv-pagination">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={itemsPage <= 1}
                  onClick={() => setItemsPage((p) => p - 1)}
                >
                  Anterior
                </button>
                <span className="mono text-muted">Página {itemsPage} de {itemsTotalPages}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={itemsPage >= itemsTotalPages}
                  onClick={() => setItemsPage((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            </>
          )}

          {tab === 'movimientos' && (
            <>
              <div className="inv-filter-row">
                <div className="field" style={{ margin: 0, flex: '0 0 260px' }}>
                  <label htmlFor="mv-filter">Filtrar por producto</label>
                  <select
                    id="mv-filter"
                    value={movementFilterProductId}
                    onChange={(e) => setMovementFilterProductId(e.target.value)}
                  >
                    <option value="">Todos los productos</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ margin: 0, flex: '0 0 160px' }}>
                  <label htmlFor="mv-filter-from">Desde</label>
                  <input
                    id="mv-filter-from"
                    type="date"
                    value={movementFilterFrom}
                    max={movementFilterTo || undefined}
                    onChange={(e) => setMovementFilterFrom(e.target.value)}
                  />
                </div>
                <div className="field" style={{ margin: 0, flex: '0 0 160px' }}>
                  <label htmlFor="mv-filter-to">Hasta</label>
                  <input
                    id="mv-filter-to"
                    type="date"
                    value={movementFilterTo}
                    min={movementFilterFrom || undefined}
                    onChange={(e) => setMovementFilterTo(e.target.value)}
                  />
                </div>
                <span className="inv-filter-hint">Trazabilidad completa — RF-11</span>
              </div>

              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>FECHA</th>
                      <th>PRODUCTO</th>
                      <th>TIPO</th>
                      <th>CANTIDAD</th>
                      <th>COSTO UNIT.</th>
                      <th>MOTIVO</th>
                      <th>RESPONSABLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const incoming = isIncomingMovement(m.movementType);
                      return (
                        <tr key={m.id}>
                          <td className="mono text-muted">{formatDateTime(m.movementDate)}</td>
                          <td style={{ fontWeight: 600 }}>{m.productName}</td>
                          <td>
                            <span className={`status-pill ${incoming ? 'status-pill-active' : 'status-pill-inactive'}`}>
                              {incoming ? 'INGRESO' : 'RETIRO'}
                            </span>
                          </td>
                          <td className={`mono ${incoming ? 'text-success' : 'text-danger'}`}>
                            {incoming ? '+' : '−'}{m.quantity}
                          </td>
                          <td className="mono text-muted">{formatMoney(m.unitCost)}</td>
                          <td>{movementTypeLabel(m.movementType)}</td>
                          <td>{m.responsibleUserName}</td>
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
                  disabled={movementsPage <= 1}
                  onClick={() => setMovementsPage((p) => p - 1)}
                >
                  Anterior
                </button>
                <span className="mono text-muted">Página {movementsPage} de {movementsTotalPages}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={movementsPage >= movementsTotalPages}
                  onClick={() => setMovementsPage((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            </>
          )}

          {tab === 'alertas' && (
            <>
              {alertError && <p className="form-error">{alertError}</p>}

              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>DISPARADA</th>
                      <th>PRODUCTO</th>
                      <th>TIPO</th>
                      <th>CANTIDAD</th>
                      <th>UMBRAL</th>
                      <th>ESTADO</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (
                      <tr key={a.id}>
                        <td className="mono text-muted">{formatDateTime(a.triggeredAt)}</td>
                        <td style={{ fontWeight: 600 }}>{a.productName}</td>
                        <td>{ALERT_TYPE_LABELS[a.alertType] || a.alertType}</td>
                        <td className="mono">{a.quantityAtTrigger}</td>
                        <td className="mono text-muted">{a.thresholdValue}</td>
                        <td>
                          <span className={`status-pill ${ALERT_STATUS_CLASSES[a.status]}`}>
                            {ALERT_STATUS_LABELS[a.status] || a.status}
                          </span>
                        </td>
                        <td>
                          {a.status === 'pending' && canMutate && (
                            <button
                              type="button"
                              className="table-action"
                              disabled={resolvingAlertId === a.id}
                              onClick={() => handleResolveAlert(a.id)}
                            >
                              {resolvingAlertId === a.id ? 'Resolviendo…' : 'Resolver'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {alerts.length === 0 && (
                  <p className="inv-readonly-note">No hay alertas registradas en esta sucursal.</p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {isMovementModalOpen && (
        <div className="modal-overlay" onClick={closeMovementModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="inv-movement-header" style={{ marginBottom: 0 }}>
                <h2 className="modal-title">Registrar movimiento</h2>
                <div className="inv-dir-toggle">
                  <button
                    type="button"
                    className={`inv-dir-btn ${direction === 'ingreso' ? 'inv-dir-btn-in-active' : ''}`}
                    onClick={() => handleDirectionChange('ingreso')}
                  >
                    ↓ Ingreso
                  </button>
                  <button
                    type="button"
                    className={`inv-dir-btn ${direction === 'retiro' ? 'inv-dir-btn-out-active' : ''}`}
                    onClick={() => handleDirectionChange('retiro')}
                  >
                    ↑ Retiro
                  </button>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={closeMovementModal} aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmitMovement}>
              <div className="modal-body">
                <div className="inv-movement-grid">
                  <div className="field">
                    <label htmlFor="mv-product">Producto</label>
                    <select id="mv-product" value={productId} onChange={(e) => setProductId(e.target.value)} required>
                      <option value="">Seleccione un producto</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="mv-type">Motivo</label>
                    <select id="mv-type" value={movementType} onChange={(e) => setMovementType(e.target.value)} required>
                      {movementTypeOptions.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="mv-quantity">Cantidad</label>
                    <input
                      id="mv-quantity"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>

                  {direction === 'ingreso' ? (
                    <div className="field">
                      <label htmlFor="mv-cost">Costo unitario</label>
                      <input
                        id="mv-cost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="field">
                      <label>Costo unitario</label>
                      <input value="No aplica" disabled />
                    </div>
                  )}

                  <div className="field">
                    <label htmlFor="mv-date">Fecha</label>
                    <input
                      id="mv-date"
                      type="date"
                      value={movementDate}
                      onChange={(e) => setMovementDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="mv-reason">Nota</label>
                  <input id="mv-reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
                </div>

                {formError && <p className="form-error" style={{ marginBottom: 0, marginTop: '14px' }}>{formError}</p>}
              </div>

              <div className="modal-footer">
                <button
                  type="submit"
                  className={`btn-primary ${direction === 'ingreso' ? 'inv-btn-in' : 'inv-btn-out'}`}
                >
                  {direction === 'ingreso' ? 'REGISTRAR INGRESO' : 'REGISTRAR RETIRO'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeMovementModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
