import { useState, useRef, useEffect, useCallback } from 'react';
import RouteGuard from '../../components/RouteGuard';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { readFileForUpload } from '../../lib/readFileForUpload';

interface Manufacturer {
  id: string;
  name: string;
  slug: string;
}

interface CatalogChange {
  id: string;
  change_type: 'new_product' | 'price_change' | 'discontinued';
  sku: string;
  name: string;
  old_price_cents: number | null;
  new_price_cents: number | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  manufacturers: { name: string; slug: string } | null;
  catalog_import_batches: { source_filename: string; is_full_catalog: boolean } | null;
}

const CHANGE_TYPE_LABEL: Record<string, string> = {
  new_product: '🆕 Neues Produkt',
  price_change: '💶 Preisänderung',
  discontinued: '🚫 Vermutlich abgekündigt',
};

function formatCents(cents: number | null): string {
  if (cents === null || cents === undefined) return '-';
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export default function CatalogChangesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [manufacturerSlug, setManufacturerSlug] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isFullCatalog, setIsFullCatalog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<{ totalRows: number; newCount: number; priceChangeCount: number; discontinuedCount: number; unchangedCount: number } | null>(null);

  const [changes, setChanges] = useState<CatalogChange[]>([]);
  const [loadingChanges, setLoadingChanges] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadManufacturers = useCallback(async () => {
    const { data } = await supabase.from('manufacturers').select('id, name, slug').eq('is_active', true).order('name');
    setManufacturers((data as any) || []);
  }, []);

  const loadPendingChanges = useCallback(async () => {
    setLoadingChanges(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/catalog-changes?status=pending', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.success) setChanges(data.changes);
    } finally {
      setLoadingChanges(false);
    }
  }, []);

  useEffect(() => {
    loadManufacturers();
    loadPendingChanges();
  }, [loadManufacturers, loadPendingChanges]);

  const handleCompare = async () => {
    if (!file || !manufacturerSlug) return;
    setLoading(true);
    setError('');
    setSummary(null);

    try {
      const { fileContent, isBase64 } = await readFileForUpload(file);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Nicht angemeldet');

      const res = await fetch('/api/admin/catalog-diff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileContent,
          isBase64,
          fileName: file.name,
          manufacturerSlug,
          isFullCatalog,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vergleich fehlgeschlagen');

      setSummary(data.summary);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadPendingChanges();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Vergleichen');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setReviewingId(id);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Nicht angemeldet');

      const res = await fetch('/api/admin/catalog-changes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aktion fehlgeschlagen');

      setChanges((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err.message || 'Fehler bei der Freigabe');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <RouteGuard requireAdmin>
      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            💶 Preis-/Sortiments-Monitor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Preisliste eines Herstellers hochladen, mit dem aktuellen Katalog vergleichen und Änderungen gezielt freigeben.
          </p>
        </div>

        {/* Upload & Compare */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Neue Preisliste vergleichen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hersteller *
              </label>
              <select
                value={manufacturerSlug}
                onChange={(e) => setManufacturerSlug(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Bitte wählen...</option>
                {manufacturers.map((m) => (
                  <option key={m.slug} value={m.slug}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preisliste (.csv, .xlsx)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                className="w-full text-sm text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 mb-4 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={isFullCatalog}
              onChange={(e) => setIsFullCatalog(e.target.checked)}
            />
            Diese Liste enthält das <strong>komplette Sortiment</strong> dieses Herstellers (nötig, damit fehlende Artikel als &quot;vermutlich abgekündigt&quot; erkannt werden)
          </label>

          <button
            onClick={handleCompare}
            disabled={!file || !manufacturerSlug || loading}
            className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Vergleiche...' : 'Vergleichen'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {summary && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalRows}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Zeilen gesamt</div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.newCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Neu</div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summary.priceChangeCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Preisänderung</div>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">{summary.discontinuedCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Abgekündigt</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">{summary.unchangedCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Unverändert</div>
              </div>
            </div>
          )}
        </div>

        {/* Pending Changes */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Offene Änderungen zur Freigabe {changes.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-600 text-white text-sm rounded-full">{changes.length}</span>
            )}
          </h2>

          {loadingChanges ? (
            <p className="text-gray-500 dark:text-gray-400">Lade...</p>
          ) : changes.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Keine offenen Änderungen. 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Typ</th>
                    <th className="px-4 py-2 text-left">Hersteller</th>
                    <th className="px-4 py-2 text-left">SKU / Name</th>
                    <th className="px-4 py-2 text-right">Alter Preis</th>
                    <th className="px-4 py-2 text-right">Neuer Preis</th>
                    <th className="px-4 py-2 text-left">Quelle</th>
                    <th className="px-4 py-2 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap">{CHANGE_TYPE_LABEL[c.change_type]}</td>
                      <td className="px-4 py-2">{c.manufacturers?.name || '-'}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{c.sku}</div>
                      </td>
                      <td className="px-4 py-2 text-right">{formatCents(c.old_price_cents)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatCents(c.new_price_cents)}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                        {c.catalog_import_batches?.source_filename}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleReview(c.id, 'approve')}
                          disabled={reviewingId === c.id}
                          className="px-3 py-1 mr-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Übernehmen
                        </button>
                        <button
                          onClick={() => handleReview(c.id, 'reject')}
                          disabled={reviewingId === c.id}
                          className="px-3 py-1 bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-slate-500 disabled:opacity-50"
                        >
                          Verwerfen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminLayout>
    </RouteGuard>
  );
}
