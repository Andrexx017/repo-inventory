import { useBranches } from '../hooks/useBranches';
import AppShell from '../../../shared/components/AppShell';

export default function Branches() {
  const {
    branches, loading, error,
    code, setCode,
    name, setName,
    address, setAddress,
    city, setCity,
    phone, setPhone,
    active, setActive,
    editingId, formError,
    handleSubmit, handleEdit, resetForm,
  } = useBranches();

  return (
    <AppShell title="Sucursales">
      <h1 className="page-title">Sucursales</h1>

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <form onSubmit={handleSubmit} className="form-card">
            <h2>{editingId === null ? 'Nueva sucursal' : 'Editar sucursal'}</h2>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="field">
                <label htmlFor="code">Código</label>
                <input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
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

            {formError && <p className="form-error">{formError}</p>}

            <button type="submit" className="btn-primary">
              {editingId === null ? 'CREAR SUCURSAL' : 'GUARDAR CAMBIOS'}
            </button>

            {editingId !== null && (
              <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
            )}
          </form>

          <div className="table-card">
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
                      <button type="button" className="table-action" onClick={() => handleEdit(branch)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
