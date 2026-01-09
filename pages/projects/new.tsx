import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import RouteGuard from '../../components/RouteGuard'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import type { TierType, ManufacturerType, VideoManagementType } from '../../types'

export default function NewProject() {
  const [name, setName] = useState('')
  const [tier, setTier] = useState<TierType>('eco')
  const [manufacturer, setManufacturer] = useState<ManufacturerType>('Hanwha')
  const [videoManagement, setVideoManagement] = useState<VideoManagementType>('nvr')
  const [storageDays, setStorageDays] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!name.trim()) {
      setError('Bitte geben Sie einen Projektnamen ein')
      setLoading(false)
      return
    }

    try {
      const projectData: any = {
        owner_id: user!.id,
        name: name.trim(),
        tier,
        manufacturer,
        video_management: videoManagement,
        storage_days: storageDays,
        ups_required: tier === 'high-risk',
        remote_capable: false,
        // Set series defaults based on tier
        hanwha_series: manufacturer === 'Hanwha' && tier === 'eco' ? 'A-Series' : null,
        ajax_series: manufacturer === 'AJAX' && tier === 'eco' ? 'Baseline' : null,
      }

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (insertError) throw insertError
      if (!data) throw new Error('Keine Daten zurückgegeben')

      // Redirect to project edit page
      router.push(`/projects/${(data as any).id}`)
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen des Projekts')
      setLoading(false)
    }
  }

  const tiers: { value: TierType; label: string; description: string }[] = [
    { value: 'eco', label: 'Eco / LowBudget', description: 'Basis-Lösung für einfache Anforderungen' },
    { value: 'premium', label: 'Premium', description: 'Hochwertige Lösung mit erweiterten Funktionen' },
    { value: 'high-risk', label: 'High Risk', description: 'Maximale Sicherheit mit Redundanzen' }
  ]

  const manufacturers: { value: ManufacturerType; label: string }[] = [
    { value: 'AXIS', label: 'AXIS' },
    { value: 'Hanwha', label: 'Hanwha' },
    { value: 'AJAX', label: 'AJAX' },
    { value: 'Keenfinity', label: 'Keenfinity' }
  ]

  // Filter manufacturers based on tier
  const availableManufacturers = tier === 'eco'
    ? manufacturers.filter(m => m.value === 'Hanwha' || m.value === 'AJAX')
    : manufacturers

  return (
    <RouteGuard>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Neues Projekt erstellen
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Geben Sie die Basis-Informationen für Ihr neues Projekt ein
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Projektname *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
              placeholder="z.B. Filiale Berlin-Mitte"
            />
          </div>

          {/* Tier Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Paket-Auswahl *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setTier(t.value)
                    // Reset manufacturer if not available for eco
                    if (t.value === 'eco' && manufacturer !== 'Hanwha' && manufacturer !== 'AJAX') {
                      setManufacturer('Hanwha')
                    }
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    tier === t.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-500'
                  }`}
                >
                  <div className="font-bold text-gray-900 dark:text-white mb-1">
                    {t.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manufacturer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Hersteller *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableManufacturers.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setManufacturer(m.value)}
                  className={`p-4 rounded-lg border-2 text-center font-bold transition-all ${
                    manufacturer === m.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white hover:border-primary-300 dark:hover:border-primary-500'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {tier === 'eco' && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                Im Eco-Paket sind nur Hanwha und AJAX verfügbar
              </p>
            )}
          </div>

          {/* Video Management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Video-Management *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setVideoManagement('nvr')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  videoManagement === 'nvr'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-500'
                }`}
              >
                <div className="font-bold text-gray-900 dark:text-white mb-1">
                  NVR-basiert
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Network Video Recorder
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVideoManagement('vms')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  videoManagement === 'vms'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-500'
                }`}
              >
                <div className="font-bold text-gray-900 dark:text-white mb-1">
                  VMS-basiert
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Video Management System
                </div>
              </button>
            </div>
          </div>

          {/* Storage Days */}
          <div>
            <label htmlFor="storageDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Speicherdauer (Tage) *
            </label>
            <input
              id="storageDays"
              type="number"
              min="1"
              max="90"
              required
              value={storageDays}
              onChange={(e) => setStorageDays(parseInt(e.target.value) || 3)}
              className="w-32 px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
            />
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              DSGVO-Empfehlung: maximal 3 Tage (72 Stunden)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-slate-600">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Wird erstellt...' : 'Projekt erstellen'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </RouteGuard>
  )
}
