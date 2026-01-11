import { useEffect, useState } from 'react';
import RouteGuard from '../../components/RouteGuard';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

interface UserWithStats {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_admin: boolean;
  project_count: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      // Load all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Load all admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id');

      if (adminError) throw adminError;

      const adminUserIds = new Set((adminUsers || []).map((a: any) => a.user_id));

      // Load project counts for each user
      const usersWithStats: UserWithStats[] = await Promise.all(
        (profiles || []).map(async (profile: any) => {
          const { count } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', profile.id);

          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            created_at: profile.created_at,
            is_admin: adminUserIds.has(profile.id),
            project_count: count || 0,
          };
        })
      );

      setUsers(usersWithStats);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.message || 'Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    setUpdatingUserId(userId);

    try {
      if (currentStatus) {
        // Remove admin role
        const { error } = await (supabase
          .from('admin_users') as any)
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Add admin role
        const { error } = await (supabase
          .from('admin_users') as any)
          .insert({ user_id: userId });

        if (error) throw error;
      }

      // Reload users
      await loadUsers();
    } catch (err: any) {
      console.error('Error toggling admin status:', err);
      alert(`Fehler: ${err.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <RouteGuard requireAdmin>
      <AdminLayout>
        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Benutzerverwaltung
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Verwalten Sie Benutzer und Admin-Rollen
              </p>
            </div>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Lädt...' : '🔄 Aktualisieren'}
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Suche nach Email oder Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Lade Benutzer...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm ? 'Keine Benutzer gefunden.' : 'Noch keine Benutzer registriert.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Benutzer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Registriert
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Projekte
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                              <span className="text-primary-700 dark:text-primary-300 font-semibold">
                                {user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.full_name || 'Kein Name'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {new Date(user.created_at).toLocaleDateString('de-DE')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {user.project_count} {user.project_count === 1 ? 'Projekt' : 'Projekte'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.is_admin ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                              👑 Admin
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              Benutzer
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                            disabled={updatingUserId === user.id}
                            className={`px-3 py-1 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                              user.is_admin
                                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800'
                                : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                            }`}
                          >
                            {updatingUserId === user.id
                              ? '...'
                              : user.is_admin
                              ? 'Admin entfernen'
                              : 'Zu Admin machen'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stats */}
          {!loading && filteredUsers.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {filteredUsers.length === users.length
                ? `${users.length} ${users.length === 1 ? 'Benutzer' : 'Benutzer'} insgesamt`
                : `${filteredUsers.length} von ${users.length} Benutzern`}
              {' • '}
              {users.filter((u) => u.is_admin).length} Admin
              {users.filter((u) => u.is_admin).length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}
