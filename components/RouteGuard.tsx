import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/AuthContext'

interface RouteGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function RouteGuard({ children, requireAdmin = false }: RouteGuardProps) {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Not logged in
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`)
        return
      }

      // Logged in but not admin when admin is required
      if (requireAdmin && !isAdmin) {
        router.push('/projects')
        return
      }
    }
  }, [user, loading, isAdmin, requireAdmin, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lädt...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return null
  }

  // Authenticated but not admin when admin is required
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Zugriff verweigert
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
