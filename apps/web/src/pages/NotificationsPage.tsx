import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface PaginatedNotifications {
  data: Notification[];
  total: number;
  unread: number;
  page: number;
  totalPages: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get<PaginatedNotifications>('/notifications', { limit: '20' });
        setNotifications(res.data);
        setTotal(res.total);
        setUnread(res.unread);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar notificaciones');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function markAsRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }

  const roleHome: Record<string, string> = {
    CLIENT: '/client',
    WORKSHOP_ADMIN: '/workshop',
    TECHNICIAN: '/technician',
    SUPPLIER_ADMIN: '/supplier',
    SUPER_ADMIN: '/admin',
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="bg-brand-navy text-white h-14 flex items-center px-4 lg:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg">WEIXTROM</span>
          <span className="text-white/70 text-sm hidden sm:inline">| Notificaciones</span>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => navigate(user ? roleHome[user.role] || '/' : '/')}
            className="text-white/60 hover:text-white text-sm"
          >
            Volver al panel
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-text-primary">Notificaciones</h1>
          {unread > 0 && (
            <Badge variant="warning">{unread} sin leer</Badge>
          )}
        </div>

        {error && (
          <Card>
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        )}

        <Card padding="none">
          {loading ? (
            <div className="animate-pulse space-y-3 p-4">
              <div className="h-4 bg-surface-border rounded w-1/3" />
              <div className="h-4 bg-surface-border rounded w-full" />
              <div className="h-4 bg-surface-border rounded w-2/3" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-text-secondary text-sm">
              No tienes notificaciones.
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 transition-colors ${n.read ? '' : 'bg-brand-orange/5'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm ${n.read ? 'text-text-secondary' : 'font-medium text-text-primary'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">{n.body}</p>
                      <p className="text-xs text-text-secondary/60 mt-1">{formatDate(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)}>
                        Marcar leida
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {total > 0 && (
          <p className="text-xs text-text-secondary text-center mt-4">
            {total} notificacion{total !== 1 ? 'es' : ''} en total
          </p>
        )}
      </main>
    </div>
  );
}
