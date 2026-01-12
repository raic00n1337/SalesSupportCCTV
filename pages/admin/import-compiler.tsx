import { useState, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import RouteGuard from '../../components/RouteGuard';
import { supabase } from '../../lib/supabase';
import type { CompilerResult, ColumnMapping } from '../../lib/csvCompilerTypes';
import { FORMAT_PROFILES } from '../../lib/formatProfiles';

export default function ImportCompiler() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [compilerResult, setCompilerResult] = useState<CompilerResult | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    setSuccess('');
    setCompilerResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleCompile = async () => {
    if (!file || !user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Read file content
      const fileContent = await readFileContent(file);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call API
      const response = await fetch('/api/admin/compile-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileContent,
          fileName: file.name,
          options: {
            autoDetect: true,
            validateData: true,
            dryRun: true,
            formatProfile: selectedProfile || undefined,
          },
          action: 'compile',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Compilation failed');
      }

      const result: CompilerResult = await response.json();
      setCompilerResult(result);
      setColumnMappings(result.columnMappings);

      if (result.success) {
        setSuccess(`✅ ${result.validRows} von ${result.rowCount} Zeilen erfolgreich verarbeitet!`);
      } else {
        setError(`⚠️ ${result.invalidRows} Fehler gefunden. Bitte überprüfen.`);
      }
    } catch (err: any) {
      console.error('Compilation error:', err);
      setError(err.message || 'Fehler beim Verarbeiten der Datei');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!compilerResult || !file || !user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const fileContent = await readFileContent(file);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/compile-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileContent,
          fileName: file.name,
          options: {
            autoDetect: true,
            validateData: true,
            dryRun: false,
            formatProfile: selectedProfile || undefined,
          },
          action: 'import',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      const { importResult } = result;

      setSuccess(
        `✅ Import erfolgreich! ${importResult.importedCount} neue, ${importResult.updatedCount} aktualisiert, ${importResult.skippedCount} übersprungen.`
      );
      
      // Reset form
      setFile(null);
      setCompilerResult(null);
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Fehler beim Importieren');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!compilerResult || !file || !user) return;

    setLoading(true);
    setError('');

    try {
      const fileContent = await readFileContent(file);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/admin/compile-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileContent,
          fileName: file.name,
          options: {
            autoDetect: true,
            validateData: true,
            dryRun: false,
            formatProfile: selectedProfile || undefined,
          },
          action: 'download',
        }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const result = await response.json();
      downloadCSV(result.downloadContent, 'compiled-products.csv');
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.message || 'Fehler beim Download');
    } finally {
      setLoading(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <RouteGuard requireAdmin>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              📤 CSV/Excel Compiler
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Importiere Produktdaten aus verschiedenen Herstellerformaten
            </p>
          </div>

          {/* Step 1: File Upload */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Step 1: Datei hochladen
            </h2>

            <div
              className="border-2 border-dashed border-primary-400 rounded-lg p-12 text-center hover:border-primary-600 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <div className="text-6xl mb-4">📁</div>
              {file ? (
                <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              ) : (
                <>
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Drag & Drop oder klicken zum Auswählen
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Unterstützte Formate: .csv, .xlsx, .xls
                  </p>
                </>
              )}
            </div>

            {/* Format Profile Selection */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Format-Profil (optional)
              </label>
              <select
                value={selectedProfile}
                onChange={(e) => setSelectedProfile(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Automatisch erkennen</option>
                {Object.keys(FORMAT_PROFILES).map((profile) => (
                  <option key={profile} value={profile}>
                    {FORMAT_PROFILES[profile].name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCompile}
              disabled={!file || loading}
              className="mt-4 w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verarbeite...' : 'Datei analysieren'}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <p className="text-green-800 dark:text-green-200">{success}</p>
            </div>
          )}

          {/* Results */}
          {compilerResult && (
            <>
              {/* Step 2: Format Detection */}
              {compilerResult.detectedFormat && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Step 2: Format-Erkennung
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Erkanntes Format</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {compilerResult.detectedFormat.profile || 'Unbekannt'}
                        {compilerResult.detectedFormat.confidence > 0 && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({Math.round(compilerResult.detectedFormat.confidence * 100)}%)
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Zeilen</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {compilerResult.detectedFormat.rowCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Spalten</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {compilerResult.detectedFormat.columnCount}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Preview */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Step 3: Vorschau (erste 5 Zeilen)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-slate-700">
                      <tr>
                        {compilerResult.columnMappings
                          .filter(m => m.targetColumn)
                          .map((mapping) => (
                            <th key={mapping.sourceColumn} className="px-4 py-2 text-left">
                              {mapping.targetColumn}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compilerResult.transformedData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                          {compilerResult.columnMappings
                            .filter(m => m.targetColumn)
                            .map((mapping) => (
                              <td key={mapping.sourceColumn} className="px-4 py-2">
                                {row[mapping.targetColumn!]}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {compilerResult.errors.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="font-semibold text-red-800 dark:text-red-200 mb-2">
                      ⚠️ {compilerResult.errors.length} Fehler gefunden:
                    </p>
                    <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                      {compilerResult.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>
                          Zeile {error.row}: {error.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                <div className="flex gap-4">
                  <button
                    onClick={handleDownload}
                    disabled={loading}
                    className="flex-1 px-6 py-3 border-2 border-primary-600 text-primary-600 font-semibold rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50"
                  >
                    ⬇️ CSV herunterladen
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading || !compilerResult.success}
                    className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✅ In Datenbank importieren
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
