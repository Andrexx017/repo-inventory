import { useState } from 'react';
import AppShell from '../../../shared/components/AppShell';
import { KpiModal, KpiModalTrigger } from '../../../shared/components/KpiModal';
import { useSales } from '../hooks/useSales';
import './Sales.css';

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
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

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l2.9 6.4 6.9.7-5.2 4.7 1.6 6.8-6.2-3.6-6.2 3.6 1.6-6.8-5.2-4.7 6.9-.7z" />
    </svg>
  );
}

function formatMoney(value) {
  if (value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isVigente(priceList) {
  const today = new Date().toISOString().slice(0, 10);
  if (!priceList.active) return false;
  if (priceList.startDate && priceList.startDate > today) return false;
  if (priceList.endDate && priceList.endDate < today) return false;
  return true;
}

export default function Sales() {
  const {
    branches, branchId, setBranchId, isGeneralAdmin, canCreateSale,
    products, priceLists, sales, salesPage, setSalesPage, salesTotalPages, salesKpi, loading, error,
    salesFilterFrom, setSalesFilterFrom, salesFilterTo, setSalesFilterTo,
    tab, setTab,
    priceListId, setPriceListId, customerName, setCustomerName,
    lines, addLine, removeLine, updateLine,
    formError, formSuccess, handleCreateSale,
    isSaleModalOpen, openSaleModal, closeSaleModal,
    viewSale, openComprobante, closeComprobante,
    editingPriceList, priceListItems, priceListItemsLoading, priceListItemsError,
    priceListItemSearch, setPriceListItemSearch, savingProductId,
    openPriceListEditor, closePriceListEditor, updatePriceListItemDraft,
    handleSavePrice, handleRemovePrice,
  } = useSales();

  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);

  // salesKpi viene de un endpoint de agregados aparte (GetKpiSummaryAsync) —
  // no se puede calcular desde `sales` porque esa lista ahora está paginada.
  const salesToday = salesKpi?.salesToday ?? 0;
  const unitsToday = salesKpi?.unitsToday ?? 0;
  const monthSalesCount = salesKpi?.salesThisMonth ?? 0;
  const monthTotal = salesKpi?.monthTotal ?? 0;
  const averageTicket = monthSalesCount > 0 ? monthTotal / monthSalesCount : 0;
  const topProductName = salesKpi?.topProductName ?? null;
  const topProductUnits = salesKpi?.topProductUnits ?? 0;

  return (
    <AppShell title="Ventas">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <h1 className="page-title">Ventas</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <KpiModalTrigger onClick={() => setIsKpiModalOpen(true)} />

          {isGeneralAdmin && (
            <div className="field" style={{ margin: 0, flex: '0 0 260px' }}>
              <label htmlFor="sal-branch">Sucursal</label>
              <select id="sal-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
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
          <KpiModal title="Indicadores — Ventas" open={isKpiModalOpen} onClose={() => setIsKpiModalOpen(false)}>
            <div className="sal-kpi-grid">
              <div className="sal-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge"><CalendarIcon /></span>
                  <span className="sal-kpi-label">VENTAS DE HOY</span>
                </div>
                <span className="sal-kpi-value">{salesToday}</span>
                <span className="sal-kpi-sub">{unitsToday} unidades vendidas</span>
              </div>
              <div className="sal-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge kpi-icon-badge-success"><CashIcon /></span>
                  <span className="sal-kpi-label">TOTAL DEL MES</span>
                </div>
                <span className="sal-kpi-value">{formatMoney(monthTotal)}</span>
                <span className="sal-kpi-sub">{monthSalesCount} ventas este mes</span>
              </div>
              <div className="sal-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge kpi-icon-badge-cyan"><ReceiptIcon /></span>
                  <span className="sal-kpi-label">TICKET PROMEDIO</span>
                </div>
                <span className="sal-kpi-value">{formatMoney(averageTicket)}</span>
                <span className="sal-kpi-sub">Sobre el mes actual</span>
              </div>
              <div className="sal-kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-icon-badge kpi-icon-badge-warning"><StarIcon /></span>
                  <span className="sal-kpi-label">PRODUCTO MÁS VENDIDO</span>
                </div>
                <span className="sal-kpi-value sal-kpi-value-text">{topProductName ?? 'Sin ventas este mes'}</span>
                <span className="sal-kpi-sub">{topProductName ? `${topProductUnits} unidades este mes` : '—'}</span>
              </div>
            </div>
          </KpiModal>

          <div className="sal-tabs">
            <button
              type="button"
              className={`sal-tab ${tab === 'ventas' ? 'sal-tab-active' : ''}`}
              onClick={() => setTab('ventas')}
            >
              Ventas
            </button>
            <button
              type="button"
              className={`sal-tab ${tab === 'listas' ? 'sal-tab-active' : ''}`}
              onClick={() => setTab('listas')}
            >
              Listas de precio
            </button>
          </div>

          {tab === 'ventas' && (
            <>
              {canCreateSale && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-primary" onClick={openSaleModal}>
                    <PlusIcon />
                    Registrar venta
                  </button>
                </div>
              )}

              <div className="filter-row">
                <div className="field" style={{ margin: 0, flex: '0 0 160px' }}>
                  <label htmlFor="sal-filter-from">Desde</label>
                  <input
                    id="sal-filter-from"
                    type="date"
                    value={salesFilterFrom}
                    max={salesFilterTo || undefined}
                    onChange={(e) => setSalesFilterFrom(e.target.value)}
                  />
                </div>
                <div className="field" style={{ margin: 0, flex: '0 0 160px' }}>
                  <label htmlFor="sal-filter-to">Hasta</label>
                  <input
                    id="sal-filter-to"
                    type="date"
                    value={salesFilterTo}
                    min={salesFilterFrom || undefined}
                    onChange={(e) => setSalesFilterTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>N° VENTA</th>
                      <th>CLIENTE</th>
                      <th>LISTA DE PRECIO</th>
                      <th>FECHA</th>
                      <th>TOTAL</th>
                      <th>VENDEDOR</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="mono">{sale.saleNumber}</td>
                        <td>{sale.customerName || '—'}</td>
                        <td className="text-muted">{sale.priceListName || '— (referencia)'}</td>
                        <td className="mono text-muted">{formatDate(sale.saleDate)}</td>
                        <td className="mono">{formatMoney(sale.total)}</td>
                        <td>{sale.sellerName}</td>
                        <td>
                          <button type="button" className="sal-action-view" onClick={() => openComprobante(sale)}>
                            Ver comprobante
                          </button>
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
                  disabled={salesPage <= 1}
                  onClick={() => setSalesPage((p) => p - 1)}
                >
                  Anterior
                </button>
                <span className="mono text-muted">Página {salesPage} de {salesTotalPages}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={salesPage >= salesTotalPages}
                  onClick={() => setSalesPage((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>

              {viewSale && (
                <div className="form-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h2 style={{ margin: 0 }}>Comprobante — {viewSale.saleNumber} · {viewSale.customerName || 'Consumidor final'}</h2>
                    <button type="button" className="btn-secondary" onClick={closeComprobante} style={{ marginLeft: 0 }}>Cerrar</button>
                  </div>

                  <p className="mono sal-kpi-sub" style={{ marginBottom: '14px' }}>
                    {formatDate(viewSale.saleDate)} · {viewSale.priceListName || 'Precio de referencia'} · Vendedor: {viewSale.sellerName}
                  </p>

                  <div className="sal-lines-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio</th>
                          <th>Descuento</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewSale.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.productName}</td>
                            <td className="mono">{item.quantity}</td>
                            <td className="mono">{formatMoney(item.unitPrice)}</td>
                            <td className="mono">{item.discountPct}%</td>
                            <td className="mono">{formatMoney(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="sal-totals-bar">
                    <span>Subtotal <span className="sal-total-value">{formatMoney(viewSale.subtotal)}</span></span>
                    <span>Descuento <span className="sal-total-value">−{formatMoney(viewSale.totalDiscount)}</span></span>
                    <span style={{ fontWeight: 600 }}>Total <span className="sal-total-value" style={{ fontSize: '14px' }}>{formatMoney(viewSale.total)}</span></span>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'listas' && (
            <>
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>NOMBRE</th>
                      <th>DESCRIPCIÓN</th>
                      <th>VIGENCIA</th>
                      <th>ESTADO</th>
                      {isGeneralAdmin && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {priceLists.map((pl) => (
                      <tr key={pl.id}>
                        <td style={{ fontWeight: 600 }}>{pl.name}</td>
                        <td className="text-muted">{pl.description || '—'}</td>
                        <td className="text-muted">
                          {pl.startDate || pl.endDate
                            ? `${pl.startDate ?? '—'} a ${pl.endDate ?? '—'}`
                            : 'Sin vencimiento'}
                        </td>
                        <td>
                          <span className={`status-pill ${isVigente(pl) ? 'status-pill-active' : 'status-pill-inactive'}`}>
                            {isVigente(pl) ? 'VIGENTE' : 'INACTIVA'}
                          </span>
                        </td>
                        {isGeneralAdmin && (
                          <td>
                            <button type="button" className="table-action" onClick={() => openPriceListEditor(pl)}>
                              Editar precios
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isGeneralAdmin && (
                <p className="page-subtitle">
                  Solo el Administrador general puede cargar o editar los precios de cada lista.
                </p>
              )}
            </>
          )}
        </>
      )}

      {isSaleModalOpen && (
        <div className="modal-overlay" onClick={closeSaleModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Registrar venta</h2>
              <button type="button" className="modal-close" onClick={closeSaleModal} aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleCreateSale}>
              <div className="modal-body">
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="field">
                    <label htmlFor="sale-pricelist">Lista de precio</label>
                    <select id="sale-pricelist" value={priceListId} onChange={(e) => setPriceListId(e.target.value)}>
                      <option value="">Sin lista (precio de referencia)</option>
                      {priceLists.map((pl) => (
                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="sale-customer">Cliente (opcional)</label>
                    <input
                      id="sale-customer"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Consumidor final"
                    />
                  </div>
                </div>

                <div className="sal-lines-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Descuento %</th>
                        <th></th>
                      </tr>
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
                              value={line.quantity}
                              onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number" min="0" max="100" step="0.01"
                              value={line.discountPct}
                              onChange={(e) => updateLine(i, 'discountPct', e.target.value)}
                            />
                          </td>
                          <td>
                            {lines.length > 1 && (
                              <button type="button" className="sal-remove-line" onClick={() => removeLine(i)}>Quitar</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="sal-form-note">
                  El precio no se escribe a mano: lo resuelve el servidor según la lista elegida (o el precio de
                  referencia del producto) al confirmar la venta.
                </p>

                <button type="button" className="sal-add-line" onClick={addLine}>+ Agregar línea</button>

                {formError && <p className="form-error" style={{ marginBottom: 0 }}>{formError}</p>}
                {formSuccess && <p className="sal-form-success" style={{ marginBottom: 0 }}>{formSuccess}</p>}
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-primary">REGISTRAR VENTA</button>
                <button type="button" className="btn-secondary" onClick={closeSaleModal}>Cerrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPriceList && (
        <div className="modal-overlay" onClick={closePriceListEditor}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Precios — {editingPriceList.name}</h2>
              <button type="button" className="modal-close" onClick={closePriceListEditor} aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <div className="modal-body">
              <p className="sal-form-note" style={{ marginTop: 0 }}>
                Todos los productos activos del catálogo — un producto sin precio acá no se puede vender usando
                esta lista.
              </p>

              <div className="field" style={{ marginBottom: '14px' }}>
                <label htmlFor="pl-item-search">Buscar producto</label>
                <input
                  id="pl-item-search"
                  type="text"
                  placeholder="SKU o nombre"
                  value={priceListItemSearch}
                  onChange={(e) => setPriceListItemSearch(e.target.value)}
                />
              </div>

              {priceListItemsError && <p className="form-error">{priceListItemsError}</p>}

              {priceListItemsLoading ? (
                <p>Cargando...</p>
              ) : (
                <div className="sal-lines-table" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Producto</th>
                        <th>Precio</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceListItems.map((item) => (
                        <tr key={item.productId}>
                          <td className="mono text-muted">{item.productSku}</td>
                          <td>{item.productName}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Sin precio"
                              value={item.price ?? ''}
                              onChange={(e) => updatePriceListItemDraft(item.productId, e.target.value)}
                            />
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              className="table-action"
                              disabled={savingProductId === item.productId}
                              onClick={() => handleSavePrice(item.productId, item.price)}
                            >
                              Guardar
                            </button>
                            {item.price !== null && (
                              <button
                                type="button"
                                className="sal-remove-line"
                                style={{ marginLeft: '10px' }}
                                disabled={savingProductId === item.productId}
                                onClick={() => handleRemovePrice(item.productId)}
                              >
                                Quitar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {priceListItems.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>
                            Ningún producto coincide con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={closePriceListEditor} style={{ marginLeft: 0 }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
