import { Link } from 'react-router-dom';
import AppShell from '../../../shared/components/AppShell';
import {
  STATUS_LABELS as TRANSFER_STATUS_LABELS,
  STATUS_CLASSES as TRANSFER_STATUS_CLASSES,
  URGENCY_LABELS as TRANSFER_URGENCY_LABELS,
  URGENCY_CLASSES as TRANSFER_URGENCY_CLASSES,
} from '../../transfers/hooks/useTransfers';
import {
  useDashboard,
  MONTH_LABELS,
  lowStockSeverity,
  deficitPercent,
} from '../hooks/useDashboard';
import './Dashboard.css';

function formatMoney(value) {
  if (value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function TrendIcon({ up }) {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10">
      {up
        ? <polygon points="5,0 10,10 0,10" fill="currentColor" />
        : <polygon points="0,0 10,0 5,10" fill="currentColor" />}
    </svg>
  );
}

function Delta({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-muted">Sin datos del mes anterior</span>;
  }
  const up = value >= 0;
  return (
    <span className={up ? 'delta-up' : 'delta-down'}>
      <TrendIcon up={up} /> {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// Barras de una sola serie (RF-29): ancho dinámico en vez de coordenadas SVG
// fijas, para no romper con listas de menos de 6 meses (ej. una sucursal recién
// creada). El mes actual siempre es el último elemento (backend ya lo ordena así).
function SalesChart({ history }) {
  if (!history || history.length === 0) {
    return <p className="dash-chart-empty">Sin historial de ventas todavía.</p>;
  }

  const max = Math.max(...history.map((m) => m.totalSales), 1);
  const lastIndex = history.length - 1;

  return (
    <div className="dash-chart">
      {history.map((m, i) => (
        <div className="dash-chart-col" key={`${m.year}-${m.month}`}>
          <div
            className={`dash-chart-bar ${i === lastIndex ? 'dash-chart-bar-current' : ''}`}
            style={{ height: `${Math.max(6, (m.totalSales / max) * 100)}%` }}
            title={formatMoney(m.totalSales)}
          />
          <span className={`dash-chart-label ${i === lastIndex ? 'dash-chart-label-current' : ''}`}>
            {MONTH_LABELS[m.month - 1]}
          </span>
        </div>
      ))}
    </div>
  );
}

function RotationList({ items, tone, emptyLabel }) {
  if (!items || items.length === 0) {
    return <p className="dash-chart-empty">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((p) => p.quantitySold), 1);

  return (
    <div className="dash-rot-list">
      {items.map((p) => (
        <div className="dash-rot-row" key={p.productId}>
          <span className="dash-rot-name">{p.productName}</span>
          <div className="dash-rot-bar-track">
            <div className={`dash-rot-bar-fill dash-rot-bar-fill-${tone}`} style={{ width: `${(p.quantitySold / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const {
    branches, branchId, setBranchId, isGeneralAdmin,
    salesSummary, inventoryRotation, activeTransfers, lowStock, branchComparison,
    loading, error,
    restockItem, openRestockModal, closeRestockModal, goToInventoryForRestock,
    branchDetail, branchDetailLoading, openBranchDetail, closeBranchDetail,
  } = useDashboard();

  const currentBranch = branches.find((b) => String(b.id) === branchId);

  const transfersCount = activeTransfers?.activeTransfers?.length ?? null;
  const impactTotal = activeTransfers?.inventoryImpact?.reduce((sum, i) => sum + i.quantityInTransit, 0) ?? 0;
  const lowStockCount = lowStock?.items?.length ?? null;
  const topProduct = inventoryRotation?.topDemand?.[0] ?? null;

  return (
    <AppShell title="Dashboard">
      <div className="dash-topline">
        <div>
          <h1 className="page-title">Dashboard</h1>
          {currentBranch && (
            <p className="page-subtitle mono">{currentBranch.code} · {currentBranch.name} · {currentBranch.city}</p>
          )}
        </div>

        {isGeneralAdmin ? (
          <div className="dash-branch-row">
            <span className="status-pill status-pill-accent">ACCESO TOTAL</span>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
              ))}
            </select>
          </div>
        ) : (
          <span className="status-pill status-pill-accent">TU SUCURSAL</span>
        )}
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <div className="dash-bento">

          <div className="dash-card dash-span-8">
            <div className="dash-card-title-row">
              <div>
                <h2>Ventas mensuales</h2>
                <span className="dash-card-caption">Últimos {salesSummary?.monthlyHistory?.length ?? 6} meses</span>
              </div>
            </div>
            <SalesChart history={salesSummary?.monthlyHistory} />
          </div>

          <div className="dash-card dash-span-4">
            <div className="dash-kpi-stack">
              <div className="dash-kpi-row">
                <span className="dash-kpi-row-label">VENTAS DEL MES</span>
                <span className="dash-kpi-row-figure">
                  <span className="dash-kpi-row-value">{formatMoney(salesSummary?.currentMonthTotal)}</span>
                  <Delta value={salesSummary?.percentChangeVsPreviousMonth ?? null} />
                </span>
              </div>
              <div className="dash-kpi-row">
                <span className="dash-kpi-row-label">TRANSFERENCIAS ACTIVAS</span>
                <span className="dash-kpi-row-value">{transfersCount ?? '—'}</span>
              </div>
              <div className="dash-kpi-row">
                <span className="dash-kpi-row-label">REABASTECIMIENTO URGENTE</span>
                <span className="dash-kpi-row-value dash-kpi-row-value-warning">{lowStockCount ?? '—'}</span>
              </div>
              <div className="dash-kpi-row">
                <span className="dash-kpi-row-label">MAYOR ROTACIÓN ({inventoryRotation?.periodDays ?? '—'}D)</span>
                <span className="dash-kpi-row-value dash-kpi-row-value-text">{topProduct?.productName ?? 'Sin ventas'}</span>
              </div>
            </div>
          </div>

          <div className="dash-card dash-span-4">
            <div className="dash-card-title-row">
              <h2 className="dash-title-success">MAYOR DEMANDA</h2>
              <span className="dash-card-caption">{inventoryRotation?.periodDays ?? '—'} días</span>
            </div>
            <RotationList items={inventoryRotation?.topDemand} tone="success" emptyLabel="Sin ventas en el período." />
          </div>

          <div className="dash-card dash-span-4">
            <div className="dash-card-title-row">
              <h2>MENOR DEMANDA</h2>
              <span className="dash-card-caption">{inventoryRotation?.periodDays ?? '—'} días</span>
            </div>
            <RotationList items={inventoryRotation?.lowDemand} tone="muted" emptyLabel="Sin productos de baja demanda." />
          </div>

          <div className="dash-card dash-span-4">
            <div className="dash-card-title-row">
              <h2>REABASTECIMIENTO</h2>
              <span className="dash-card-caption">Por déficit</span>
            </div>
            {(!lowStock?.items || lowStock.items.length === 0) ? (
              <p className="dash-chart-empty">Sin alertas de stock bajo.</p>
            ) : (
              <div className="dash-rot-list">
                {lowStock.items.map((item) => (
                  <div className="dash-rot-row" key={item.productId}>
                    <span className="dash-rot-name">
                      {item.productName}
                      {lowStockSeverity(item) === 'critico' && (
                        <span className="status-pill status-pill-inactive dash-inline-pill">CRÍTICO</span>
                      )}
                    </span>
                    <div className="dash-rot-bar-track">
                      <div
                        className={`dash-rot-bar-fill dash-rot-bar-fill-${lowStockSeverity(item) === 'critico' ? 'danger' : 'warning'}`}
                        style={{ width: `${deficitPercent(item)}%` }}
                      />
                    </div>
                    <button type="button" className="table-action dash-restock-btn" onClick={() => openRestockModal(item)}>
                      Reabastecer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-card dash-span-7">
            <div className="dash-card-title-row">
              <h2>Transferencias activas + impacto en inventario</h2>
              <Link to="/transfers" className="table-action">Ver todas →</Link>
            </div>
            {(!activeTransfers?.activeTransfers || activeTransfers.activeTransfers.length === 0) ? (
              <p className="dash-chart-empty">Sin transferencias activas.</p>
            ) : (
              <table className="data-table">
                <thead><tr><th>RUTA</th><th>ESTADO</th><th>URG.</th></tr></thead>
                <tbody>
                  {activeTransfers.activeTransfers.map((t) => (
                    <tr key={t.id}>
                      <td>{t.originBranchName} → {t.destinationBranchName}</td>
                      <td><span className={`status-pill ${TRANSFER_STATUS_CLASSES[t.status] || 'status-pill-muted'}`}>{TRANSFER_STATUS_LABELS[t.status] || t.status}</span></td>
                      <td><span className={`status-pill ${TRANSFER_URGENCY_CLASSES[t.urgency] || 'status-pill-muted'}`}>{TRANSFER_URGENCY_LABELS[t.urgency] || t.urgency}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTransfers?.inventoryImpact && activeTransfers.inventoryImpact.length > 0 && (
              <div className="dash-impact-strip">
                <span className="dash-card-caption">IMPACTO EN INVENTARIO · entrando a esta sucursal ({impactTotal} uds.)</span>
                <div className="dash-impact-row">
                  {activeTransfers.inventoryImpact.map((i) => (
                    <span key={i.productId} className="dash-impact-item">
                      {i.productName} <b className="mono text-success">+{i.quantityInTransit}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isGeneralAdmin && (
            <div className="dash-card dash-span-5">
              <div className="dash-card-title-row">
                <div className="dash-title-with-badge">
                  <h2>Sucursales</h2>
                  <span className="badge-admin">SOLO ADMIN · RF-33</span>
                </div>
              </div>
              {!branchComparison ? (
                <p className="dash-chart-empty">Cargando comparativa...</p>
              ) : (
                <table className="data-table">
                  <thead><tr><th>SUCURSAL</th><th>MES ACTUAL</th><th>VAR.</th></tr></thead>
                  <tbody>
                    {branchComparison.branches.map((b) => (
                      <tr key={b.branchId} className="dash-clickable-row" onClick={() => openBranchDetail(b)}>
                        <td>{b.branchName}</td>
                        <td className="mono">{formatMoney(b.currentMonthSales)}</td>
                        <td><Delta value={b.percentChangeVsPreviousMonth} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>
      )}

      {restockItem && (
        <div className="modal-overlay" onClick={closeRestockModal}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Reabastecer producto</h2>
              <button type="button" className="modal-close" onClick={closeRestockModal} aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <div className="modal-body">
              <p className="dash-modal-sub">{restockItem.productName} · {restockItem.productSku} · {currentBranch?.name}</p>

              <div className="dash-stock-strip">
                <div className="dash-stock-figure">
                  <span className="dash-stock-figure-label">ACTUAL</span>
                  <span className="dash-stock-figure-value text-danger">{restockItem.currentQuantity}</span>
                </div>
                <div className="dash-stock-divider" />
                <div className="dash-stock-figure">
                  <span className="dash-stock-figure-label">MÍNIMO</span>
                  <span className="dash-stock-figure-value text-muted">{restockItem.minimumStock}</span>
                </div>
                <span className={`status-pill dash-stock-pill ${lowStockSeverity(restockItem) === 'critico' ? 'status-pill-inactive' : 'status-pill-warn'}`}>
                  {lowStockSeverity(restockItem) === 'critico' ? 'CRÍTICO' : 'BAJO'}
                </span>
              </div>

              <p className="dash-modal-note">
                Para registrar el ingreso de este producto andá al módulo de Inventario — la sucursal y el producto ya van a estar preseleccionados.
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={goToInventoryForRestock}>IR A INVENTARIO</button>
              <button type="button" className="btn-secondary" onClick={closeRestockModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {branchDetail && (
        <div className="modal-overlay" onClick={closeBranchDetail}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{branchDetail.branchName}</h2>
              <button type="button" className="modal-close" onClick={closeBranchDetail} aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <div className="modal-body">
              <div className="dash-mini-kpi-grid">
                <div className="dash-mini-kpi">
                  <span className="dash-mini-kpi-label">VENTAS MES ACTUAL</span>
                  <span className="dash-mini-kpi-value">{formatMoney(branchDetail.currentMonthSales)}</span>
                </div>
                <div className="dash-mini-kpi">
                  <span className="dash-mini-kpi-label">TRANSF. ACTIVAS</span>
                  <span className="dash-mini-kpi-value">{branchDetail.activeTransfersCount}</span>
                </div>
                <div className="dash-mini-kpi">
                  <span className="dash-mini-kpi-label">PRODUCTOS EN ALERTA</span>
                  <span className="dash-mini-kpi-value" style={{ color: branchDetail.lowStockProductsCount > 0 ? 'var(--danger)' : 'var(--text)' }}>
                    {branchDetail.lowStockProductsCount}
                  </span>
                </div>
              </div>

              <div className="dash-chart-title-row">
                <span className="dash-chart-title">Ventas mensuales</span>
                <span className="dash-chart-title-delta">
                  <Delta value={branchDetail.percentChangeVsPreviousMonth} /> vs. mes anterior
                </span>
              </div>

              {branchDetailLoading
                ? <p className="dash-chart-empty">Cargando histórico...</p>
                : <SalesChart history={branchDetail.monthlyHistory} />}
            </div>

            <div className="modal-footer">
              <Link to="/inventory" className="dash-link-out" onClick={closeBranchDetail}>Ver inventario de esta sucursal →</Link>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
