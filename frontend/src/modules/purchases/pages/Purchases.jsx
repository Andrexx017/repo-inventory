import { useState } from 'react';
import AppShell from '../../../shared/components/AppShell';
import { KpiModal, KpiModalTrigger } from '../../../shared/components/KpiModal';
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

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
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

function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
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
    handleApprove, handleCancel, canApprove, canCancel, canReceive,
    receiptOrder, receiptPending, receiptQuantities, setReceiptQuantity,
    receiptNotes, setReceiptNotes, receiptError, openReceipt, closeReceipt, handleSubmitReceipt,
  } = usePurchases();

  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // ordersKpi viene de un endpoint de agregados aparte (GetKpiSummaryAsync) —
  // no se puede calcular desde `orders` porque esa lista ahora está paginada.
  const monthValue = ordersKpi?.monthValue ?? 0;
  const activeOrders = ordersKpi?.activeOrders ?? 0;
  const pendingApproval = ordersKpi?.pendingApproval ?? 0;
  const pendingReceipts = ordersKpi?.pendingReceipts ?? 0;

  return (
    <AppShell title="Compras">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <h1 className="page-title">Compras</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <KpiModalTrigger onClick={() => setIsKpiModalOpen(true)} />

          {isGeneralAdmin && (
            <div className="field" style={{ margin: 0, flex: '0 0 260px' }}>
              <label htmlFor="pur-branch">Sucursal</label>
              <select id="pur-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <KpiModal title="Indicadores — Compras" open={isKpiModalOpen} onClose={() => setIsKpiModalOpen(false)}>
            <div className="pur-kpi-grid">
              <div className="pur-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge"><ClipboardIcon /></span>
                  <span className="pur-kpi-label">ÓRDENES ACTIVAS</span>
                </div>
                <span className="pur-kpi-value">{activeOrders}</span>
                <span className="pur-kpi-sub">No canceladas ni completas</span>
              </div>
              <div className="pur-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge kpi-icon-badge-warning"><ClockIcon /></span>
                  <span className="pur-kpi-label">PENDIENTES DE APROBAR</span>
                </div>
                <span className="pur-kpi-value pur-kpi-value-warning">{pendingApproval}</span>
                <span className="pur-kpi-sub">En estado borrador</span>
              </div>
              <div className="pur-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge kpi-icon-badge-success"><CashIcon /></span>
                  <span className="pur-kpi-label">VALOR DEL MES</span>
                </div>
                <span className="pur-kpi-value">{formatMoney(monthValue)}</span>
                <span className="pur-kpi-sub">Órdenes de este mes</span>
              </div>
              <div className="pur-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge kpi-icon-badge-cyan"><InboxIcon /></span>
                  <span className="pur-kpi-label">RECEPCIONES PENDIENTES</span>
                </div>
                <span className="pur-kpi-value pur-kpi-value-cyan">{pendingReceipts}</span>
                <span className="pur-kpi-sub">Confirmadas o parciales</span>
              </div>
            </div>
          </KpiModal>

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
            <>
              {canManageOrders && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-primary" onClick={openOrderModal}>
                    <PlusIcon />
                    Crear orden
                  </button>
                </div>
              )}

              <div className="pur-filter-row">
                <div className="field" style={{ margin: 0, flex: '0 0 260px' }}>
                  <label htmlFor="po-filter">Filtrar por proveedor</label>
                  <select id="po-filter" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
                    <option value="">Todos los proveedores</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ margin: 0, flex: '0 0 160px' }}>
                  <label htmlFor="po-filter-from">Desde</label>
                  <input
                    id="po-filter-from"
                    type="date"
                    value={ordersFilterFrom}
                    max={ordersFilterTo || undefined}
                    onChange={(e) => setOrdersFilterFrom(e.target.value)}
                  />
                </div>
                <div className="field" style={{ margin: 0, flex: '0 0 160px' }}>
                  <label htmlFor="po-filter-to">Hasta</label>
                  <input
                    id="po-filter-to"
                    type="date"
                    value={ordersFilterTo}
                    min={ordersFilterFrom || undefined}
                    onChange={(e) => setOrdersFilterTo(e.target.value)}
                  />
                </div>
                <span className="inv-filter-hint" style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  Histórico por proveedor — RF-14
                </span>
              </div>

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
                            {canApprove(order) && (
                              <button type="button" className="pur-action-approve" onClick={() => setConfirmAction({ type: 'approve', order })}>Aprobar</button>
                            )}
                            {canReceive(order) && (
                              <button type="button" className="pur-action-receive" onClick={() => openReceipt(order)}>Recibir</button>
                            )}
                            {canCancel(order) && (
                              <button type="button" className="pur-action-cancel" onClick={() => setConfirmAction({ type: 'cancel', order })}>Cancelar</button>
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
                open={!!confirmAction}
                title={confirmAction?.type === 'approve' ? 'Aprobar orden de compra' : 'Cancelar orden de compra'}
                message={
                  confirmAction?.type === 'approve'
                    ? `¿Seguro que querés aprobar la orden ${confirmAction?.order.orderNumber} (${confirmAction?.order.supplierName})? Una vez aprobada vas a poder registrar la recepción de los productos.`
                    : `¿Seguro que querés cancelar la orden ${confirmAction?.order.orderNumber} (${confirmAction?.order.supplierName})? Esta acción no se puede deshacer.`
                }
                confirmLabel={confirmAction?.type === 'approve' ? 'Aprobar' : 'Cancelar orden'}
                tone={confirmAction?.type === 'cancel' ? 'danger' : 'default'}
                onConfirm={() => {
                  if (confirmAction?.type === 'approve') handleApprove(confirmAction.order);
                  else if (confirmAction?.type === 'cancel') handleCancel(confirmAction.order);
                  setConfirmAction(null);
                }}
                onCancel={() => setConfirmAction(null)}
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
                        <button type="button" className="btn-secondary" onClick={closeReceipt}>Cancelar</button>
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
                                <button type="button" className="pur-remove-line" onClick={() => removeLine(i)}>Quitar</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button type="button" className="pur-add-line" onClick={addLine}>+ Agregar línea</button>

                <div className="pur-totals-bar">
                  <span>Subtotal <span className="pur-total-value">{formatMoney(orderTotals.subtotal)}</span></span>
                  <span>Descuento <span className="pur-total-value">−{formatMoney(orderTotals.discount)}</span></span>
                  <span>Total <span className="pur-total-value">{formatMoney(orderTotals.total)}</span></span>
                </div>

                {formError && <p className="form-error" style={{ marginBottom: 0 }}>{formError}</p>}
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-primary">CREAR ORDEN</button>
                <button type="button" className="btn-secondary" onClick={closeOrderModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
