import { useEffect, useRef, useState } from 'react';
import AppShell from '../../../shared/components/AppShell';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';
import { usePurchases, ORDER_STATUS_LABELS } from '../hooks/usePurchases';
import './Purchases.css';

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

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16l-6 7.5V19l-4 2v-8.5z" />
    </svg>
  );
}

const STATUS_CLASSES = {
  draft: 'status-pill-muted',
  confirmed: 'status-pill-cyan',
  partially_received: 'status-pill-warn',
  fully_received: 'status-pill-active',
  cancelled: 'status-pill-inactive',
};

function formatMoney(value) {
  if (value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Purchases() {
  const {
    branches, branchId, setBranchId, isGeneralAdmin, canManageOrders,
    suppliers, products, orders, ordersPage, setOrdersPage, ordersTotalPages, ordersKpi, loading, error,
    tab, setTab, supplierFilter, setSupplierFilter,
    ordersFilterFrom, setOrdersFilterFrom, ordersFilterTo, setOrdersFilterTo,
    supplierId, setSupplierId, paymentTermDays, setPaymentTermDays,
    lines, addLine, removeLine, updateLine, lineAmounts, orderTotals,
    formError, handleCreateOrder,
    isOrderModalOpen, openOrderModal, closeOrderModal,
    handleCancel, canCancel, canReceive,
    receiptOrder, receiptPending, receiptQuantities, setReceiptQuantity,
    receiptNotes, setReceiptNotes, receiptError, openReceipt, closeReceipt, handleSubmitReceipt,
  } = usePurchases();

  const [cancelTarget, setCancelTarget] = useState(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterPopoverRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target)) setFiltersOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const hasActiveFilters = supplierFilter !== '' || ordersFilterFrom !== '' || ordersFilterTo !== '';

  // ordersKpi viene de un endpoint de agregados aparte (GetKpiSummaryAsync) —
  // no se puede calcular desde `orders` porque esa lista ahora está paginada.
  const monthValue = ordersKpi?.monthValue ?? 0;
  const activeOrders = ordersKpi?.activeOrders ?? 0;
  const pendingApproval = ordersKpi?.pendingApproval ?? 0;
  const pendingReceipts = ordersKpi?.pendingReceipts ?? 0;

  const currentBranch = branches.find((b) => String(b.id) === branchId);
  const branchSubtitle = currentBranch
    ? `${currentBranch.code} · ${currentBranch.name} · ${currentBranch.city}`
    : undefined;

  return (
    <AppShell
      title="Compras"
      subtitle={branchSubtitle}
      branches={isGeneralAdmin ? branches : undefined}
      branchId={branchId}
      onBranchChange={setBranchId}
      branchLabel="Elige una sucursal"
    >
      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="pur-tabs-row">
            <div className="tabs-left">
              <div className="pur-tabs">
                <button
                  type="button"
                  className={`pur-tab ${tab === 'ordenes' ? 'pur-tab-active' : ''}`}
                  onClick={() => setTab('ordenes')}
                >
                  Órdenes de compra
                </button>
                <button
                  type="button"
                  className={`pur-tab ${tab === 'proveedores' ? 'pur-tab-active' : ''}`}
                  onClick={() => setTab('proveedores')}
                >
                  Proveedores
                </button>
              </div>

              {tab === 'ordenes' && (
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
                        <label htmlFor="po-filter">Filtrar por proveedor</label>
                        <select id="po-filter" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
                          <option value="">Todos los proveedores</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label htmlFor="po-filter-from">Desde</label>
                        <input
                          id="po-filter-from"
                          type="date"
                          value={ordersFilterFrom}
                          max={ordersFilterTo || undefined}
                          onChange={(e) => setOrdersFilterFrom(e.target.value)}
                        />
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label htmlFor="po-filter-to">Hasta</label>
                        <input
                          id="po-filter-to"
                          type="date"
                          value={ordersFilterTo}
                          min={ordersFilterFrom || undefined}
                          onChange={(e) => setOrdersFilterTo(e.target.value)}
                        />
                      </div>
                      <span className="filter-dropdown-hint">Histórico por proveedor — RF-14</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="tabs-actions">
              <div className="kpi-strip">
                <div className="kpi-strip-item">
                  <span className="kpi-strip-label">ÓRDENES ACTIVAS</span>
                  <span className="kpi-strip-value">{activeOrders}</span>
                  <span className="kpi-strip-sub">No canceladas ni completas</span>
                </div>
                <div className="kpi-strip-item">
                  <span className="kpi-strip-label">PENDIENTES DE APROBAR</span>
                  <span className="kpi-strip-value kpi-strip-value-warning">{pendingApproval}</span>
                  <span className="kpi-strip-sub">En estado borrador</span>
                </div>
                <div className="kpi-strip-item">
                  <span className="kpi-strip-label">VALOR DEL MES</span>
                  <span className="kpi-strip-value">{formatMoney(monthValue)}</span>
                  <span className="kpi-strip-sub">Órdenes de este mes</span>
                </div>
                <div className="kpi-strip-item">
                  <span className="kpi-strip-label">RECEPCIONES PENDIENTES</span>
                  <span className="kpi-strip-value kpi-strip-value-cyan">{pendingReceipts}</span>
                  <span className="kpi-strip-sub">Confirmadas o parciales</span>
                </div>
              </div>

              {tab === 'ordenes' && canManageOrders && (
                <button type="button" className="btn-primary" onClick={openOrderModal}>
                  <PlusIcon />
                  Crear orden
                </button>
              )}
            </div>
          </div>

          {tab === 'ordenes' && (
            <>
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>N° ORDEN</th>
                      <th>PROVEEDOR</th>
                      <th>FECHA</th>
                      <th>PLAZO</th>
                      <th>TOTAL</th>
                      <th>ESTADO</th>
                      <th className="pur-actions-header"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="mono">{order.orderNumber}</td>
                        <td>{order.supplierName}</td>
                        <td className="mono text-muted">{formatDate(order.orderDate)}</td>
                        <td>{order.paymentTermDays ? `${order.paymentTermDays} días` : 'Contado'}</td>
                        <td className="mono">{formatMoney(order.total)}</td>
                        <td>
                          <span className={`status-pill ${STATUS_CLASSES[order.status]}`}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </span>
                        </td>
                        <td className="pur-actions">
                          <div className="pur-actions-inner">
                            {canReceive(order) && (
                              <button type="button" className="pur-action-receive" onClick={() => openReceipt(order)}>Recibir</button>
                            )}
                            {canCancel(order) && (
                              <button type="button" className="pur-action-cancel" onClick={() => setCancelTarget(order)}>Cancelar</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="inv-pagination">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={ordersPage <= 1}
                  onClick={() => setOrdersPage((p) => p - 1)}
                >
                  Anterior
                </button>
                <span className="mono text-muted">Página {ordersPage} de {ordersTotalPages}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={ordersPage >= ordersTotalPages}
                  onClick={() => setOrdersPage((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>

              <ConfirmModal
                open={!!cancelTarget}
                title="Cancelar orden de compra"
                message={
                  cancelTarget
                    ? `¿Seguro que querés cancelar la orden ${cancelTarget.orderNumber} (${cancelTarget.supplierName})? Esta acción no se puede deshacer.`
                    : ''
                }
                confirmLabel="Cancelar orden"
                tone="danger"
                onConfirm={() => {
                  handleCancel(cancelTarget);
                  setCancelTarget(null);
                }}
                onCancel={() => setCancelTarget(null)}
              />

              {receiptOrder && (
                <div className="modal-overlay" onClick={closeReceipt}>
                  <div className="modal-panel modal-panel-lg" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2 className="modal-title">Confirmar recepción — {receiptOrder.orderNumber} · {receiptOrder.supplierName}</h2>
                      <button type="button" className="modal-close" onClick={closeReceipt} aria-label="Cerrar">
                        <CloseIcon />
                      </button>
                    </div>

                    <form onSubmit={handleSubmitReceipt}>
                      <div className="modal-body">
                        <div className="pur-lines-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Producto</th>
                                <th>Pedido</th>
                                <th>Pendiente</th>
                                <th>Recibido ahora</th>
                              </tr>
                            </thead>
                            <tbody>
                              {receiptOrder.items.map((item) => (
                                <tr key={item.id}>
                                  <td>{item.productName}</td>
                                  <td className="mono text-muted">{item.quantity}</td>
                                  <td className="mono text-muted">{receiptPending[item.id]}</td>
                                  <td>
                                    <input
                                      type="number" min="0" max={receiptPending[item.id]} step="0.01"
                                      value={receiptQuantities[item.id] ?? ''}
                                      disabled={receiptPending[item.id] <= 0}
                                      onChange={(e) => setReceiptQuantity(item.id, e.target.value)}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="field" style={{ marginBottom: 0 }}>
                          <label htmlFor="receipt-notes">Notas</label>
                          <input id="receipt-notes" value={receiptNotes} onChange={(e) => setReceiptNotes(e.target.value)} />
                        </div>

                        {receiptError && <p className="form-error" style={{ marginBottom: 0, marginTop: '14px' }}>{receiptError}</p>}
                      </div>

                      <div className="modal-footer">
                        <button type="submit" className="btn-primary">CONFIRMAR RECEPCIÓN</button>
                        <button type="button" className="btn-secondary btn-secondary-danger" onClick={closeReceipt}>Cancelar</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'proveedores' && (
            <>
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>NOMBRE</th>
                      <th>NIT</th>
                      <th>CONTACTO</th>
                      <th>TELÉFONO</th>
                      <th>EMAIL</th>
                      <th>DIRECCIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td className="mono text-muted">{s.taxId || '—'}</td>
                        <td>{s.contactName || '—'}</td>
                        <td className="mono">{s.phone || '—'}</td>
                        <td className="mono">{s.email || '—'}</td>
                        <td className="text-muted">{s.address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="page-subtitle">Catálogo de proveedores de solo lectura.</p>
            </>
          )}
        </>
      )}

      {isOrderModalOpen && (
        <div className="modal-overlay" onClick={closeOrderModal}>
          <div className="modal-panel modal-panel-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva orden de compra</h2>
              <button type="button" className="modal-close" onClick={closeOrderModal} aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleCreateOrder}>
              <div className="modal-body">
                <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                  <div className="field">
                    <label htmlFor="po-supplier">Proveedor</label>
                    <select id="po-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                      <option value="">Seleccione un proveedor</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="po-term">Plazo de pago (días)</label>
                    <input
                      id="po-term"
                      type="number"
                      min="0"
                      value={paymentTermDays}
                      onChange={(e) => setPaymentTermDays(e.target.value)}
                      placeholder="Contado"
                    />
                  </div>
                </div>

                <div className="pur-lines-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio unit.</th>
                        <th>Descuento %</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => {
                        const { net } = lineAmounts(line);
                        return (
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
                                value={line.quantity}
                                onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number" min="0" step="0.01"
                                value={line.unitPrice}
                                onChange={(e) => updateLine(i, 'unitPrice', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number" min="0" max="100" step="0.01"
                                value={line.discountPct}
                                onChange={(e) => updateLine(i, 'discountPct', e.target.value)}
                              />
                            </td>
                            <td className="mono">{formatMoney(net)}</td>
                            <td>
                              {lines.length > 1 && (
                                <button type="button" className="btn-remove-line" onClick={() => removeLine(i)} aria-label="Quitar línea">×</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button type="button" className="btn-add-line" onClick={addLine} aria-label="Agregar línea" title="Agregar línea">
                  <PlusIcon />
                </button>

                <div className="pur-totals-bar">
                  <span>Subtotal <span className="pur-total-value">{formatMoney(orderTotals.subtotal)}</span></span>
                  <span>Descuento <span className="pur-total-value">−{formatMoney(orderTotals.discount)}</span></span>
                  <span>Total <span className="pur-total-value">{formatMoney(orderTotals.total)}</span></span>
                </div>

                {formError && <p className="form-error" style={{ marginBottom: 0 }}>{formError}</p>}
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-primary">CREAR ORDEN</button>
                <button type="button" className="btn-secondary btn-secondary-danger" onClick={closeOrderModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
