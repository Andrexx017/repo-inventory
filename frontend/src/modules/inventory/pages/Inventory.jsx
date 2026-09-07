import { useEffect, useRef, useState } from 'react';
import AppShell from '../../../shared/components/AppShell';
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l6 6L20 6" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16l-6 7.5V19l-4 2v-8.5z" />
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

  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterPopoverRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target)) setFiltersOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const hasActiveFilters = itemCategoryFilter !== '' || itemStatusFilter !== '';

  const currentBranch = branches.find((b) => String(b.id) === branchId);
  const today = new Date().toISOString().slice(0, 10);

  const lowStockCount = items.filter((i) => i.minimumStock > 0 && i.currentQuantity <= i.minimumStock).length;
  const activeAlertsCount = alerts.filter((a) => a.status === 'pending').length;
  const inventoryValue = items.reduce((sum, i) => sum + i.currentQuantity * i.weightedAverageCost, 0);
  const movementsToday = movements.filter((m) => m.movementDate.slice(0, 10) === today);
  const incomingToday = movementsToday.filter((m) => isIncomingMovement(m.movementType)).length;
  const outgoingToday = movementsToday.length - incomingToday;

  const movementTypeOptions = direction === 'ingreso' ? INCOMING_TYPES : OUTGOING_TYPES;

  const branchSubtitle = currentBranch
    ? `${currentBranch.code} · ${currentBranch.name} · ${currentBranch.city}`
    : undefined;

  const branchPickerLabel = isGeneralAdmin
    ? 'Elige una sucursal'
    : canMutate
      ? 'Tu sucursal'
      : 'Solo lectura';

  return (
    <AppShell
      title="Inventario"
      subtitle={branchSubtitle}
      branches={branches}
      branchId={branchId}
      onBranchChange={setBranchId}
      branchLabel={branchPickerLabel}
    >
      <div className="inv-topline">
        <div className="inv-topline-left">
          {tab === 'existencias' && (
            <div className="inv-search-box">
              <SearchIcon />
              <input
                type="text"
                placeholder="Buscar producto por SKU o nombre"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>
          )}

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
            <div className="filter-popover" ref={filterPopoverRef}>
              <button
                type="button"
                className={`filter-btn ${hasActiveFilters ? 'filter-btn-active' : ''}`}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <FilterIcon />
                Filtros
                {hasActiveFilters && <span className="filter-dot" />}
              </button>

              {filtersOpen && (
                <div className="filter-dropdown">
                  <div className="field" style={{ margin: 0 }}>
                    <label htmlFor="inv-item-category">Categoría</label>
                    <select
                      id="inv-item-category"
                      value={itemCategoryFilter}
                      onChange={(e) => setItemCategoryFilter(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label htmlFor="inv-item-status">Estado</label>
                    <select
                      id="inv-item-status"
                      value={itemStatusFilter}
                      onChange={(e) => setItemStatusFilter(e.target.value)}
                    >
                      {STOCK_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'existencias' && (
            <span className="inv-filter-hint">
              {itemsTotalCount} producto{itemsTotalCount === 1 ? '' : 's'} en esta sucursal
            </span>
          )}
        </div>

        <div className="inv-topline-actions">
          <div className="kpi-strip">
            <div className="kpi-strip-item">
              <span className="kpi-strip-label">PRODUCTOS</span>
              <span className="kpi-strip-value">{items.length}</span>
            </div>
            <div className="kpi-strip-item">
              <span className="kpi-strip-label">ALERTAS ACTIVAS</span>
              <span className="kpi-strip-value kpi-strip-value-warning">{activeAlertsCount}</span>
              <span className="kpi-strip-sub">{lowStockCount} bajo mínimo</span>
            </div>
            <div className="kpi-strip-item">
              <span className="kpi-strip-label">VALOR INVENTARIO</span>
              <span className="kpi-strip-value">{formatMoney(inventoryValue)}</span>
            </div>
            <div className="kpi-strip-item">
              <span className="kpi-strip-label">MOVIMIENTOS HOY</span>
              <span className="kpi-strip-value">{movementsToday.length}</span>
              <span className="kpi-strip-sub">{incomingToday} ing · {outgoingToday} ret</span>
            </div>
          </div>

          {canRegisterMovement && (
            <button type="button" className="btn-primary" onClick={openMovementModal}>
              <PlusIcon />
              Registrar movimiento
            </button>
          )}
        </div>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          {tab === 'existencias' && (
            <>
              {!canRegisterMovement && (
                canMutate ? (
                  <p className="inv-readonly-note">
                    Tu rol no registra movimientos de inventario directamente — es responsabilidad del Operador de inventario (o del Admin general).
                  </p>
                ) : (
                  <p className="inv-readonly-note">
                    Estás viendo el inventario de otra sucursal en modo solo lectura. Para registrar movimientos, cambiá a tu propia sucursal.
                  </p>
                )
              )}

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
                  <button type="button" className="btn-secondary btn-secondary-danger" onClick={cancelThresholdEdit}>Cancelar</button>
                </form>
              )}

              <div className="table-card inv-table-scroll">
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
                              <button type="button" className="btn-icon-square" onClick={() => handleEditThreshold(item)} aria-label="Editar umbral" title="Editar umbral">
                                <PencilIcon />
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

              <div className="table-card inv-table-scroll">
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

              <div className="table-card inv-table-scroll">
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
                              className="btn-icon-square btn-icon-square-success"
                              disabled={resolvingAlertId === a.id}
                              onClick={() => handleResolveAlert(a.id)}
                              aria-label="Resolver alerta"
                              title={resolvingAlertId === a.id ? 'Resolviendo…' : 'Resolver'}
                            >
                              <CheckIcon />
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
                <button type="button" className="btn-secondary btn-secondary-danger" onClick={closeMovementModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
