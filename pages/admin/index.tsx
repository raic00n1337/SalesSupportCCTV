import { useEffect, useState } from 'react';
import RouteGuard from '../../components/RouteGuard';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalManufacturers: 0,
    totalProducts: 0,
    pendingCatalogChanges: 0,
    loading: true,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Count users (from profiles table)
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Count projects
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      // Count manufacturers
      const { count: manufacturersCount } = await supabase
        .from('manufacturers')
        .select('*', { count: 'exact', head: true });

      // Count products
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Count pending catalog changes (price/sortiment monitor)
      const { count: pendingChangesCount } = await supabase
        .from('catalog_changes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setStats({
        totalUsers: usersCount || 0,
        totalProjects: projectsCount || 0,
        totalManufacturers: manufacturersCount || 0,
        totalProducts: productsCount || 0,
        pendingCatalogChanges: pendingChangesCount || 0,
        loading: false,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <RouteGuard requireAdmin>
      <AdminLayout>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Willkommen zurück, {user?.email}
          </p>

          {!stats.loading && stats.pendingCatalogChanges > 0 && (
            <a
              href="/admin/catalog-changes"
              className="block mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <p className="text-amber-800 dark:text-amber-200 font-semibold">
                💶 {stats.pendingCatalogChanges} offene Preis-/Sortiments-Änderung{stats.pendingCatalogChanges === 1 ? '' : 'en'} warten auf Freigabe →
              </p>
            </a>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Benutzer"
              value={stats.totalUsers}
              icon="👥"
              loading={stats.loading}
              href="/admin/users"
            />
            <StatCard
              title="Projekte"
              value={stats.totalProjects}
              icon="📁"
              loading={stats.loading}
            />
            <StatCard
              title="Hersteller"
              value={stats.totalManufacturers}
              icon="🏭"
              loading={stats.loading}
              href="/admin/manufacturers"
            />
            <StatCard
              title="Produkte"
              value={stats.totalProducts}
              icon="📦"
              loading={stats.loading}
              href="/admin/products"
            />
            <StatCard
              title="Offene Preis-Änderungen"
              value={stats.pendingCatalogChanges}
              icon="💶"
              loading={stats.loading}
              href="/admin/catalog-changes"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Schnellzugriff
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickActionCard
                title="Neuen Hersteller anlegen"
                icon="🏭"
                href="/admin/manufacturers"
              />
              <QuickActionCard
                title="Neues Produkt anlegen"
                icon="📦"
                href="/admin/products"
              />
              <QuickActionCard
                title="Benutzer verwalten"
                icon="👥"
                href="/admin/users"
              />
              <QuickActionCard
                title="Konfigurator-Komponenten"
                icon="🎯"
                href="/admin/configurator-products"
              />
              <QuickActionCard
                title="Konfigurator-Einstellungen"
                icon="🧮"
                href="/admin/configurator-settings"
              />
              <QuickActionCard
                title="Produkt-Regeln"
                icon="⚡"
                href="/admin/rules"
              />
              <QuickActionCard
                title="Preis-/Sortiments-Monitor"
                icon="💶"
                href="/admin/catalog-changes"
              />
              <QuickActionCard
                title="Preisliste importieren"
                icon="📥"
                href="/admin/import-compiler"
              />
            </div>
          </div>
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  loading: boolean;
  href?: string;
}

function StatCard({ title, value, icon, loading, href }: StatCardProps) {
  const content = (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 ${href ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : value}
          </p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}

interface QuickActionCardProps {
  title: string;
  icon: string;
  href: string;
}

function QuickActionCard({ title, icon, href }: QuickActionCardProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-medium text-gray-900 dark:text-white">{title}</span>
    </a>
  );
}
