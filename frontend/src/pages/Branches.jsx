import { useEffect, useState } from 'react';
import { getJson, postJson, putJson } from '../apiClient';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [active, setActive] = useState(true);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');

  async function load() {
    try {
      const data = await getJson('/api/branches');
      setBranches(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las sucursales.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setCode('');
    setName('');
    setAddress('');
    setCity('');
    setPhone('');
    setActive(true);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    try {
      if (editingId === null) {
        await postJson('/api/branches', { code, name, address, city, phone });
      } else {
        await putJson(`/api/branches/${editingId}`, { name, address, city, phone, active });
      }

      resetForm();
      await load();
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar la sucursal.');
    }
  }

  function handleEdit(branch) {
    setCode(branch.code);
    setName(branch.name);
    setAddress(branch.address || '');
    setCity(branch.city || '');
    setPhone(branch.phone || '');
    setActive(branch.active);
    setEditingId(branch.id);
  }

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
