import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/layouts';
import { Card, Badge, Button, Input } from '@/components/ui';
import { api } from '@/lib/api';

const adminNav = [
  { label: 'Panel', href: '/admin' },
  { label: 'Usuarios', href: '/admin/users' },
  { label: 'Talleres', href: '/admin/workshops' },
  { label: 'Proveedores', href: '/admin/suppliers' },
  { label: 'Reportes', href: '/admin/reports' },
  { label: 'Auditoria', href: '/admin/audit' },
  { label: 'Configuracion', href: '/admin/settings' },
];

type UserRole = 'CLIENT' | 'WORKSHOP_ADMIN' | 'TECHNICIAN' | 'SUPPLIER_ADMIN' | 'SUPER_ADMIN';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'PENDING_VERIFICATION';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_BADGE: Record<UserStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  ACTIVE: { label: 'Activo', variant: 'success' },
  SUSPENDED: { label: 'Suspendido', variant: 'warning' },
  BLOCKED: { label: 'Bloqueado', variant: 'danger' },
  PENDING_VERIFICATION: { label: 'Pendiente', variant: 'info' },
};

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: 'Cliente',
  WORKSHOP_ADMIN: 'Admin. Taller',
  TECHNICIAN: 'Tecnico',
  SUPPLIER_ADMIN: 'Admin. Proveedor',
  SUPER_ADMIN: 'Super Admin',
};

const ASSIGNABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'CLIENT', label: 'Cliente' },
  { value: 'WORKSHOP_ADMIN', label: 'Admin. Taller' },
  { value: 'TECHNICIAN', label: 'Tecnico' },
  { value: 'SUPPLIER_ADMIN', label: 'Admin. Proveedor' },
];

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Todos los roles' },
  ...ASSIGNABLE_ROLES,
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'SUSPENDED', label: 'Suspendidos' },
  { value: 'BLOCKED', label: 'Bloqueados' },
  { value: 'PENDING_VERIFICATION', label: 'Pendientes' },
];

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    type: 'suspend' | 'delete';
    userName: string;
  } | null>(null);

  const [roleChangeUser, setRoleChangeUser] = useState<{ id: string; name: string; currentRole: UserRole } | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('CLIENT');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await api.get<PaginatedUsers>('/admin/users', params);
      if (!controller.signal.aborted) {
        setUsers(res.data);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [page, roleFilter, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchUsers();
    return () => abortRef.current?.abort();
  }, [fetchUsers]);

  function resetFilters(setter: () => void) {
    setter();
    setPage(1);
  }

  async function handleActivate(userId: string) {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/activate`);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar usuario');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSuspend(userId: string) {
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/suspend`);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al suspender usuario');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }

  async function handleDelete(userId: string) {
    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  }

  async function handleRoleChange() {
    if (!roleChangeUser) return;
    setActionLoading(roleChangeUser.id);
    try {
      await api.patch(`/admin/users/${roleChangeUser.id}/role`, { role: newRole });
      await fetchUsers();
      setRoleChangeUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar rol');
    } finally {
      setActionLoading(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const selectClasses = "px-3 py-2 min-h-[44px] rounded-btn border border-surface-border text-text-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50";

  return (
    <DashboardLayout roleName="Super Admin" navItems={adminNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Gestion de usuarios</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (page !== 1) setPage(1); }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => resetFilters(() => setRoleFilter(e.target.value))}
          className={selectClasses}
        >
          {ROLE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => resetFilters(() => setStatusFilter(e.target.value))}
          className={selectClasses}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <Card className="mb-4">
          <div className="text-center py-3 text-red-600 text-sm">{error}</div>
        </Card>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <h3 className="font-semibold text-text-primary mb-2">
              {confirmAction.type === 'suspend' ? 'Suspender usuario' : 'Eliminar usuario'}
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              {confirmAction.type === 'suspend'
                ? `Estas seguro de suspender a "${confirmAction.userName}"? No podra acceder a la plataforma.`
                : `Estas seguro de eliminar a "${confirmAction.userName}"? Esta accion no se puede deshacer.`
              }
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={actionLoading === confirmAction.userId}
                onClick={() => confirmAction.type === 'suspend'
                  ? handleSuspend(confirmAction.userId)
                  : handleDelete(confirmAction.userId)
                }
              >
                {confirmAction.type === 'suspend' ? 'Suspender' : 'Eliminar'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Role change modal */}
      {roleChangeUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <h3 className="font-semibold text-text-primary mb-2">Cambiar rol</h3>
            <p className="text-sm text-text-secondary mb-3">
              Cambiar rol de "{roleChangeUser.name}"
            </p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className={`${selectClasses} w-full mb-4`}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setRoleChangeUser(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                loading={actionLoading === roleChangeUser.id}
                disabled={newRole === roleChangeUser.currentRole}
                onClick={handleRoleChange}
              >
                Cambiar
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-4 border-brand-orange border-t-transparent rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm">
            No se encontraron usuarios con los filtros seleccionados.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Rol</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Registro</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const statusBadge = STATUS_BADGE[user.status];
                    const isSuperAdmin = user.role === 'SUPER_ADMIN';
                    return (
                      <tr key={user.id} className="border-b border-surface-border last:border-b-0 hover:bg-surface-muted/30 transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium">
                          {user.firstName} {user.lastName}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default">{ROLE_LABELS[user.role]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isSuperAdmin ? (
                            <span className="text-xs text-text-secondary">Sin acciones</span>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {user.status !== 'ACTIVE' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  loading={actionLoading === user.id}
                                  onClick={() => handleActivate(user.id)}
                                >
                                  Activar
                                </Button>
                              )}
                              {user.status === 'ACTIVE' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmAction({
                                    userId: user.id,
                                    type: 'suspend',
                                    userName: `${user.firstName} ${user.lastName}`,
                                  })}
                                >
                                  Suspender
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRoleChangeUser({
                                    id: user.id,
                                    name: `${user.firstName} ${user.lastName}`,
                                    currentRole: user.role,
                                  });
                                  setNewRole(user.role);
                                }}
                              >
                                Rol
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => setConfirmAction({
                                  userId: user.id,
                                  type: 'delete',
                                  userName: `${user.firstName} ${user.lastName}`,
                                })}
                              >
                                Eliminar
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-surface-border">
              {users.map((user) => {
                const statusBadge = STATUS_BADGE[user.status];
                const isSuperAdmin = user.role === 'SUPER_ADMIN';
                return (
                  <div key={user.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-text-secondary">{user.email}</p>
                      </div>
                      <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{ROLE_LABELS[user.role]}</Badge>
                      <span className="text-xs text-text-secondary">{formatDate(user.createdAt)}</span>
                    </div>
                    {!isSuperAdmin && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {user.status !== 'ACTIVE' && (
                          <Button variant="outline" size="sm" loading={actionLoading === user.id} onClick={() => handleActivate(user.id)}>
                            Activar
                          </Button>
                        )}
                        {user.status === 'ACTIVE' && (
                          <Button variant="outline" size="sm" onClick={() => setConfirmAction({ userId: user.id, type: 'suspend', userName: `${user.firstName} ${user.lastName}` })}>
                            Suspender
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => { setRoleChangeUser({ id: user.id, name: `${user.firstName} ${user.lastName}`, currentRole: user.role }); setNewRole(user.role); }}>
                          Rol
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => setConfirmAction({ userId: user.id, type: 'delete', userName: `${user.firstName} ${user.lastName}` })}>
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-text-secondary">
                  Pagina {page} de {totalPages}
                </span>
                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
