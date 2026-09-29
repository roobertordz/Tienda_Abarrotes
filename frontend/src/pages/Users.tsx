import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { User } from '../types';
import { Plus, Edit, Shield, UserCheck, UserX, X, Save, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {
      toast.error('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleActive = async (user: User) => {
    try {
      await api.put(`/users/${user.id}`, { active: !user.active });
      toast.success(`Usuario ${!user.active ? 'activado' : 'desactivado'}`);
      fetchUsers();
    } catch {
      toast.error('Error');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get('/users/activity-log', { params: { limit: 100 } });
      setLogs(res.data.data);
      setShowLogs(true);
    } catch {
      toast.error('Error cargando bitácora');
    }
  };

  const roleLabel: Record<string, string> = { ADMIN: 'Administrador', CAJERO: 'Cajero', SUPERVISOR: 'Supervisor' };
  const roleColor: Record<string, string> = { ADMIN: 'bg-red-100 text-red-700', CAJERO: 'bg-blue-100 text-blue-700', SUPERVISOR: 'bg-purple-100 text-purple-700' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
          <p className="text-sm text-gray-500">Gestión de usuarios y permisos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} className="btn-secondary py-2 px-4 text-sm">Bitácora</button>
          <button onClick={() => { setEditingUser(null); setShowForm(true); }} className="btn-primary py-2 px-4 text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div key={user.id} className={`card ${!user.active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <span className="text-primary-700 font-bold text-lg">{user.fullName.charAt(0)}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleColor[user.role]}`}>
                {roleLabel[user.role]}
              </span>
            </div>
            <h3 className="font-semibold text-gray-800">{user.fullName}</h3>
            <p className="text-sm text-gray-500">@{user.username}</p>
            <p className="text-xs text-gray-400 mt-1">{user.email}</p>
            {user.lastLogin && (
              <p className="text-xs text-gray-400 mt-1">
                Último acceso: {new Date(user.lastLogin).toLocaleString('es-MX')}
              </p>
            )}
            <div className="flex gap-2 mt-4 pt-3 border-t">
              <button onClick={() => { setEditingUser(user); setShowForm(true); }} className="flex-1 btn-secondary py-1.5 text-xs flex items-center justify-center gap-1">
                <Edit className="w-3 h-3" /> Editar
              </button>
              <button onClick={() => handleToggleActive(user)} className={`flex-1 py-1.5 text-xs rounded-lg font-medium flex items-center justify-center gap-1 ${user.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                {user.active ? <><UserX className="w-3 h-3" /> Desactivar</> : <><UserCheck className="w-3 h-3" /> Activar</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* User Form Modal */}
      {showForm && (
        <UserFormModal user={editingUser} onClose={(saved) => { setShowForm(false); setEditingUser(null); if (saved) fetchUsers(); }} />
      )}

      {/* Activity Log Modal */}
      {showLogs && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold">Bitácora de Actividades</h2>
              <button onClick={() => setShowLogs(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Shield className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.description}</p>
                      <p className="text-xs text-gray-500">
                        {log.user?.fullName} • {new Date(log.createdAt).toLocaleString('es-MX')}
                      </p>
                    </div>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">{log.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserFormModal({ user, onClose }: { user: User | null; onClose: (saved?: boolean) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    fullName: user?.fullName || '',
    password: '',
    role: user?.role || 'CAJERO',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.fullName || (!user && !form.password)) {
      toast.error('Completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const data: any = { ...form };
      if (!data.password) delete data.password;

      if (user) {
        await api.put(`/users/${user.id}`, data);
        toast.success('Usuario actualizado');
      } else {
        await api.post('/users', data);
        toast.success('Usuario creado');
      }
      onClose(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-xl font-bold">{user ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <button onClick={() => onClose()} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Nombre Completo *</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Usuario *</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Contraseña {user ? '(dejar vacío para no cambiar)' : '*'}</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field pr-10" required={!user} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Rol *</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'CAJERO' | 'SUPERVISOR' })} className="input-field">
              <option value="CAJERO">Cajero</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => onClose()} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-1">
              <Save className="w-4 h-4" /> {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
