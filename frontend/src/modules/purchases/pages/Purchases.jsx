import AppShell from '../../../shared/components/AppShell';
import { usePurchases, ORDER_STATUS_LABELS } from '../hooks/usePurchases';
import './Purchases.css';

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
    suppliers, products, orders, loading, error,
    tab, setTab, supplierFilter, setSupplierFilter,
    supplierId, setSupplierId, paymentTermDays, setPaymentTermDays,
    lines, addLine, removeLine, updateLine, lineAmounts, orderTotals,
    formError, handleCreateOrder,
    handleApprove, handleCancel, canApprove, canCancel, canReceive,
    receiptOrder, receiptPending, receiptQuantities, setReceiptQuantity,
    receiptNotes, setReceiptNotes, receiptError, openReceipt, closeReceipt, handleSubmitReceipt,
  } = usePurchases();

  const now = new Date();
  const monthValue = orders
    .filter((o) => {
      const d = new Date(o.orderDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + o.total, 0);
  const activeOrders = orders.filter((o) => !['fully_received', 'cancelled'].includes(o.status)).length;
  const pendingApproval = orders.filter((o) => o.status === 'draft').length;
  const pendingReceipts = orders.filter((o) => ['confirmed', 'partially_received'].includes(o.status)).length;

  return (
    <AppShell title="Compras">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <h1 className="page-title">Compras</h1>

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

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="pur-kpi-grid">
            <div className="pur-kpi-card">
              <span className="pur-kpi-label">ÓRDENES ACTIVAS</span>
              <span className="pur-kpi-value">{activeOrders}</span>
              <span className="pur-kpi-sub">No canceladas ni completas</span>
            </div>
            <div className="pur-kpi-card">
              <span className="pur-kpi-label">PENDIENTES DE APROBAR</span>
              <span className="pur-kpi-value pur-kpi-value-warning">{pendingApproval}</span>
              <span className="pur-kpi-sub">En estado borrador</span>
            </div>
            <div className="pur-kpi-card">
              <span className="pur-kpi-label">VALOR DEL MES</span>
              <span className="pur-kpi-value">{formatMoney(monthValue)}</span>
              <span className="pur-kpi-sub">Órdenes de este mes</span>
            </div>
            <div className="pur-kpi-card">
              <span className="pur-kpi-label">RECEPCIONES PENDIENTES</span>
              <span className="pur-kpi-value pur-kpi-value-cyan">{pendingReceipts}</span>
              <span className="pur-kpi-sub">Confirmadas o parciales</span>
            </div>
          </div>

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
                <form onSubmit={handleCreateOrder} className="form-card">
                  <h2>Nueva orden de compra</h2>

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

                  {formError && <p className="form-error">{formError}</p>}

                  <button type="submit" className="btn-primary">CREAR ORDEN</button>
                </form>
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
                      <th></th>
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
                          {canApprove(order) && (
                            <button type="button" className="pur-action-approve" onClick={() => handleApprove(order)}>Aprobar</button>
                          )}
                          {canReceive(order) && (
                            <button type="button" className="pur-action-receive" onClick={() => openReceipt(order)}>Recibir</button>
                          )}
                          {canCancel(order) && (
                            <button type="button" className="pur-action-cancel" onClick={() => handleCancel(order)}>Cancelar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {receiptOrder && (
                <form onSubmit={handleSubmitReceipt} className="form-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h2 style={{ margin: 0 }}>Confirmar recepción — {receiptOrder.orderNumber} · {receiptOrder.supplierName}</h2>
                    <button type="button" className="btn-secondary" onClick={closeReceipt} style={{ marginLeft: 0 }}>Cerrar</button>
                  </div>

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

                  <div className="field" style={{ marginBottom: '16px' }}>
                    <label htmlFor="receipt-notes">Notas</label>
                    <input id="receipt-notes" value={receiptNotes} onChange={(e) => setReceiptNotes(e.target.value)} />
                  </div>

                  {receiptError && <p className="form-error">{receiptError}</p>}

                  <button type="submit" className="btn-primary">CONFIRMAR RECEPCIÓN</button>
                </form>
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
    </AppShell>
  );
}
