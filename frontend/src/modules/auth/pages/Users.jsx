import { useUsers } from '../hooks/useUsers';
import AppShell from '../../../shared/components/AppShell';

export default function Users() {
  const {
    users, roles, branches, loading, error,
    name, setName,
    email, setEmail,
    password, setPassword,
    roleId, setRoleId,
    branchId, setBranchId,
    active, setActive,
    editingId, formError, isGeneralAdmin,
    handleSubmit, handleEdit, resetForm,
  } = useUsers();

  return (
    <AppShell title="Usuarios">
      <h1 className="page-title">Usuarios</h1>

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <form onSubmit={handleSubmit} className="form-card">
            <h2>{editingId === null ? 'Nuevo usuario' : 'Editar usuario'}</h2>

            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">
                  {editingId === null ? 'Contraseña' : 'Nueva contraseña (opcional)'}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={editingId === null}
                  minLength={8}
                />
              </div>

              <div className="field">
                <label htmlFor="roleId">Rol</label>
                <select
                  id="roleId"
                  value={roleId}
                  onChange={(e) => {
                    setRoleId(e.target.value);
                    setBranchId('');
                  }}
                  required
                >
                  <option value="">Seleccione un rol</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              {!isGeneralAdmin && (
                <div className="field">
                  <label htmlFor="branchId">Sucursal</label>
                  <select
                    id="branchId"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    required
                  >
                    <option value="">Seleccione una sucursal</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {editingId !== null && (
              <label className="field-checkbox" htmlFor="active">
                <input
                  id="active"
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Activo
              </label>
            )}

            {formError && <p className="form-error">{formError}</p>}

            <button type="submit" className="btn-primary">
              {editingId === null ? 'CREAR USUARIO' : 'GUARDAR CAMBIOS'}
            </button>

            {editingId !== null && (
              <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>
            )}
          </form>

          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Sucursal</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const branchCity = branches.find((b) => b.id === user.branchId)?.city;

                  return (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.roleName}</td>
                      <td>{user.branchName || '—'}</td>
                      <td>{branchCity || '—'}</td>
                      <td>
                        <span className={`status-pill ${user.active ? 'status-pill-active' : 'status-pill-inactive'}`}>
                          {user.active ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="table-action" onClick={() => handleEdit(user)}>Editar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
