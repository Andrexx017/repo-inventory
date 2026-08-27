import { useEffect, useState } from 'react';
import { getJson, postJson, putJson } from '../apiClient';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');

  async function load() {
    try {
      const [usersData, rolesData, branchesData] = await Promise.all([
        getJson('/api/users'),
        getJson('/api/roles'),
        getJson('/api/branches'),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setBranches(branchesData);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedRole = roles.find((role) => role.id === Number(roleId));
  const isGeneralAdmin = selectedRole?.code === 'general_admin';

  function resetForm() {
    setName('');
    setEmail('');
    setPassword('');
    setRoleId('');
    setBranchId('');
    setActive(true);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const parsedBranchId = branchId ? Number(branchId) : null;

    try {
      if (editingId === null) {
        await postJson('/api/users', {
          name,
          email,
          password,
          roleId: Number(roleId),
          branchId: parsedBranchId,
        });
      } else {
        await putJson(`/api/users/${editingId}`, {
          name,
          email,
          roleId: Number(roleId),
          branchId: parsedBranchId,
          active,
          password: password || null,
        });
      }

      resetForm();
      await load();
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar el usuario.');
    }
  }

  function handleEdit(user) {
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRoleId(String(user.roleId));
    setBranchId(user.branchId ? String(user.branchId) : '');
    setActive(user.active);
    setEditingId(user.id);
  }

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
