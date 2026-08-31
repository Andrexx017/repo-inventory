import { useEffect, useState } from 'react';
import { getBranches, createBranch, updateBranch } from '../api/branchesApi';

export function useBranches() {
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
      const data = await getBranches();
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
        await createBranch({ code, name, address, city, phone });
      } else {
        await updateBranch(editingId, { name, address, city, phone, active });
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

  return {
    branches,
    loading,
    error,
    code,
    setCode,
    name,
    setName,
    city,
    setCity,
    active,
    setActive,
    address,
    setAddress,
    phone,
    setPhone,
    editingId,
    formError,
    handleSubmit,
    handleEdit,
    resetForm,
  };
}
