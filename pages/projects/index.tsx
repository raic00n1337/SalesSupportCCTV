import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import RouteGuard from '../../components/RouteGuard'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'

type Project = Database['public']['Tables']['projects']['Row']

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false) // Changed to false by default
  const [error, setError] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)
  const { user, signOut } = useAuth()
  const router = useRouter()

  // NO AUTO-LOAD on mount - only explicit button click
  // This prevents the timeout/loading loop issues

  const loadProjects = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      setProjects(data || [])
      setHasLoaded(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Möchten Sie dieses Projekt wirklich löschen?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error

      // Remove from state
      setProjects(projects.filter(p => p.id !== projectId))
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message)
    }
  }

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      'eco': 'Eco / LowBudget',
      'premium': 'Premium',
      'high-risk': 'High Risk'
    }
    return labels[tier] || tier
  }

  return (
    <RouteGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Meine Projekte
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Verwalten Sie Ihre Video-System-Konfigurationen
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/projects/new"
              className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              + Neues Projekt
            </Link>
            <button
              onClick={signOut}
              className="px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex justify-between items-center">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={loadProjects}
              className="px-4 py-2 bg-red-800 text-white font-semibold rounded-lg hover:bg-red-900 transition-colors text-sm"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Initial State - Show Load Button */}
        {!loading && !hasLoaded && !error && (
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-primary-300 dark:border-primary-700">
            <svg className="mx-auto h-16 w-16 text-primary-600 dark:text-primary-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Projekte laden
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Klicken Sie auf den Button, um Ihre gespeicherten Projekte anzuzeigen
            </p>
            <button
              onClick={loadProjects}
              className="inline-flex items-center px-8 py-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors text-lg"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Projekte laden
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Lädt Projekte...</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
              Bitte warten Sie einen Moment
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && hasLoaded && projects.length === 0 && (
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Keine Projekte</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Erstellen Sie Ihr erstes Projekt.</p>
            <div className="mt-6">
              <Link
                href="/projects/new"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                + Neues Projekt erstellen
              </Link>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && hasLoaded && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-ci-light dark:bg-slate-800 rounded-lg border-2 border-gray-200 dark:border-slate-700 p-6 hover:border-primary-500 dark:hover:border-primary-400 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {project.name}
                  </h3>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    project.tier === 'eco' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                    project.tier === 'premium' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' :
                    'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                  }`}>
                    {getTierLabel(project.tier)}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Hersteller:</strong> {project.manufacturer}</p>
                  <p><strong>System:</strong> {project.video_management.toUpperCase()}</p>
                  <p><strong>Speicher:</strong> {project.storage_days} Tage</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Erstellt: {new Date(project.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex-1 text-center px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Bearbeiten
                  </Link>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                    title="Löschen"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RouteGuard>
  )
}
