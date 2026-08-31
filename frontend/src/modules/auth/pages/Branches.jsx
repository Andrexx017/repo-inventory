import { useBranches } from '../hooks/useBranches';

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

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Sucursales</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="code">Código</label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={editingId !== null}
            required
          />
        </div>

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
          <label htmlFor="address">Dirección</label>
          <input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="city">Ciudad</label>
          <input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="phone">Teléfono</label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {editingId !== null && (
          <div>
            <label htmlFor="active">
              <input
                id="active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Activa
            </label>
          </div>
        )}

        <p>{formError}</p>

        <button type="submit">
          {editingId === null ? 'Crear sucursal' : 'Guardar cambios'}
        </button>

        {editingId !== null && (
          <button type="button" onClick={resetForm}>Cancelar</button>
        )}
      </form>

      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Ciudad</th>
            <th>Activa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {branches.map((branch) => (
            <tr key={branch.id}>
              <td>{branch.code}</td>
              <td>{branch.name}</td>
              <td>{branch.city}</td>
              <td>{branch.active ? 'Sí' : 'No'}</td>
              <td>
                <button type="button" onClick={() => handleEdit(branch)}>Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
