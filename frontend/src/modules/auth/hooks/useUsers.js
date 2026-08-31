import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser } from '../api/usersApi';
import { getRoles } from '../api/rolesApi';
import { getBranches } from '../api/branchesApi';

export function useUsers() {
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
        getUsers(),
        getRoles(),
        getBranches(),
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
        await createUser({
          name,
          email,
          password,
          roleId: Number(roleId),
          branchId: parsedBranchId,
        });
      } else {
        await updateUser(editingId, {
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

  return {
    users,
    roles,
    branches,
    loading,
    error,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    roleId,
    setRoleId,
    branchId,
    setBranchId,
    active,
    setActive,
    editingId,
    formError,
    isGeneralAdmin,
    handleSubmit,
    handleEdit,
    resetForm,
  };
}
