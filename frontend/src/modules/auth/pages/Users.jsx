import { useUsers } from '../hooks/useUsers';
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

export default function Users() {
  const {
    users, totalCount, roles, branches, loading, error,
    search, setSearch,
    name, setName,
    email, setEmail,
    password, setPassword,
    roleId, setRoleId,
    branchId, setBranchId,
    active, setActive,
    editingId, formError, isGeneralAdmin,
    isModalOpen, openCreateModal, closeModal,
    handleSubmit, handleEdit,
    isRolesModalOpen, openRolesModal, closeRolesModal,
  } = useUsers();

  return (
    <AppShell title="Usuarios">
      <div className="action-row">
        <h1 className="page-title">Usuarios</h1>
        <div className="btn-group">
          <button type="button" className="btn-secondary" onClick={openRolesModal}>Ver roles</button>
          <button type="button" className="btn-primary" onClick={openCreateModal}>
            <PlusIcon />
            Nuevo usuario
          </button>
        </div>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="form-card">
            <div className="form-grid" style={{ gridTemplateColumns: '1fr', marginBottom: 0 }}>
              <div className="field">
                <label htmlFor="user-search">Buscar (nombre o email)</label>
                <input
                  id="user-search"
                  type="text"
                  placeholder="Ej: Diana o diana.torres@inventory.test"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
              <span className="text-muted" style={{ fontSize: '13px' }}>
                {users.length} de {totalCount} usuarios
              </span>
              {search && (
                <button type="button" className="btn-secondary" style={{ marginLeft: 0 }} onClick={() => setSearch('')}>
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </div>

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

                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-muted" style={{ textAlign: 'center', padding: '24px' }}>
                      Ningún usuario coincide con la búsqueda.
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
              <h2 className="modal-title">{editingId === null ? 'Nuevo usuario' : 'Editar usuario'}</h2>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
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

                {formError && <p className="form-error" style={{ marginBottom: 0 }}>{formError}</p>}
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-primary">
                  {editingId === null ? 'CREAR USUARIO' : 'GUARDAR CAMBIOS'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRolesModalOpen && (
        <div className="modal-overlay" onClick={closeRolesModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Roles</h2>
              <button type="button" className="modal-close" onClick={closeRolesModal} aria-label="Cerrar">
                <CloseIcon />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Catálogo de solo lectura — los roles se asignan desde el formulario de Usuarios.
              </p>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id}>
                      <td className="mono">{role.code}</td>
                      <td style={{ fontWeight: 600 }}>{role.name}</td>
                      <td>{role.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
