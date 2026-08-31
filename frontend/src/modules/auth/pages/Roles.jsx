import { useRoles } from '../hooks/useRoles';
import AppShell from '../../../shared/components/AppShell';

export default function Roles() {
  const { roles, loading, error } = useRoles();

  return (
    <AppShell title="Roles">
      <div>
        <h1 className="page-title">Roles</h1>
        <p className="page-subtitle">Catálogo de solo lectura — los roles se asignan desde Usuarios.</p>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && (
        <div className="table-card">
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
                  <td>{role.code}</td>
                  <td>{role.name}</td>
                  <td>{role.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
