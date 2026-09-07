import { useBranches } from '../hooks/useBranches';
import AppShell from '../../../shared/components/AppShell';

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
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

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export default function Branches() {
  const {
    branches, totalCount, loading, error,
    search, setSearch,
    code, setCode,
    name, setName,
    address, setAddress,
    city, setCity,
    phone, setPhone,
    active, setActive,
    editingId, formError,
    isModalOpen, openCreateModal, closeModal,
    handleSubmit, handleEdit,
  } = useBranches();

  return (
    <AppShell title="Sucursales">
      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="form-card">
            <div className="list-filter-row">
              <div className="field">
                <label htmlFor="branch-search">Buscar (código, nombre o ciudad)</label>
                <input
                  id="branch-search"
                  type="text"
                  placeholder="Ej: BOG-01 o Bogotá"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="btn-group list-filter-actions">
                <button type="button" className="btn-primary" onClick={openCreateModal}>
                  <PlusIcon />
                  Nueva sucursal
                </button>
              </div>
            </div>

            <div className="list-filter-footer">
              <span className="text-muted" style={{ fontSize: '13px' }}>
                {branches.length} de {totalCount} sucursales
              </span>
              {search && (
                <button type="button" className="btn-secondary" style={{ marginLeft: 0 }} onClick={() => setSearch('')}>
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </div>

          <div className="table-card list-table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td>{branch.code}</td>
                    <td>{branch.name}</td>
                    <td>{branch.city}</td>
                    <td>
                      <span className={`status-pill ${branch.active ? 'status-pill-active' : 'status-pill-inactive'}`}>
                        {branch.active ? 'ACTIVA' : 'INACTIVA'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn-icon-square" onClick={() => handleEdit(branch)} aria-label="Editar sucursal" title="Editar">
                        <PencilIcon />
                      </button>
                    </td>
                  </tr>
                ))}

                {branches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>
                      Ninguna sucursal coincide con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId === null ? 'Nueva sucursal' : 'Editar sucursal'}</h2>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="field">
                    <label htmlFor="code">Código</label>
                    <input
                      id="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Ej: BOG-01"
                      maxLength={6}
                      pattern="[A-Z]{3}-\d{2}"
                      title="Formato: 3 letras, guion y 2 números (ej: BOG-01)"
                      disabled={editingId !== null}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="name">Nombre</label>
                    <input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="address">Dirección</label>
                    <input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="city">Ciudad</label>
                    <input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="phone">Teléfono</label>
                    <input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                {editingId !== null && (
                  <label className="field-checkbox" htmlFor="active">
                    <input
                      id="active"
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                    />
                    Activa
                  </label>
                )}

                {formError && <p className="form-error" style={{ marginBottom: 0 }}>{formError}</p>}
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-primary">
                  {editingId === null ? 'CREAR SUCURSAL' : 'GUARDAR CAMBIOS'}
                </button>
                <button type="button" className="btn-secondary btn-secondary-danger" onClick={closeModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
