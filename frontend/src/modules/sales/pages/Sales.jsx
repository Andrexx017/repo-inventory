import AppShell from '../../../shared/components/AppShell';
import { useSales } from '../hooks/useSales';
import './Sales.css';

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
    products, priceLists, sales, loading, error,
    tab, setTab,
    priceListId, setPriceListId, customerName, setCustomerName,
    lines, addLine, removeLine, updateLine,
    formError, formSuccess, handleCreateSale,
    viewSale, openComprobante, closeComprobante,
  } = useSales();

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthSales = sales.filter((s) => {
    const d = new Date(s.saleDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const salesToday = sales.filter((s) => s.saleDate.slice(0, 10) === today);
  const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);
  const averageTicket = monthSales.length > 0 ? monthTotal / monthSales.length : 0;

  const quantityByProduct = {};
  monthSales.forEach((sale) => {
    sale.items.forEach((item) => {
      quantityByProduct[item.productName] = (quantityByProduct[item.productName] || 0) + item.quantity;
    });
  });
  const topProductEntry = Object.entries(quantityByProduct).sort((a, b) => b[1] - a[1])[0];

  return (
    <AppShell title="Ventas">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <h1 className="page-title">Ventas</h1>

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

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="sal-kpi-grid">
            <div className="sal-kpi-card">
              <span className="sal-kpi-label">VENTAS DE HOY</span>
              <span className="sal-kpi-value">{salesToday.length}</span>
              <span className="sal-kpi-sub">
                {salesToday.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0)} unidades vendidas
              </span>
            </div>
            <div className="sal-kpi-card">
              <span className="sal-kpi-label">TOTAL DEL MES</span>
              <span className="sal-kpi-value">{formatMoney(monthTotal)}</span>
              <span className="sal-kpi-sub">{monthSales.length} ventas este mes</span>
            </div>
            <div className="sal-kpi-card">
              <span className="sal-kpi-label">TICKET PROMEDIO</span>
              <span className="sal-kpi-value">{formatMoney(averageTicket)}</span>
              <span className="sal-kpi-sub">Sobre el mes actual</span>
            </div>
            <div className="sal-kpi-card">
              <span className="sal-kpi-label">PRODUCTO MÁS VENDIDO</span>
              <span className="sal-kpi-value sal-kpi-value-text">{topProductEntry ? topProductEntry[0] : 'Sin ventas este mes'}</span>
              <span className="sal-kpi-sub">{topProductEntry ? `${topProductEntry[1]} unidades este mes` : '—'}</span>
            </div>
          </div>

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
                <form onSubmit={handleCreateSale} className="form-card">
                  <h2>Registrar venta</h2>

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

                  {formError && <p className="form-error">{formError}</p>}
                  {formSuccess && <p className="sal-form-success">{formSuccess}</p>}

                  <div>
                    <button type="submit" className="btn-primary">REGISTRAR VENTA</button>
                  </div>
                </form>
              )}

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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="page-subtitle">
                Catálogo de listas de precio de solo lectura — el backend no expone los precios por producto de cada
                lista fuera de una venta, así que no se muestran acá.
              </p>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
