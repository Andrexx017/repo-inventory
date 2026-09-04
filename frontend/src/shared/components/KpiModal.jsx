import './KpiModal.css';

function ChartIcon() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V10M12 20V4M20 20v-7" />
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

// Botón que abre el modal de indicadores (KpiModal) — separa las tarjetas
// informativas del flujo de la página para que la tabla tenga más alto
// disponible (ver AppShell.css: .app-content > .table-card). Reutilizado en
// Inventario, Ventas, Compras y Transferencias.
export function KpiModalTrigger({ onClick }) {
    return (
        <button type="button" className="kpi-modal-trigger" onClick={onClick}>
            <ChartIcon />
            <span>Ver indicadores</span>
        </button>
    );
}

export function KpiModal({ title, open, onClose, children }) {
    if (!open) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel modal-panel-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
                        <CloseIcon />
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}
