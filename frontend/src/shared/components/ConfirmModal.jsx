function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    );
}

// Modal de confirmación genérico ("¿Seguro que querés...?") para acciones de
// un solo clic sin formulario previo — hoy Aprobar/Cancelar orden de compra.
// Reutiliza .modal-overlay/.modal-panel-sm, mismo criterio que KpiModal.jsx.
export function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Volver',
    tone = 'default',
    onConfirm,
    onCancel,
}) {
    if (!open) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button type="button" className="modal-close" onClick={onCancel} aria-label="Cerrar">
                        <CloseIcon />
                    </button>
                </div>
                <div className="modal-body">
                    <p className="confirm-modal-message">{message}</p>
                </div>
                <div className="modal-footer">
                    <button
                        type="button"
                        className={`btn-primary ${tone === 'danger' ? 'btn-primary-danger' : ''}`}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                    <button type="button" className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
                </div>
            </div>
        </div>
    );
}
