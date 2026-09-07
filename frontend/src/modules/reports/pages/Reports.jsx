import AppShell from '../../../shared/components/AppShell';
import { useReports, REPORT_TYPES, REPORT_FORMATS, QUICK_RANGES } from '../hooks/useReports';
import { isIncomingMovement, movementTypeLabel } from '../../inventory/hooks/useInventory';
import { STATUS_LABELS as TRANSFER_STATUS_LABELS, STATUS_CLASSES as TRANSFER_STATUS_CLASSES } from '../../transfers/hooks/useTransfers';
import './Reports.css';

function formatMoney(value) {
  if (value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PREVIEW_COLUMNS = {
  'inventory-movements': ['FECHA', 'PRODUCTO', 'TIPO', 'CANTIDAD'],
  sales: ['N° VENTA', 'CLIENTE', 'FECHA', 'TOTAL'],
  transfers: ['N° TRANSFERENCIA', 'RUTA', 'FECHA', 'ESTADO'],
};

function PreviewRow({ type, item }) {
  if (type === 'inventory-movements') {
    const incoming = isIncomingMovement(item.movementType);
    return (
      <tr>
        <td className="mono text-muted">{formatDate(item.movementDate)}</td>
        <td style={{ fontWeight: 600 }}>{item.productName}</td>
        <td>
          <span className={`status-pill ${incoming ? 'status-pill-active' : 'status-pill-inactive'}`}>
            {movementTypeLabel(item.movementType)}
          </span>
        </td>
        <td className={`mono ${incoming ? 'text-success' : 'text-danger'}`}>
          {incoming ? '+' : '−'}{item.quantity}
        </td>
      </tr>
    );
  }

  if (type === 'sales') {
    return (
      <tr>
        <td className="mono">{item.saleNumber}</td>
        <td>{item.customerName || 'Consumidor final'}</td>
        <td className="mono text-muted">{formatDate(item.saleDate)}</td>
        <td className="mono">{formatMoney(item.total)}</td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="mono">{item.transferNumber}</td>
      <td>{item.originBranchName} → {item.destinationBranchName}</td>
      <td className="mono text-muted">{formatDate(item.requestDate)}</td>
      <td>
        <span className={`status-pill ${TRANSFER_STATUS_CLASSES[item.status] || 'status-pill-muted'}`}>
          {TRANSFER_STATUS_LABELS[item.status] || item.status}
        </span>
      </td>
    </tr>
  );
}

export default function Reports() {
  const {
    branches, branchId, setBranchId, isGeneralAdmin,
    type, setType, format, setFormat, from, setFrom, to, setTo, activeRange, applyQuickRange,
    exportingOnly, exportOnlyError, handleExportOnly,
    recipientEmailsInput, setRecipientEmailsInput,
    sendingEmail, sendEmailError, sendEmailSuccess, handleSendByEmail,
    previewItems, previewTotalCount, previewLoading, previewError,
  } = useReports();

  const currentBranch = branches.find((b) => String(b.id) === branchId);
  const branchSubtitle = currentBranch
    ? `${currentBranch.code} · ${currentBranch.name} · ${currentBranch.city}`
    : undefined;
  const columns = PREVIEW_COLUMNS[type];

  return (
    <AppShell
      title="Reportes"
      subtitle={branchSubtitle}
      branches={isGeneralAdmin ? branches : undefined}
      branchId={branchId}
      onBranchChange={setBranchId}
      branchLabel="Elige una sucursal"
    >
      <div className="rep-layout">
        <div className="form-card rep-config-card">
          <h2>Configuración de Reporte</h2>

          <div className="form-grid rep-grid">
            <div className="field">
              <label htmlFor="rep-type">Tipo de reporte</label>
              <select id="rep-type" value={type} onChange={(e) => setType(e.target.value)}>
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="rep-format">Formato</label>
              <select id="rep-format" value={format} onChange={(e) => setFormat(e.target.value)}>
                {REPORT_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field" style={{ marginBottom: '8px' }}>
            <label>Rango rápido de fechas</label>
            <div className="rep-quick-ranges">
              {QUICK_RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`rep-range-chip ${activeRange === r.value ? 'rep-range-chip-active' : ''}`}
                  onClick={() => applyQuickRange(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid rep-grid">
            <div className="field">
              <label htmlFor="rep-from">Desde</label>
              <input id="rep-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
            </div>

            <div className="field">
              <label htmlFor="rep-to">Hasta</label>
              <input id="rep-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
            </div>
          </div>

          {exportOnlyError && <p className="form-error">{exportOnlyError}</p>}

          {/* Exporta solo el archivo, sin correo — para quien nada más
              quiere el PDF/Excel del rango elegido. */}
          <button
            type="button"
            className="btn-secondary rep-export-only-btn"
            onClick={handleExportOnly}
            disabled={exportingOnly}
          >
            {exportingOnly ? 'EXPORTANDO…' : 'Exportar ahora'}
          </button>

          <div className="field" style={{ marginBottom: '8px' }}>
            <label htmlFor="rep-recipients">Correos Destinatarios</label>
            <input
              id="rep-recipients"
              type="text"
              placeholder="gerencia@sucursalia.com; logistica@sucursalia.com"
              value={recipientEmailsInput}
              onChange={(e) => setRecipientEmailsInput(e.target.value)}
            />
          </div>

          {sendEmailError && <p className="form-error">{sendEmailError}</p>}
          {sendEmailSuccess && <p className="rep-success">{sendEmailSuccess}</p>}

          {/* Genera el reporte del rango elegido y lo manda ya, por correo,
              a los destinatarios de arriba. */}
          <button
            type="button"
            className="btn-secondary btn-secondary-success rep-send-now-btn"
            onClick={handleSendByEmail}
            disabled={sendingEmail}
          >
            {sendingEmail ? 'ENVIANDO…' : 'Enviar por correo ahora'}
          </button>
        </div>

        <div className="rep-preview-panel">
          <div className="rep-preview-header">
            <h2 className="rep-preview-title">Vista previa de datos</h2>
            {!previewLoading && !previewError && (
              <span className="mono text-muted">
                {previewTotalCount} resultado{previewTotalCount === 1 ? '' : 's'} en este rango
                {previewTotalCount > previewItems.length ? ` · mostrando los primeros ${previewItems.length}` : ''}
              </span>
            )}
          </div>

          {previewError && <p className="form-error">{previewError}</p>}

          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((c) => <th key={c}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewLoading && (
                  <tr>
                    <td colSpan={columns.length} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>
                      Cargando vista previa…
                    </td>
                  </tr>
                )}

                {!previewLoading && previewItems.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>
                      Sin resultados en este rango.
                    </td>
                  </tr>
                )}

                {!previewLoading && previewItems.map((item) => (
                  <PreviewRow key={item.id} type={type} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
