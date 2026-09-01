import AppShell from '../../../shared/components/AppShell';
import { useReports, REPORT_TYPES, REPORT_FORMATS } from '../hooks/useReports';
import './Reports.css';

export default function Reports() {
  const {
    branches, branchId, setBranchId, isGeneralAdmin, canMutate,
    type, setType, format, setFormat, from, setFrom, to, setTo,
    exporting, error, handleExport,
  } = useReports();

  const currentBranch = branches.find((b) => String(b.id) === branchId);

  return (
    <AppShell title="Reportes">
      <div className="rep-topline">
        <div>
          <h1 className="page-title">Reportes</h1>
          {currentBranch && (
            <p className="page-subtitle mono">
              {currentBranch.code} · {currentBranch.name} · {currentBranch.city}
            </p>
          )}
        </div>

        <div className="rep-branch-picker">
          <div className="rep-branch-row">
            {isGeneralAdmin && <span className="status-pill status-pill-accent">ACCESO TOTAL</span>}
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name} — {branch.city}</option>
              ))}
            </select>
          </div>
          {!isGeneralAdmin && (
            <span className="rep-branch-note">Solo podés exportar reportes de tu propia sucursal.</span>
          )}
        </div>
      </div>

      {canMutate ? (
        <form onSubmit={handleExport} className="form-card rep-form">
          <h2>Exportar reporte</h2>

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

            <div className="field">
              <label htmlFor="rep-from">Desde</label>
              <input id="rep-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
            </div>

            <div className="field">
              <label htmlFor="rep-to">Hasta</label>
              <input id="rep-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={exporting}>
            {exporting ? 'GENERANDO…' : 'EXPORTAR'}
          </button>
        </form>
      ) : (
        <p className="rep-readonly-note">
          Estás viendo otra sucursal en modo solo lectura. Para exportar sus reportes, cambiá a tu propia sucursal.
        </p>
      )}
    </AppShell>
  );
}
