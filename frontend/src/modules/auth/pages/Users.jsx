import { useUsers } from '../hooks/useUsers';

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

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Usuarios</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Nombre</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
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

        <div>
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
          <div>
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

        {editingId !== null && (
          <div>
            <label htmlFor="active">
              <input
                id="active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Activo
            </label>
          </div>
        )}

        <p>{formError}</p>

        <button type="submit">
          {editingId === null ? 'Crear usuario' : 'Guardar cambios'}
        </button>

        {editingId !== null && (
          <button type="button" onClick={resetForm}>Cancelar</button>
        )}
      </form>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Sucursal</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.roleName}</td>
              <td>{user.branchName || '—'}</td>
              <td>{user.active ? 'Sí' : 'No'}</td>
              <td>
                <button type="button" onClick={() => handleEdit(user)}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
