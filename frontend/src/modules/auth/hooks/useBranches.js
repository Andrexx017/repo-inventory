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
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  function openCreateModal() {
    resetForm();
    setFormError('');
    setIsModalOpen(true);
  }

  function closeModal() {
    resetForm();
    setFormError('');
    setIsModalOpen(false);
  }

  const CODE_PATTERN = /^[A-Z]{3}-\d{2}$/;

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (editingId === null && !CODE_PATTERN.test(code)) {
      setFormError('El código debe tener el formato AAA-99 (3 letras, guion y 2 números, ej: BOG-01).');
      return;
    }

    try {
      if (editingId === null) {
        await createBranch({ code, name, address, city, phone });
      } else {
        await updateBranch(editingId, { name, address, city, phone, active });
      }

      closeModal();
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
    setFormError('');
    setIsModalOpen(true);
  }

  const term = search.trim().toLowerCase();
  const filteredBranches = term
    ? branches.filter((b) =>
        b.code.toLowerCase().includes(term) ||
        b.name.toLowerCase().includes(term) ||
        (b.city || '').toLowerCase().includes(term))
    : branches;

  return {
    branches: filteredBranches,
    totalCount: branches.length,
    loading,
    error,
    search,
    setSearch,
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
    isModalOpen,
    openCreateModal,
    closeModal,
    handleSubmit,
    handleEdit,
    resetForm,
  };
}
