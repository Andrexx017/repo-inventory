import { useEffect, useState } from 'react';
import { getRoles } from '../api/rolesApi';

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los roles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { roles, loading, error };
}
