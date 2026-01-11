import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import RouteGuard from '../../components/RouteGuard'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../lib/database.types'

type Project = Database['public']['Tables']['projects']['Row']

export default function ProjectDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // NO AUTO-LOAD - only explicit button
  const loadProject = async () => {
    if (!id || !user) return

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id as string)
        .eq('owner_id', user.id)
        .single()

      if (error) throw error
      if (!data) throw new Error('Projekt nicht gefunden')

      setProject(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/projects"
            className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zur Übersicht
          </Link>
        </div>

        {!project && !loading && !error && (
          <div className="bg-ci-light dark:bg-slate-800 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Projekt Details
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Laden Sie die Projektdaten, um fortzufahren
            </p>
            <button
              onClick={loadProject}
              className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
            >
              Projekt laden
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Lädt Projekt...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200 mb-4">{error}</p>
            <button
              onClick={loadProject}
              className="px-4 py-2 bg-red-800 text-white font-semibold rounded-lg hover:bg-red-900 transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {project && (
          <div className="bg-ci-light dark:bg-slate-800 rounded-lg p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {project.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Projekt-ID: {project.id}
                </p>
              </div>
              <span className={`px-4 py-2 text-sm font-semibold rounded-full ${
                project.tier === 'eco' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' :
                project.tier === 'premium' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' :
                'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              }`}>
                {getTierLabel(project.tier)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Hersteller
                </h3>
                <p className="text-lg text-gray-900 dark:text-white">
                  {project.manufacturer}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Video Management
                </h3>
                <p className="text-lg text-gray-900 dark:text-white">
                  {project.video_management.toUpperCase()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Speicherdauer
                </h3>
                <p className="text-lg text-gray-900 dark:text-white">
                  {project.storage_days} Tage
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  HDD Konfiguration
                </h3>
                <p className="text-lg text-gray-900 dark:text-white">
                  {project.storage_hdd_quantity}x {project.storage_hdd_size}TB
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Erstellt
                </h3>
                <p className="text-lg text-gray-900 dark:text-white">
                  {new Date(project.created_at).toLocaleString('de-DE')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Zuletzt bearbeitet
                </h3>
                <p className="text-lg text-gray-900 dark:text-white">
                  {new Date(project.updated_at).toLocaleString('de-DE')}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Link
                href={`/configurator?projectId=${project.id}`}
                className="flex-1 text-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
              >
                Im Konfigurator öffnen
              </Link>
              <Link
                href="/projects"
                className="px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
              >
                Zurück
              </Link>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  )
}
