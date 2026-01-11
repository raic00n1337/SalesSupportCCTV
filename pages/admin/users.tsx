import RouteGuard from '../../components/RouteGuard';
import AdminLayout from '../../components/AdminLayout';

export default function AdminUsers() {
  return (
    <RouteGuard requireAdmin>
      <AdminLayout>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Benutzerverwaltung
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Verwalten Sie Benutzer und Admin-Rollen
          </p>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              In Entwicklung
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Diese Seite wird im nächsten Schritt implementiert.
            </p>
          </div>
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}
