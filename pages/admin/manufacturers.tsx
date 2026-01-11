import { useEffect, useState } from 'react';
import RouteGuard from '../../components/RouteGuard';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';

interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminManufacturers() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalForm, setModalForm] = useState({
    id: '',
    name: '',
    slug: '',
    isActive: true,
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleteName, setDeleteName] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadManufacturers();
  }, []);

  const loadManufacturers = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('manufacturers')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setManufacturers(data || []);
    } catch (err: any) {
      console.error('Error loading manufacturers:', err);
      setError(err.message || 'Fehler beim Laden der Hersteller');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setModalForm({ id: '', name: '', slug: '', isActive: true });
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (manufacturer: Manufacturer) => {
    setModalMode('edit');
    setModalForm({
      id: manufacturer.id,
      name: manufacturer.name,
      slug: manufacturer.slug,
      isActive: manufacturer.is_active,
    });
    setModalError('');
    setShowModal(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      // Validate
      if (!modalForm.name || !modalForm.slug) {
        throw new Error('Name und Slug sind erforderlich');
      }

      if (!/^[a-z0-9-]+$/.test(modalForm.slug)) {
        throw new Error('Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten');
      }

      if (modalMode === 'create') {
        // Create new manufacturer
        const { error: insertError } = await (supabase
          .from('manufacturers') as any)
          .insert({
            name: modalForm.name,
            slug: modalForm.slug,
            is_active: modalForm.isActive,
          });

        if (insertError) throw insertError;
      } else {
        // Update existing manufacturer
        const { error: updateError } = await (supabase
          .from('manufacturers') as any)
          .update({
            name: modalForm.name,
            slug: modalForm.slug,
            is_active: modalForm.isActive,
          })
          .eq('id', modalForm.id);

        if (updateError) throw updateError;
      }

      // Reload and close
      await loadManufacturers();
      setShowModal(false);
      setModalForm({ id: '', name: '', slug: '', isActive: true });
    } catch (err: any) {
      console.error('Error saving manufacturer:', err);
      setModalError(err.message || 'Fehler beim Speichern');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);

    try {
      const { error: deleteError } = await (supabase
        .from('manufacturers') as any)
        .delete()
        .eq('id', deleteId);

      if (deleteError) throw deleteError;

      // Reload and close
      await loadManufacturers();
      setShowDeleteConfirm(false);
      setDeleteId('');
      setDeleteName('');
    } catch (err: any) {
      console.error('Error deleting manufacturer:', err);
      alert(`Fehler: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase
        .from('manufacturers') as any)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      // Reload
      await loadManufacturers();
    } catch (err: any) {
      console.error('Error toggling status:', err);
      alert(`Fehler: ${err.message}`);
    }
  };

  return (
    <RouteGuard requireAdmin>
      <AdminLayout>
        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Hersteller
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Verwalten Sie Kamera-Hersteller
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                ➕ Neuer Hersteller
              </button>
              <button
                onClick={loadManufacturers}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Lädt...' : '🔄 Aktualisieren'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Manufacturers Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Lade Hersteller...</p>
              </div>
            ) : manufacturers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">Noch keine Hersteller angelegt.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Slug
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Erstellt
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {manufacturers.map((manufacturer) => (
                      <tr key={manufacturer.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {manufacturer.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                            {manufacturer.slug}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {manufacturer.is_active ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                              ✓ Aktiv
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              ✗ Inaktiv
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {new Date(manufacturer.created_at).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(manufacturer)}
                              className="px-3 py-1 rounded-lg font-semibold transition-colors bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                              ✏️ Bearbeiten
                            </button>
                            <button
                              onClick={() => handleToggleActive(manufacturer.id, manufacturer.is_active)}
                              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                                manufacturer.is_active
                                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                                  : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                              }`}
                            >
                              {manufacturer.is_active ? '❌ Deaktivieren' : '✅ Aktivieren'}
                            </button>
                            <button
                              onClick={() => {
                                setDeleteId(manufacturer.id);
                                setDeleteName(manufacturer.name);
                                setShowDeleteConfirm(true);
                              }}
                              className="px-3 py-1 rounded-lg font-semibold transition-colors bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                            >
                              🗑️ Löschen
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stats */}
          {!loading && manufacturers.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {manufacturers.length} Hersteller insgesamt • {manufacturers.filter(m => m.is_active).length} aktiv
            </div>
          )}

          {/* Create/Edit Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {modalMode === 'create' ? 'Neuer Hersteller' : 'Hersteller bearbeiten'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>

                {modalError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{modalError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={modalForm.name}
                      onChange={(e) => {
                        setModalForm({ ...modalForm, name: e.target.value });
                        // Auto-generate slug only when creating
                        if (modalMode === 'create') {
                          setModalForm(prev => ({ ...prev, name: e.target.value, slug: generateSlug(e.target.value) }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="z.B. AXIS"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Slug * (nur Kleinbuchstaben, Zahlen, Bindestriche)
                    </label>
                    <input
                      type="text"
                      required
                      value={modalForm.slug}
                      onChange={(e) => setModalForm({ ...modalForm, slug: e.target.value.toLowerCase() })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                      placeholder="z.B. axis"
                      pattern="[a-z0-9-]+"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={modalForm.isActive}
                      onChange={(e) => setModalForm({ ...modalForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Aktiv
                    </label>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {modalLoading ? 'Speichert...' : modalMode === 'create' ? 'Erstellen' : 'Speichern'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Hersteller löschen?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Möchten Sie <strong className="text-gray-900 dark:text-white">{deleteName}</strong> wirklich löschen?
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteId('');
                      setDeleteName('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? 'Löscht...' : 'Löschen'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}
