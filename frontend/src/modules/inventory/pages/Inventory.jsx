import AppShell from '../../../shared/components/AppShell';
import {
  useInventory,
  INCOMING_TYPES,
  OUTGOING_TYPES,
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
    branches, products, branchId, setBranchId, isGeneralAdmin, canMutate,
    items, movements, alerts, loading, error,
    tab, setTab, movementFilterProductId, setMovementFilterProductId,
    direction, handleDirectionChange,
    productId, setProductId,
    movementType, setMovementType,
    quantity, setQuantity,
    unitCost, setUnitCost,
    movementDate, setMovementDate,
    reason, setReason,
    formError, handleSubmitMovement,
    thresholdEditingItem, thresholdMin, setThresholdMin, thresholdMax, setThresholdMax,
    thresholdError, handleEditThreshold, cancelThresholdEdit, handleSubmitThreshold,
  } = useInventory();

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

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="inv-kpi-grid">
            <div className="inv-kpi-card">
              <span className="inv-kpi-label">PRODUCTOS EN INVENTARIO</span>
              <span className="inv-kpi-value">{items.length}</span>
            </div>
            <div className="inv-kpi-card">
              <span className="inv-kpi-label">ALERTAS ACTIVAS</span>
              <span className="inv-kpi-value inv-kpi-value-warning">{activeAlertsCount}</span>
              <span className="inv-kpi-sub">{lowStockCount} productos por debajo del mínimo</span>
            </div>
            <div className="inv-kpi-card">
              <span className="inv-kpi-label">VALOR DE INVENTARIO</span>
              <span className="inv-kpi-value">{formatMoney(inventoryValue)}</span>
              <span className="inv-kpi-sub">Costo promedio ponderado</span>
            </div>
            <div className="inv-kpi-card">
              <span className="inv-kpi-label">MOVIMIENTOS HOY</span>
              <span className="inv-kpi-value">{movementsToday.length}</span>
              <span className="inv-kpi-sub">{incomingToday} ingresos · {outgoingToday} retiros</span>
            </div>
          </div>

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
          </div>

          {tab === 'existencias' && (
            <>
              {canMutate ? (
                <form onSubmit={handleSubmitMovement} className="form-card">
                  <div className="inv-movement-header">
                    <h2>Registrar movimiento</h2>
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

                  <div className="field" style={{ marginBottom: '16px' }}>
                    <label htmlFor="mv-reason">Nota</label>
                    <input id="mv-reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
                  </div>

                  {formError && <p className="form-error">{formError}</p>}

                  <button
                    type="submit"
                    className={`btn-primary ${direction === 'ingreso' ? 'inv-btn-in' : 'inv-btn-out'}`}
                  >
                    {direction === 'ingreso' ? 'REGISTRAR INGRESO' : 'REGISTRAR RETIRO'}
                  </button>
                </form>
              ) : (
                <p className="inv-readonly-note">
                  Estás viendo el inventario de otra sucursal en modo solo lectura. Para registrar movimientos, cambiá a tu propia sucursal.
                </p>
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
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
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
                  </tbody>
                </table>
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
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
