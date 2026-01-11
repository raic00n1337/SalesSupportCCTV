// UTF-8 Encoding Fix - Build v3
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import type { Project, Site, TierType, ManufacturerType, VideoManagementType, HanwhaSeriesType, AjaxSeriesType, CablingType, BOMItem, MountType } from '../types'
import { validateIPv4, isValidHostIP, assignIPsToDevices, generateAllNetworkDevices, type NetworkDevice } from '../ipHelper'
import * as XLSX from 'xlsx'
import { generateMountingAccessories } from '../mountAccessories'
import { generatePDF } from '../pdfExport'

export default function Configurator() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [project, setProject] = useState<Partial<Project>>({
    name: '',
    tier: undefined,
    manufacturer: undefined,
    videoManagement: 'nvr',
    sites: [],
    storageDays: 2,
    storageHddSize: 4,
    storageHddQuantity: 1,
    upsRequired: false,
    remoteCapable: false
  })

  const totalSteps = 6

  // Restore project from localStorage on mount (for guest mode)
  useEffect(() => {
    const savedProject = localStorage.getItem('configurator_project')
    if (savedProject && !router.query.projectId) {
      try {
        const parsed = JSON.parse(savedProject)
        setProject(parsed)
        console.log('✅ Project restored from localStorage')
      } catch (err) {
        console.error('Error parsing localStorage project:', err)
        localStorage.removeItem('configurator_project')
      }
    }
  }, []) // Only run once on mount

  // Save project to localStorage on changes (for guest mode)
  useEffect(() => {
    // Only save to localStorage if not logged in or no projectId
    if (!user || !projectId) {
      localStorage.setItem('configurator_project', JSON.stringify(project))
    }
  }, [project, user, projectId])

  // Load project from URL parameter (if provided)
  useEffect(() => {
    const loadProjectFromURL = async () => {
      const { projectId: urlProjectId } = router.query
      
      if (!urlProjectId || typeof urlProjectId !== 'string') return
      if (projectId === urlProjectId) return // Already loaded
      if (!user) return // Need to be logged in

      console.log(`Loading project from URL: ${urlProjectId}`)

      try {
        // Load project data
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', urlProjectId)
          .eq('owner_id', user.id)
          .single()

        if (projectError) throw projectError
        if (!projectData) throw new Error('Projekt nicht gefunden')

        // Load sites data
        const { data: sitesData, error: sitesError } = await supabase
          .from('sites')
          .select('*')
          .eq('project_id', urlProjectId)

        if (sitesError && sitesError.code !== 'PGRST116') throw sitesError

        // Map database format to app format
        const dbProject = projectData as any
        const loadedProject: Partial<Project> = {
          id: dbProject.id,
          name: dbProject.name,
          tier: dbProject.tier as TierType,
          manufacturer: dbProject.manufacturer as ManufacturerType,
          hanwhaSeries: dbProject.hanwha_series as HanwhaSeriesType,
          ajaxSeries: dbProject.ajax_series as AjaxSeriesType,
          videoManagement: dbProject.video_management as VideoManagementType,
          storageDays: dbProject.storage_days,
          storageHddSize: dbProject.storage_hdd_size || undefined,
          storageHddQuantity: dbProject.storage_hdd_quantity || undefined,
          upsRequired: dbProject.ups_required,
          remoteCapable: dbProject.remote_capable,
          vmsMultiMonitor: dbProject.vms_multi_monitor || undefined,
          networkCabinet9HE: dbProject.network_cabinet_9he || undefined,
          liftPlatform: dbProject.lift_platform || undefined,
          sites: (sitesData || []).map((site: any) => ({
            id: site.id,
            name: site.name,
            cabling: site.cabling as CablingType,
            isStandalone: site.is_standalone,
            outdoor: site.outdoor,
            cameras: site.cameras_config || {
              domeFixed: { quantity: 0, mount: 'wall' as const, customNames: [] },
              domeVario: { quantity: 0, mount: 'wall' as const, customNames: [] },
              bulletFixed: { quantity: 0, mount: 'wall' as const, customNames: [] },
              bulletVario: { quantity: 0, mount: 'wall' as const, customNames: [] },
              ptz: { quantity: 0, mount: 'wall' as const, customNames: [] },
              thermal: { quantity: 0, mount: 'wall' as const, customNames: [] },
              ipSpeakers: { quantity: 0, customNames: [] }
            },
            ipDocEnabled: site.ip_doc_enabled,
            ipStart: site.ip_start,
            ipGateway: site.ip_gateway,
            ipCidr: site.ip_cidr,
            ipVideoDevicePrefix: site.ip_video_device_prefix,
            ipNetworkDevicePrefix: site.ip_network_device_prefix,
          }))
        }

        setProject(loadedProject)
        setProjectId(urlProjectId)
        console.log(`✅ Project loaded: ${loadedProject.name}`)
      } catch (err: any) {
        console.error('Error loading project:', err)
        setSaveError(`Fehler beim Laden: ${err.message}`)
        setSaveStatus('error')
        setTimeout(() => {
          setSaveStatus('idle')
          setSaveError(null)
        }, 5000)
      }
    }

    if (router.isReady) {
      loadProjectFromURL()
    }
  }, [router.isReady, router.query.projectId, user, projectId])

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateProject = (updates: Partial<Project>) => {
    setProject({ ...project, ...updates })
  }

  const handleSave = async () => {
    if (!user) {
      setSaveError('Sie müssen angemeldet sein, um zu speichern.')
      setSaveStatus('error')
      return
    }

    if (!project.name || project.name.trim() === '') {
      setSaveError('Bitte geben Sie einen Projektnamen ein.')
      setSaveStatus('error')
      return
    }

    setSaveStatus('saving')
    setSaveError(null)

    try {
      // Check if we're updating an existing project or creating a new one
      if (projectId) {
        // Update existing project
        const { error: projectError } = await (supabase
          .from('projects') as any)
          .update({
            name: project.name,
            tier: project.tier,
            manufacturer: project.manufacturer,
            hanwha_series: project.hanwhaSeries,
            ajax_series: project.ajaxSeries,
            video_management: project.videoManagement,
            storage_days: project.storageDays,
            storage_hdd_size: project.storageHddSize,
            storage_hdd_quantity: project.storageHddQuantity,
            ups_required: project.upsRequired,
            remote_capable: project.remoteCapable,
            vms_multi_monitor: project.vmsMultiMonitor,
            network_cabinet_9he: project.networkCabinet9HE,
            lift_platform: project.liftPlatform,
          } as any)
          .eq('id', projectId)
          .eq('owner_id', user.id)

        if (projectError) throw projectError

        // Update sites
        if (project.sites && project.sites.length > 0) {
          for (const site of project.sites) {
            const { error: siteError } = await (supabase
              .from('sites') as any)
              .upsert({
                id: site.id,
                project_id: projectId,
                name: site.name,
                cabling: site.cabling,
                is_standalone: site.isStandalone,
                outdoor: site.outdoor,
                cameras_config: site.cameras,
                ip_doc_enabled: site.ipDocEnabled,
                ip_start: site.ipStart,
                ip_gateway: site.ipGateway,
                ip_cidr: site.ipCidr,
                ip_video_device_prefix: site.ipVideoDevicePrefix,
                ip_network_device_prefix: site.ipNetworkDevicePrefix,
              }, { onConflict: 'id' })

            if (siteError) throw siteError
          }
        }

        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        // Create new project
        const { data: newProject, error: projectError } = await (supabase
          .from('projects') as any)
          .insert({
            owner_id: user.id,
            name: project.name,
            tier: project.tier || 'eco',
            manufacturer: project.manufacturer || 'Hanwha',
            hanwha_series: project.hanwhaSeries,
            ajax_series: project.ajaxSeries,
            video_management: project.videoManagement || 'nvr',
            storage_days: project.storageDays || 2,
            storage_hdd_size: project.storageHddSize,
            storage_hdd_quantity: project.storageHddQuantity,
            ups_required: project.upsRequired || false,
            remote_capable: project.remoteCapable || false,
            vms_multi_monitor: project.vmsMultiMonitor,
            network_cabinet_9he: project.networkCabinet9HE,
            lift_platform: project.liftPlatform,
          } as any)
          .select()
          .single()

        if (projectError) throw projectError
        if (!newProject) throw new Error('Projekt konnte nicht erstellt werden')

        setProjectId(newProject.id)

        // Insert sites
        if (project.sites && project.sites.length > 0) {
          for (const site of project.sites) {
            const { error: siteError } = await (supabase
              .from('sites') as any)
              .insert({
                project_id: newProject.id,
                name: site.name,
                cabling: site.cabling,
                is_standalone: site.isStandalone,
                outdoor: site.outdoor,
                cameras_config: site.cameras,
                ip_doc_enabled: site.ipDocEnabled,
                ip_start: site.ipStart,
                ip_gateway: site.ipGateway,
                ip_cidr: site.ipCidr,
                ip_video_device_prefix: site.ipVideoDevicePrefix,
                ip_network_device_prefix: site.ipNetworkDevicePrefix,
              } as any)

            if (siteError) throw siteError
          }
        }

        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)

        // Update URL with project ID (shallow routing, no page reload)
        router.replace(`/configurator?projectId=${newProject.id}`, undefined, { shallow: true })
      }
    } catch (err: any) {
      console.error('Save error:', err)
      setSaveError(err.message || 'Fehler beim Speichern')
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 5000)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ProjectSetup project={project} updateProject={updateProject} />
      case 2:
        return <Step2Sites project={project} updateProject={updateProject} />
      case 3:
        return <Step3TierAndManufacturer project={project} updateProject={updateProject} />
      case 4:
        return <Step4CameraConfiguration project={project} updateProject={updateProject} />
      case 5:
        return <Step5NetworkAndCabling project={project} updateProject={updateProject} />
      case 6:
        return <Step6Summary project={project} />
      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return project.name && project.name.trim().length > 0
      case 2:
        return project.sites && project.sites.length > 0
      case 3:
        // Check if tier and manufacturer are selected
        if (!project.tier || !project.manufacturer) return false
        // If Hanwha is selected, series must be selected
        if (project.manufacturer === 'Hanwha' && !project.hanwhaSeries) return false
        // If AJAX is selected, series must be selected
        if (project.manufacturer === 'AJAX' && !project.ajaxSeries) return false
        return true
      case 4:
        return true
      case 5:
        return true
      default:
        return true
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header with optional Save */}
      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/"
          className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Zur Startseite
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <Link
              href="/projects"
              className="text-gray-600 dark:text-gray-400 hover:text-primary-600 font-medium"
            >
              Meine Projekte
            </Link>
            {saveStatus === 'saved' && (
              <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                ✓ Gespeichert
              </span>
            )}
            {saveStatus === 'error' && saveError && (
              <span className="text-red-600 dark:text-red-400 text-sm font-medium" title={saveError}>
                ❌ {saveError.substring(0, 30)}...
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saveStatus === 'saving' ? 'Speichert...' : '💾 Speichern'}
            </button>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex gap-2">
          {[
            { num: 1, label: 'Projekt' },
            { num: 2, label: 'Standorte' },
            { num: 3, label: 'Paket' },
            { num: 4, label: 'Kameras' },
            { num: 5, label: 'Netzwerk' },
            { num: 6, label: 'Ergebnis' }
          ].map((step, index) => (
            <div key={step.num} className="flex-1">
              <button
                onClick={() => setCurrentStep(step.num)}
                className={`relative rounded-lg p-4 transition-all w-full cursor-pointer ${
                  step.num === currentStep
                    ? 'bg-primary-500 text-white shadow-lg scale-105'
                    : step.num < currentStep
                    ? 'bg-ci-accent text-white shadow-md hover:bg-primary-400'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
                aria-label={`Zu Schritt ${step.num}: ${step.label} wechseln`}
                tabIndex={0}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    step.num === currentStep
                      ? 'bg-ci-light dark:bg-slate-200 text-primary-600'
                      : step.num < currentStep
                      ? 'bg-ci-light dark:bg-slate-200 text-ci-accent'
                      : 'bg-ci-light dark:bg-slate-600 text-gray-600 dark:text-gray-300'
                  }`}>
                    {step.num < currentStep ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className="text-sm font-semibold text-center leading-tight">
                    {step.label}
                  </span>
                </div>
                {/* Connection Arrow */}
                {index < 5 && (
                  <div className={`absolute top-1/2 -right-2 transform -translate-y-1/2 z-10 pointer-events-none ${
                    step.num < currentStep ? 'text-ci-accent' : 'text-gray-300 dark:text-slate-600'
                  }`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-ci-light dark:bg-slate-800 rounded-lg shadow-lg p-8 min-h-[500px]">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600"
        >
          Zurück
        </button>
        {currentStep < totalSteps && (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary-500 text-white hover:bg-primary-500"
          >
            Weiter
          </button>
        )}
      </div>
    </div>
  )
}

// Step 1: Project Setup
const Step1ProjectSetup = ({ project, updateProject }: { project: Partial<Project>; updateProject: (updates: Partial<Project>) => void }) => {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Projekt anlegen
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Geben Sie einen Namen für Ihr Video-System-Projekt ein und wählen Sie die Grundoptionen.
      </p>

      <div className="max-w-xl">
        <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Projektname *
        </label>
        <input
          id="projectName"
          type="text"
          value={project.name || ''}
          onChange={(e) => updateProject({ name: e.target.value })}
          placeholder="z.B. Firmengelände München Nord"
          className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none transition-all"
        />
      </div>

      {/* Remote Capability */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Remote-Zugriff
        </h3>
        <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
          <input
            type="checkbox"
            checked={project.remoteCapable || false}
            onChange={(e) => updateProject({ remoteCapable: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              Remote-Fähigkeit für gesamtes Projekt
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Fernzugriff auf alle Standorte (VPN-Router wird automatisch hinzugefügt)
            </div>
          </div>
        </label>
      </div>

      <div className="mt-8 p-4 bg-primary-50 dark:bg-slate-700/50 rounded-lg">
        <h3 className="font-semibold text-primary-900 dark:text-primary-300 mb-2">
          ℹ️ Hinweis
        </h3>
        <p className="text-primary-800 dark:text-primary-200 text-sm">
          Im nächsten Schritt können Sie einen oder mehrere Standorte für dieses Projekt definieren.
        </p>
      </div>
    </div>
  )
}

// Step 2: Sites
const Step2Sites = ({ project, updateProject }: { project: Partial<Project>; updateProject: (updates: Partial<Project>) => void }) => {
  const [newSiteName, setNewSiteName] = useState('')

  const handleAddSite = () => {
    if (newSiteName.trim()) {
      const newSite: Site = {
        id: Date.now().toString(),
        name: newSiteName,
        cameras: {
          domeFixed: { quantity: 0, mount: 'ceiling' as MountType },
          domeVario: { quantity: 0, mount: 'ceiling' as MountType },
          bulletFixed: { quantity: 0, mount: 'wall' as MountType },
          bulletVario: { quantity: 0, mount: 'wall' as MountType },
          ptz: { quantity: 0, mount: 'wall' as MountType },
          thermal: { quantity: 0, mount: 'pole' as MountType },
          ipSpeakers: { quantity: 0 }
        },
        cabling: 'copper',
        isStandalone: false,
        outdoor: false,
        ipDocEnabled: false,
        ipStart: '',
        ipGateway: '',
        ipCidr: '24',
        ipVideoDevicePrefix: '',
        ipNetworkDevicePrefix: ''
      }
      updateProject({ sites: [...(project.sites || []), newSite] })
      setNewSiteName('')
    }
  }

  const handleRemoveSite = (id: string) => {
    updateProject({
      sites: (project.sites || []).filter((site) => site.id !== id)
    })
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Standorte definieren
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Fügen Sie die Standorte hinzu, an denen Kameras installiert werden sollen.
      </p>

      <div className="max-w-xl mb-6">
        <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Standortname
        </label>
        <div className="flex gap-2">
          <input
            id="siteName"
            type="text"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSite()}
            placeholder="z.B. Haupteingang, Parkplatz, Lager"
            className="flex-1 px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
          />
          <button
            onClick={handleAddSite}
            className="px-6 py-3 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-500 transition-colors"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      {project.sites && project.sites.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Standorte ({project.sites.length})
          </h3>
          {project.sites.map((site) => (
            <div
              key={site.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg"
            >
              <span className="text-gray-900 dark:text-white font-medium">{site.name}</span>
              <button
                onClick={() => handleRemoveSite(site.id)}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                aria-label={`Remove ${site.name}`}
              >
                Entfernen
              </button>
            </div>
          ))}
        </div>
      )}

      {(!project.sites || project.sites.length === 0) && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Noch keine Standorte hinzugefügt
        </div>
      )}
    </div>
  )
}

// Step 3: Tier and Manufacturer
const Step3TierAndManufacturer = ({ project, updateProject }: { project: Partial<Project>; updateProject: (updates: Partial<Project>) => void }) => {
  const tiers: { value: TierType; label: string; description: string }[] = [
    { value: 'eco', label: 'Eco / Low Budget', description: 'Kostengünstige Standardlösung für einfache Anwendungen' },
    { value: 'premium', label: 'Premium', description: 'Hochwertige Lösung mit erweiterten Funktionen' },
    { value: 'high-risk', label: 'High Risk', description: 'Maximale Sicherheit mit Redundanzen und USV' }
  ]

  const allManufacturers: { value: ManufacturerType; label: string }[] = [
    { value: 'AXIS', label: 'AXIS' },
    { value: 'Hanwha', label: 'Hanwha' },
    { value: 'AJAX', label: 'AJAX' },
    { value: 'Keenfinity', label: 'Keenfinity' }
  ]

  // Filter manufacturers: For ECO tier, only show Hanwha and AJAX
  const manufacturers = project.tier === 'eco'
    ? allManufacturers.filter(m => m.value === 'Hanwha' || m.value === 'AJAX')
    : allManufacturers

  const videoManagementOptions: { value: VideoManagementType; label: string; description: string }[] = [
    { value: 'nvr', label: 'NVR-basiert', description: 'Network Video Recorder' },
    { value: 'vms', label: 'VMS-basiert', description: 'Video Management System (mit Lizenzen)' }
  ]

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Paket & Hersteller wählen
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Wählen Sie das Qualitätsniveau und den Hersteller für Ihr Projekt.
      </p>

      {/* Tier Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Paket-Auswahl *
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <button
              key={tier.value}
              onClick={() => {
                const updates: Partial<Project> = {
                  tier: tier.value,
                  upsRequired: tier.value === 'high-risk' ? true : project.upsRequired
                }
                
                // Bei Wechsel zu ECO: Automatisch günstigste Serie setzen
                if (tier.value === 'eco') {
                  if (project.manufacturer === 'Hanwha') {
                    updates.hanwhaSeries = 'A-Series'
                  } else if (project.manufacturer === 'AJAX') {
                    updates.ajaxSeries = 'Baseline'
                  }
                }
                
                updateProject(updates)
              }}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                project.tier === tier.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-primary-500 dark:border-primary-400 hover:border-primary-600 dark:hover:border-primary-300'
              }`}
            >
              <div className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                {tier.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {tier.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Manufacturer Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Hersteller *
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {manufacturers.map((manufacturer) => (
            <button
              key={manufacturer.value}
              onClick={() => {
                const updates: Partial<Project> = { manufacturer: manufacturer.value }
                
                // Bei ECO: Automatisch günstigste Serie setzen
                if (project.tier === 'eco') {
                  if (manufacturer.value === 'Hanwha') {
                    updates.hanwhaSeries = 'A-Series'
                  } else if (manufacturer.value === 'AJAX') {
                    updates.ajaxSeries = 'Baseline'
                  }
                }
                
                // Reset series when switching manufacturers
                if (manufacturer.value !== 'Hanwha') {
                  updates.hanwhaSeries = undefined
                }
                if (manufacturer.value !== 'AJAX') {
                  updates.ajaxSeries = undefined
                }
                
                updateProject(updates)
              }}
              className={`p-6 rounded-lg border-2 text-center font-bold text-lg transition-all ${
                project.manufacturer === manufacturer.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white hover:border-primary-300 dark:hover:border-primary-500'
              }`}
            >
              {manufacturer.label}
            </button>
          ))}
        </div>

        {/* Hanwha Series Selection */}
        {project.manufacturer === 'Hanwha' && (
          <div className="mt-6 p-6 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-primary-200 dark:border-primary-800">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              Hanwha Serie {project.tier === 'eco' ? '(automatisch ausgewählt)' : 'wählen *'}
            </h4>
            {project.tier === 'eco' ? (
              // ECO: Nur A-Series, nicht änderbar
              <div className="p-4 rounded-lg border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20">
                <div className="font-semibold text-primary-600 dark:text-primary-400">
                  A-Series
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Standard-Serie (ECO-Paket)
                </div>
              </div>
            ) : (
              // Premium/High-Risk: Beide Serien wählbar
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { value: 'A-Series' as HanwhaSeriesType, label: 'A-Series', description: 'Standard-Serie' },
                  { value: 'Q/X-Series' as HanwhaSeriesType, label: 'Q/X-Series', description: 'Premium-Serie' }
                ].map((series) => (
                  <button
                    key={series.value}
                    onClick={() => updateProject({ hanwhaSeries: series.value })}
                    className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      project.hanwhaSeries === series.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'border-gray-300 dark:border-slate-600 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white hover:border-primary-500 dark:hover:border-primary-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-semibold">
                      {series.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {series.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AJAX Series Selection */}
        {project.manufacturer === 'AJAX' && (
          <div className="mt-6 p-6 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-primary-200 dark:border-primary-800">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              AJAX Serie {project.tier === 'eco' ? '(automatisch ausgewählt)' : 'wählen *'}
            </h4>
            {project.tier === 'eco' ? (
              // ECO: Nur Baseline, nicht änderbar
              <div className="p-4 rounded-lg border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20">
                <div className="font-semibold text-primary-600 dark:text-primary-400">
                  Baseline
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Basis-Ausstattung (ECO-Paket)
                </div>
              </div>
            ) : (
              // Premium/High-Risk: Beide Serien wählbar
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { value: 'Baseline' as AjaxSeriesType, label: 'Baseline', description: 'Basis-Ausstattung' },
                  { value: 'Superior' as AjaxSeriesType, label: 'Superior', description: 'Premium-Ausstattung' }
                ].map((series) => (
                  <button
                    key={series.value}
                    onClick={() => updateProject({ ajaxSeries: series.value })}
                    className={`p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      project.ajaxSeries === series.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'border-gray-300 dark:border-slate-600 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white hover:border-primary-500 dark:hover:border-primary-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-semibold">
                      {series.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {series.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Management */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Video-Management
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videoManagementOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateProject({ videoManagement: option.value })}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                project.videoManagement === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-primary-500 dark:border-primary-400 hover:border-primary-600 dark:hover:border-primary-300'
              }`}
            >
              <div className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                {option.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {option.description}
              </div>
            </button>
          ))}
        </div>

        {/* NVR Storage Configuration */}
        {project.videoManagement === 'nvr' && (
          <div className="mt-6 p-6 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-primary-200 dark:border-primary-800">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
              Festplatten-Konfiguration (NVR)
            </h4>
            
            <div className="space-y-4">
              {/* HDD Size Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Festplattengröße *
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {(() => {
                    // Filter HDD sizes based on storage days recommendation
                    const allSizes = [2, 4, 6, 8, 10, 12]
                    const storageDays = project.storageDays || 0
                    
                    // Determine recommended range
                    let minSize = 2
                    let maxSize = 12
                    
                    if (storageDays > 0) {
                      if (storageDays <= 3) {
                        minSize = 4
                        maxSize = 8
                      } else if (storageDays <= 7) {
                        minSize = 8
                        maxSize = 12
                      } else {
                        minSize = 12
                        maxSize = 12
                      }
                    }
                    
                    // Filter sizes within recommendation
                    const filteredSizes = storageDays > 0
                      ? allSizes.filter(size => size >= minSize && size <= maxSize)
                      : allSizes // Show all if no storage days set
                    
                    return filteredSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => updateProject({ storageHddSize: size })}
                        className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                          project.storageHddSize === size
                            ? 'border-primary-500 bg-ci-light dark:bg-slate-600 text-primary-600 dark:text-primary-400'
                            : 'border-gray-300 dark:border-slate-600 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white hover:border-primary-400'
                        }`}
                      >
                        {size} TB
                      </button>
                    ))
                  })()}
                </div>
              </div>

              {/* HDD Quantity */}
              <div>
                <label htmlFor="hddQuantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anzahl der Festplatten *
                </label>
                <div className="flex items-center gap-4">
                  <input
                    id="hddQuantity"
                    type="number"
                    min="1"
                    max="16"
                    value={project.storageHddQuantity || 1}
                    onChange={(e) => updateProject({ storageHddQuantity: parseInt(e.target.value) || 1 })}
                    className="w-32 px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
                  />
                  <span className="text-gray-600 dark:text-gray-400">Stück</span>
                  {project.storageHddSize && project.storageHddQuantity && (
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                      = {project.storageHddSize * project.storageHddQuantity} TB Gesamt
                    </span>
                  )}
                </div>
              </div>

              {/* Storage Recommendation */}
              {project.storageDays && project.storageDays > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>💡 Speicher-Empfehlung:</strong> Bei {project.storageDays} Tagen Speicherdauer wird empfohlen:
                    {project.storageDays <= 3 ? ' 4–8 TB' : project.storageDays <= 7 ? ' 8–12 TB' : ' 12+ TB'}
                    {project.storageDays > 14 && (
                      <span className="block mt-1">
                        <strong>⚠️ Warnung:</strong> Lange Speicherdauern können DSGVO-relevant sein und erfordern große Speicherkapazität.
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <p className="text-xs text-primary-800 dark:text-primary-200">
                  <strong>💡 Hinweis:</strong> Surveillance-Grade Festplatten sind für den 24/7-Dauerbetrieb optimiert. 
                  Die tatsächlich benötigte Speichergröße hängt von der Anzahl der Kameras ab.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UPS Option */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Unterbrechungsfreie Stromversorgung (USV)
        </h3>
        <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
          <input
            type="checkbox"
            checked={project.upsRequired || false}
            onChange={(e) => updateProject({ upsRequired: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              USV gewünscht
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Notstromversorgung für unterbrechungsfreien Betrieb
              {project.tier === 'high-risk' && (
                <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                  (Bei High Risk empfohlen)
                </span>
              )}
            </div>
          </div>
        </label>
      </div>

      {/* Storage Duration */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Speicherdauer (DSGVO-konform)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Nach DSGVO sind maximal 3 Tage (72 Stunden) zulässig
        </p>
        
        <div className="space-y-4">
          {/* Preset Buttons */}
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Vorauswahl:</p>
            <div className="flex gap-2">
              {[
                { days: 1, label: '1 Tag' },
                { days: 2, label: '2 Tage' },
                { days: 3, label: '3 Tage' }
              ].map((option) => (
                <button
                  key={option.days}
                  onClick={() => updateProject({ storageDays: option.days })}
                  className={`px-6 py-3 rounded-lg border-2 font-semibold transition-all ${
                    project.storageDays === option.days
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white hover:border-primary-300 dark:hover:border-primary-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Oder eigene Angabe in Tagen:</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="90"
                value={project.storageDays || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0
                  updateProject({ storageDays: value })
                }}
                placeholder="z.B. 7"
                className="w-32 px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
              />
              <span className="text-gray-600 dark:text-gray-400">Tage</span>
              {project.storageDays && project.storageDays > 3 && (
                <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Über DSGVO-Standard (3 Tage)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>⚠️ DSGVO-Hinweis:</strong> Die Speicherdauer von Videoaufzeichnungen ist auf maximal 3 Tage (72 Stunden) begrenzt, 
            es sei denn, es liegt ein berechtigtes Interesse vor oder eine längere Speicherung ist gesetzlich vorgeschrieben.
          </p>
        </div>
      </div>

      {/* Additional Options */}
      <div className="mt-8 border-t border-gray-200 dark:border-slate-600 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Zusatzoptionen
        </h3>
        <div className="space-y-4">
          {/* Multibild Option (only for VMS) */}
          {project.videoManagement === 'vms' && (
            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={project.vmsMultiMonitor || false}
                onChange={(e) => updateProject({ vmsMultiMonitor: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  Multibild-Darstellung (RTX-Grafikkarte)
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Hochleistungs-Workstation mit RTX-Grafikkarte für mehrere Monitore
                </div>
              </div>
            </label>
          )}

          {/* 9 HE Network Cabinet */}
          <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
            <input
              type="checkbox"
              checked={project.networkCabinet9HE || false}
              onChange={(e) => updateProject({ networkCabinet9HE: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                9 HE Netzwerkschrank
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Inklusive Steckdosenleiste, Lüfter und Zubehör (Pauschalposition)
              </div>
            </div>
          </label>

          {/* Lift Platform */}
          <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
            <input
              type="checkbox"
              checked={project.liftPlatform || false}
              onChange={(e) => updateProject({ liftPlatform: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Hubsteiger (max. 12 m)
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Inklusive Anlieferung (Pauschalposition)
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

// Step 4: Camera Configuration
const Step4CameraConfiguration = ({ project, updateProject }: { project: Partial<Project>; updateProject: (updates: Partial<Project>) => void }) => {
  const [selectedSiteIndex, setSelectedSiteIndex] = useState(0)

  if (!project.sites || project.sites.length === 0) {
    return (
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Kamera-Konfiguration
        </h2>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Keine Standorte vorhanden. Bitte gehen Sie zurück und fügen Sie Standorte hinzu.
          </p>
        </div>
      </div>
    )
  }

  const selectedSite = project.sites[selectedSiteIndex]
  const isThermalAvailable = project.tier === 'premium' || project.tier === 'high-risk'

  const updateSiteCamera = (
    field: 'domeFixed' | 'domeVario' | 'bulletFixed' | 'bulletVario' | 'ptz' | 'thermal',
    updates: { quantity?: number; mount?: MountType }
  ) => {
    const updatedSites = [...project.sites!]
    const currentCamera = selectedSite.cameras[field]
    
    // If quantity changes, generate default names for new cameras
    if (updates.quantity !== undefined && updates.quantity !== currentCamera.quantity) {
      const newQuantity = updates.quantity
      const existingNames = currentCamera.customNames || []
      const newNames: string[] = []
      
      // Generate default names based on type
      const getCameraTypeName = () => {
        const manufacturer = project.manufacturer || 'Camera'
        switch (field) {
          case 'domeFixed': return `${manufacturer} Dome 8MP Fixed`
          case 'domeVario': return `${manufacturer} Dome 8MP Vario`
          case 'bulletFixed': return `${manufacturer} Bullet 8MP Fixed`
          case 'bulletVario': return `${manufacturer} Bullet 8MP Vario`
          case 'ptz': return `${manufacturer} PTZ`
          case 'thermal': return `${manufacturer} Thermal`
          default: return `${manufacturer} Camera`
        }
      }
      
      for (let i = 0; i < newQuantity; i++) {
        // Keep existing names or generate new ones
        if (i < existingNames.length && existingNames[i]) {
          newNames.push(existingNames[i])
        } else {
          newNames.push(`${getCameraTypeName()} ${i + 1}`)
        }
      }
      
      updatedSites[selectedSiteIndex] = {
        ...selectedSite,
        cameras: {
          ...selectedSite.cameras,
          [field]: {
            ...currentCamera,
            ...updates,
            customNames: newNames
          }
        }
      }
    } else {
      updatedSites[selectedSiteIndex] = {
        ...selectedSite,
        cameras: {
          ...selectedSite.cameras,
          [field]: {
            ...currentCamera,
            ...updates
          }
        }
      }
    }
    
    updateProject({ sites: updatedSites })
  }

  const updateCameraName = (
    field: 'domeFixed' | 'domeVario' | 'bulletFixed' | 'bulletVario' | 'ptz' | 'thermal',
    index: number,
    name: string
  ) => {
    const updatedSites = [...project.sites!]
    const currentCamera = selectedSite.cameras[field]
    const names = currentCamera.customNames || []
    names[index] = name
    
    updatedSites[selectedSiteIndex] = {
      ...selectedSite,
      cameras: {
        ...selectedSite.cameras,
        [field]: {
          ...currentCamera,
          customNames: [...names]
        }
      }
    }
    updateProject({ sites: updatedSites })
  }

  const updateIPSpeakers = (value: number) => {
    const updatedSites = [...project.sites!]
    const currentSpeakers = selectedSite.cameras.ipSpeakers
    
    // Generate default names for new speakers
    if (value !== currentSpeakers.quantity) {
      const existingNames = currentSpeakers.customNames || []
      const newNames: string[] = []
      const manufacturer = project.manufacturer || 'IP'
      
      for (let i = 0; i < value; i++) {
        if (i < existingNames.length && existingNames[i]) {
          newNames.push(existingNames[i])
        } else {
          newNames.push(`${manufacturer} Lautsprecher ${i + 1}`)
        }
      }
      
      updatedSites[selectedSiteIndex] = {
        ...selectedSite,
        cameras: {
          ...selectedSite.cameras,
          ipSpeakers: {
            quantity: value,
            customNames: newNames
          }
        }
      }
    } else {
      updatedSites[selectedSiteIndex] = {
        ...selectedSite,
        cameras: {
          ...selectedSite.cameras,
          ipSpeakers: {
            ...currentSpeakers,
            quantity: value
          }
        }
      }
    }
    
    updateProject({ sites: updatedSites })
  }

  const updateIPSpeakerName = (index: number, name: string) => {
    const updatedSites = [...project.sites!]
    const currentSpeakers = selectedSite.cameras.ipSpeakers
    const names = currentSpeakers.customNames || []
    names[index] = name
    
    updatedSites[selectedSiteIndex] = {
      ...selectedSite,
      cameras: {
        ...selectedSite.cameras,
        ipSpeakers: {
          ...currentSpeakers,
          customNames: [...names]
        }
      }
    }
    updateProject({ sites: updatedSites })
  }

  const updateSiteOption = (field: 'outdoor', value: boolean) => {
    const updatedSites = [...project.sites!]
    updatedSites[selectedSiteIndex] = {
      ...selectedSite,
      [field]: value
    }
    updateProject({ sites: updatedSites })
  }

  const getTotalCameras = () => {
    return (
      selectedSite.cameras.domeFixed.quantity +
      selectedSite.cameras.domeVario.quantity +
      selectedSite.cameras.bulletFixed.quantity +
      selectedSite.cameras.bulletVario.quantity +
      selectedSite.cameras.ptz.quantity +
      selectedSite.cameras.thermal.quantity +
      selectedSite.cameras.ipSpeakers.quantity
    )
  }

  const getMountLabel = (mount: MountType): string => {
    switch (mount) {
      case 'wall':
        return 'Wandmontage'
      case 'ceiling':
        return 'Deckenmontage'
      case 'pole':
        return 'Mastmontage'
      default:
        return mount
    }
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Kamera-Konfiguration
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Konfigurieren Sie die Kameras und Montagevarianten für jeden Standort.
      </p>

      {/* Site Selector */}
      {project.sites.length > 1 && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Standort auswählen:
          </label>
          <div className="flex gap-2 flex-wrap">
            {project.sites.map((site, index) => (
              <button
                key={site.id}
                onClick={() => setSelectedSiteIndex(index)}
                className={`px-6 py-3 rounded-lg border-2 font-semibold transition-all ${
                  selectedSiteIndex === index
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'border-primary-500 dark:border-primary-400 text-gray-900 dark:text-white hover:border-primary-600 dark:hover:border-primary-300'
                }`}
              >
                {site.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Site Header */}
      <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Standort: {selectedSite.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Gesamt: {getTotalCameras()} {getTotalCameras() === 1 ? 'Kamera' : 'Kameras'}
        </p>
      </div>

      {/* Camera Types */}
      <div className="space-y-6 mb-8">
        {/* Dome Cameras */}
        <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Dome-Kameras
          </h4>
          <div className="space-y-4">
            {/* Dome Fixed */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fixed (Festbrennweite) - Anzahl
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={selectedSite.cameras.domeFixed.quantity}
                  onChange={(e) => updateSiteCamera('domeFixed', { quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Montageart
                </label>
                <select
                  value={selectedSite.cameras.domeFixed.mount}
                  onChange={(e) => updateSiteCamera('domeFixed', { mount: e.target.value as MountType })}
                  disabled={selectedSite.cameras.domeFixed.quantity === 0}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="wall">Wandmontage</option>
                  <option value="ceiling">Deckenmontage</option>
                  <option value="pole">Mastmontage</option>
                </select>
              </div>
            </div>

            {/* Camera Names for Dome Fixed */}
            {selectedSite.cameras.domeFixed.quantity > 0 && (
              <div className="mt-3 p-4 bg-ci-light dark:bg-slate-800 rounded-lg border border-primary-200 dark:border-primary-700">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  📝 Kameranamen (optional anpassbar)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: selectedSite.cameras.domeFixed.quantity }).map((_, i) => (
                    <div key={i}>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Kamera {i + 1}
                      </label>
                      <input
                        type="text"
                        value={selectedSite.cameras.domeFixed.customNames?.[i] || ''}
                        onChange={(e) => updateCameraName('domeFixed', i, e.target.value)}
                        placeholder={`z.B. Eingang Haupttor ${i + 1}`}
                        className="w-full px-3 py-2 rounded border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-600 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Dome Vario */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vario (Variable Brennweite) - Anzahl
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={selectedSite.cameras.domeVario.quantity}
                  onChange={(e) => updateSiteCamera('domeVario', { quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Montageart
                </label>
                <select
                  value={selectedSite.cameras.domeVario.mount}
                  onChange={(e) => updateSiteCamera('domeVario', { mount: e.target.value as MountType })}
                  disabled={selectedSite.cameras.domeVario.quantity === 0}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="wall">Wandmontage</option>
                  <option value="ceiling">Deckenmontage</option>
                  <option value="pole">Mastmontage</option>
                </select>
              </div>
            </div>

            {/* Camera Names for Dome Vario */}
            {selectedSite.cameras.domeVario.quantity > 0 && (
              <div className="mt-3 p-4 bg-ci-light dark:bg-slate-800 rounded-lg border border-primary-200 dark:border-primary-700">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  📝 Kameranamen (optional anpassbar)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: selectedSite.cameras.domeVario.quantity }).map((_, i) => (
                    <div key={i}>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Kamera {i + 1}
                      </label>
                      <input
                        type="text"
                        value={selectedSite.cameras.domeVario.customNames?.[i] || ''}
                        onChange={(e) => updateCameraName('domeVario', i, e.target.value)}
                        placeholder={`z.B. Parkplatz ${i + 1}`}
                        className="w-full px-3 py-2 rounded border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-600 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bullet Cameras */}
        <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Bullet-Kameras
          </h4>
          <div className="space-y-4">
            {/* Bullet Fixed */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fixed (Festbrennweite) - Anzahl
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={selectedSite.cameras.bulletFixed.quantity}
                  onChange={(e) => updateSiteCamera('bulletFixed', { quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Montageart
                </label>
                <select
                  value={selectedSite.cameras.bulletFixed.mount}
                  onChange={(e) => updateSiteCamera('bulletFixed', { mount: e.target.value as MountType })}
                  disabled={selectedSite.cameras.bulletFixed.quantity === 0}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="wall">Wandmontage</option>
                  <option value="ceiling">Deckenmontage</option>
                  <option value="pole">Mastmontage</option>
                </select>
              </div>
            </div>

            {/* Camera Names for Bullet Fixed */}
            {selectedSite.cameras.bulletFixed.quantity > 0 && (
              <div className="mt-3 p-4 bg-ci-light dark:bg-slate-800 rounded-lg border border-primary-200 dark:border-primary-700">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  📝 Kameranamen (optional anpassbar)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: selectedSite.cameras.bulletFixed.quantity }).map((_, i) => (
                    <div key={i}>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Kamera {i + 1}
                      </label>
                      <input
                        type="text"
                        value={selectedSite.cameras.bulletFixed.customNames?.[i] || ''}
                        onChange={(e) => updateCameraName('bulletFixed', i, e.target.value)}
                        placeholder={`z.B. Außenbereich ${i + 1}`}
                        className="w-full px-3 py-2 rounded border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-600 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Bullet Vario */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vario (Variable Brennweite) - Anzahl
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={selectedSite.cameras.bulletVario.quantity}
                  onChange={(e) => updateSiteCamera('bulletVario', { quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Montageart
                </label>
                <select
                  value={selectedSite.cameras.bulletVario.mount}
                  onChange={(e) => updateSiteCamera('bulletVario', { mount: e.target.value as MountType })}
                  disabled={selectedSite.cameras.bulletVario.quantity === 0}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="wall">Wandmontage</option>
                  <option value="ceiling">Deckenmontage</option>
                  <option value="pole">Mastmontage</option>
                </select>
              </div>
            </div>

            {/* Camera Names for Bullet Vario */}
            {selectedSite.cameras.bulletVario.quantity > 0 && (
              <div className="mt-3 p-4 bg-ci-light dark:bg-slate-800 rounded-lg border border-primary-200 dark:border-primary-700">
                <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  📝 Kameranamen (optional anpassbar)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: selectedSite.cameras.bulletVario.quantity }).map((_, i) => (
                    <div key={i}>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Kamera {i + 1}
                      </label>
                      <input
                        type="text"
                        value={selectedSite.cameras.bulletVario.customNames?.[i] || ''}
                        onChange={(e) => updateCameraName('bulletVario', i, e.target.value)}
                        placeholder={`z.B. Zufahrt ${i + 1}`}
                        className="w-full px-3 py-2 rounded border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-600 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PTZ Cameras */}
        <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            PTZ-Kameras
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Pan-Tilt-Zoom Kameras für flexible Überwachung
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Anzahl
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={selectedSite.cameras.ptz.quantity}
                onChange={(e) => updateSiteCamera('ptz', { quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Montageart
              </label>
              <select
                value={selectedSite.cameras.ptz.mount}
                onChange={(e) => updateSiteCamera('ptz', { mount: e.target.value as MountType })}
                disabled={selectedSite.cameras.ptz.quantity === 0}
                className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="wall">Wandmontage</option>
                <option value="ceiling">Deckenmontage</option>
                <option value="pole">Mastmontage</option>
              </select>
            </div>
          </div>

          {/* Camera Names for PTZ */}
          {selectedSite.cameras.ptz.quantity > 0 && (
            <div className="mt-4 p-4 bg-ci-light dark:bg-slate-800 rounded-lg border border-primary-200 dark:border-primary-700">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                📝 Kameranamen (optional anpassbar)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: selectedSite.cameras.ptz.quantity }).map((_, i) => (
                  <div key={i}>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Kamera {i + 1}
                    </label>
                    <input
                      type="text"
                      value={selectedSite.cameras.ptz.customNames?.[i] || ''}
                      onChange={(e) => updateCameraName('ptz', i, e.target.value)}
                      placeholder={`z.B. Überwachungsbereich ${i + 1}`}
                      className="w-full px-3 py-2 rounded border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-600 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Thermal Cameras */}
        <div className={`p-6 rounded-lg ${isThermalAvailable ? 'bg-gray-50 dark:bg-slate-700' : 'bg-gray-100 dark:bg-slate-800 opacity-60'}`}>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            Thermal-Kameras
            {!isThermalAvailable && (
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
                Nur ab Premium
              </span>
            )}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Wärmebildkameras für erweiterte Erkennung
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Anzahl
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={selectedSite.cameras.thermal.quantity}
                onChange={(e) => updateSiteCamera('thermal', { quantity: parseInt(e.target.value) || 0 })}
                disabled={!isThermalAvailable}
                className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Montageart
              </label>
              <select
                value={selectedSite.cameras.thermal.mount}
                onChange={(e) => updateSiteCamera('thermal', { mount: e.target.value as MountType })}
                disabled={!isThermalAvailable || selectedSite.cameras.thermal.quantity === 0}
                className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="wall">Wandmontage</option>
                <option value="ceiling">Deckenmontage</option>
                <option value="pole">Mastmontage</option>
              </select>
            </div>
          </div>

          {/* Camera Names for Thermal */}
          {selectedSite.cameras.thermal.quantity > 0 && isThermalAvailable && (
            <div className="mt-4 p-4 bg-ci-light dark:bg-slate-800 rounded-lg border border-primary-200 dark:border-primary-700">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                📝 Kameranamen (optional anpassbar)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: selectedSite.cameras.thermal.quantity }).map((_, i) => (
                  <div key={i}>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Kamera {i + 1}
                    </label>
                    <input
                      type="text"
                      value={selectedSite.cameras.thermal.customNames?.[i] || ''}
                      onChange={(e) => updateCameraName('thermal', i, e.target.value)}
                      placeholder={`z.B. Perimeter ${i + 1}`}
                      className="w-full px-3 py-2 rounded border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-600 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* IP Speakers */}
        <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            IP-Lautsprecher
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Netzwerk-Lautsprecher für Audio-Ausgabe und Durchsagen
          </p>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Anzahl
            </label>
            <input
              type="number"
              min="0"
              max="999"
              value={selectedSite.cameras.ipSpeakers.quantity}
              onChange={(e) => updateIPSpeakers(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 focus:border-transparent outline-none"
            />
          </div>

          {/* Speaker Names */}
          {selectedSite.cameras.ipSpeakers.quantity > 0 && (
            <div className="mt-4 p-4 bg-ci-light dark:bg-slate-800 rounded-lg border border-primary-200 dark:border-primary-700">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                📝 Lautsprechernamen (optional anpassbar)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: selectedSite.cameras.ipSpeakers.quantity }).map((_, i) => (
                  <div key={i}>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Lautsprecher {i + 1}
                    </label>
                    <input
                      type="text"
                      value={selectedSite.cameras.ipSpeakers.customNames?.[i] || ''}
                      onChange={(e) => updateIPSpeakerName(i, e.target.value)}
                      placeholder={`z.B. Durchsage Empfang ${i + 1}`}
                      className="w-full px-3 py-2 rounded border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-600 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Site Options */}
      <div className="border-t border-gray-200 dark:border-slate-600 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Standort-Optionen
        </h3>
        <div className="space-y-4">
          {/* Outdoor */}
          <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
            <input
              type="checkbox"
              checked={selectedSite.outdoor}
              onChange={(e) => updateSiteOption('outdoor', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                Outdoor / Außenbereich
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Kameras sind dem Wetter ausgesetzt (Junction Boxes werden automatisch hinzugefügt)
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

// Step 5: Network and Cabling
const Step5NetworkAndCabling = ({ project, updateProject }: { project: Partial<Project>; updateProject: (updates: Partial<Project>) => void }) => {
  const [selectedSiteIndex, setSelectedSiteIndex] = useState(0)

  if (!project.sites || project.sites.length === 0) {
    return (
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Verkabelung & Netzwerk
        </h2>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Keine Standorte vorhanden. Bitte gehen Sie zurück und fügen Sie Standorte hinzu.
          </p>
        </div>
      </div>
    )
  }

  const selectedSite = project.sites[selectedSiteIndex]

  const updateSiteCabling = (cabling: CablingType) => {
    const updatedSites = [...project.sites!]
    updatedSites[selectedSiteIndex] = {
      ...selectedSite,
      cabling
    }
    updateProject({ sites: updatedSites })
  }

  const updateSiteStandalone = (isStandalone: boolean) => {
    const updatedSites = [...project.sites!]
    updatedSites[selectedSiteIndex] = {
      ...selectedSite,
      isStandalone
    }
    updateProject({ sites: updatedSites })
  }

  const updateSiteIPDoc = (field: 'ipDocEnabled' | 'ipStart' | 'ipGateway' | 'ipCidr' | 'ipVideoDevicePrefix' | 'ipNetworkDevicePrefix', value: string | boolean) => {
    const updatedSites = [...project.sites!]
    updatedSites[selectedSiteIndex] = {
      ...selectedSite,
      [field]: value
    }
    updateProject({ sites: updatedSites })
  }

  const cablingOptions = [
    { 
      value: 'copper' as CablingType, 
      label: 'Netzwerkkabel (Kupfer)', 
      description: 'Standard CAT6/CAT7 Verkabelung',
      icon: '🔌'
    },
    { 
      value: 'fiber' as CablingType, 
      label: 'Glasfaser', 
      description: 'LWL-Verkabelung mit Medienkonvertern/SFPs',
      icon: '💡'
    },
    { 
      value: 'wlan-bridge' as CablingType, 
      label: 'WLAN-Bridge', 
      description: 'Drahtlose Punkt-zu-Punkt Verbindung',
      icon: '📡'
    }
  ]

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Verkabelung & Netzwerk
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Konfigurieren Sie die Netzwerkinfrastruktur für jeden Standort.
      </p>

      {/* Site Selector */}
      {project.sites.length > 1 && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Standort auswählen:
          </label>
          <div className="flex gap-2 flex-wrap">
            {project.sites.map((site, index) => (
              <button
                key={site.id}
                onClick={() => setSelectedSiteIndex(index)}
                className={`px-6 py-3 rounded-lg border-2 font-semibold transition-all ${
                  selectedSiteIndex === index
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'border-primary-500 dark:border-primary-400 text-gray-900 dark:text-white hover:border-primary-600 dark:hover:border-primary-300'
                }`}
              >
                {site.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Site Header */}
      <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Standort: {selectedSite.name}
        </h3>
      </div>

      {/* Cabling Type */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Verkabelungsvariante *
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cablingOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateSiteCabling(option.value)}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                selectedSite.cabling === option.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-primary-500 dark:border-primary-400 hover:border-primary-600 dark:hover:border-primary-300'
              }`}
            >
              <div className="text-3xl mb-3">{option.icon}</div>
              <div className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                {option.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {option.description}
              </div>
            </button>
          ))}
        </div>

        {/* Cabling Info Boxes */}
        {selectedSite.cabling === 'fiber' && (
          <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <p className="text-sm text-primary-800 dark:text-primary-200">
              <strong>ℹ️ Automatisch hinzugefügt:</strong> Medienkonverter, SFP-Module, LWL-Patchkabel
            </p>
          </div>
        )}
        {selectedSite.cabling === 'wlan-bridge' && (
          <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <p className="text-sm text-primary-800 dark:text-primary-200">
              <strong>ℹ️ Automatisch hinzugefügt:</strong> WLAN-Bridge Set (2 Stück), Outdoor-Gehäuse, PoE-Injektoren
            </p>
          </div>
        )}
      </div>

      {/* Standalone Configuration */}
      <div className="border-t border-gray-200 dark:border-slate-600 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Anbindung an Serverstandort
        </h3>
        <div className="space-y-4">
          {/* Direct Connection */}
          <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
            <input
              type="radio"
              name={`standalone-${selectedSiteIndex}`}
              checked={!selectedSite.isStandalone}
              onChange={() => updateSiteStandalone(false)}
              className="mt-1 w-5 h-5 border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white mb-1">
                Direkt verkabelt zum Serverstandort
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Kameras sind direkt mit dem zentralen Serverraum/NVR verbunden
              </div>
            </div>
          </label>

          {/* Standalone */}
          <label className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
            <input
              type="radio"
              name={`standalone-${selectedSiteIndex}`}
              checked={selectedSite.isStandalone}
              onChange={() => updateSiteStandalone(true)}
              className="mt-1 w-5 h-5 border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white mb-1">
                Eigenständiger Standort
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Standort benötigt eigene Netzwerk-Infrastruktur (Switch, ggf. Outdoor-Cabinet, Stromversorgung)
              </div>
            </div>
          </label>

          {selectedSite.isStandalone && (
            <div className="ml-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>⚙️ Automatisch hinzugefügt:</strong> Netzwerk-Switch, Outdoor-Cabinet (bei Outdoor), Stromversorgung, Patchpanel
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Network Summary */}
      <div className="mt-8 p-6 bg-gray-50 dark:bg-slate-700 rounded-lg">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
          Zusammenfassung: {selectedSite.name}
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Verkabelung:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {cablingOptions.find(opt => opt.value === selectedSite.cabling)?.label || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Anbindung:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {selectedSite.isStandalone ? 'Eigenständig' : 'Direkt verkabelt'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Outdoor:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {selectedSite.outdoor ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">IP-Dokumentation:</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {selectedSite.ipDocEnabled ? 'Ja' : 'Nein'}
            </span>
          </div>
        </div>
      </div>

      {/* IP Documentation Section */}
      <div className="mt-8 border-t border-gray-200 dark:border-slate-600 pt-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          IP-Dokumentation (Optional)
        </h3>
        
        {/* IP Doc Toggle */}
        <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors mb-6">
          <input
            type="checkbox"
            checked={selectedSite.ipDocEnabled || false}
            onChange={(e) => updateSiteIPDoc('ipDocEnabled', e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              IP-Dokumentation aktivieren
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Automatische fortlaufende IP-Vergabe für alle Netzwerkgeräte an diesem Standort
            </div>
          </div>
        </label>

        {/* IP Configuration (only when enabled) */}
        {selectedSite.ipDocEnabled && (
          <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-primary-200 dark:border-primary-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Video Device Prefix */}
              <div>
                <label htmlFor={`ipVideoDevicePrefix-${selectedSiteIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video-Device Prefix (Optional)
                </label>
                <input
                  id={`ipVideoDevicePrefix-${selectedSiteIndex}`}
                  type="text"
                  value={selectedSite.ipVideoDevicePrefix || ''}
                  onChange={(e) => updateSiteIPDoc('ipVideoDevicePrefix', e.target.value.toUpperCase())}
                  placeholder="z.B. CAM, VIDEO"
                  maxLength={10}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 outline-none uppercase"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Für Kameras & IP-Lautsprecher (z.B. "CAM-DOME-01")
                </p>
              </div>

              {/* Network Device Prefix */}
              <div>
                <label htmlFor={`ipNetworkDevicePrefix-${selectedSiteIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Netzwerk-Device Prefix (Optional)
                </label>
                <input
                  id={`ipNetworkDevicePrefix-${selectedSiteIndex}`}
                  type="text"
                  value={selectedSite.ipNetworkDevicePrefix || ''}
                  onChange={(e) => updateSiteIPDoc('ipNetworkDevicePrefix', e.target.value.toUpperCase())}
                  placeholder="z.B. NET, INFRA"
                  maxLength={10}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 outline-none uppercase"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Für Switches, NVR/VMS, Router (z.B. "NET-SW-01")
                </p>
              </div>

              {/* Start IP */}
              <div>
                <label htmlFor={`ipStart-${selectedSiteIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start-IP-Adresse * 
                </label>
                <input
                  id={`ipStart-${selectedSiteIndex}`}
                  type="text"
                  value={selectedSite.ipStart || ''}
                  onChange={(e) => updateSiteIPDoc('ipStart', e.target.value)}
                  placeholder="z.B. 192.168.10.50"
                  className={`w-full px-4 py-3 rounded-lg border bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none ${
                    selectedSite.ipStart && !validateIPv4(selectedSite.ipStart)
                      ? 'border-red-500 dark:border-red-400'
                      : selectedSite.ipStart && !isValidHostIP(selectedSite.ipStart)
                      ? 'border-amber-500 dark:border-amber-400'
                      : 'border-gray-300 dark:border-slate-600'
                  }`}
                />
                {selectedSite.ipStart && !validateIPv4(selectedSite.ipStart) && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Ungültige IPv4-Adresse
                  </p>
                )}
                {selectedSite.ipStart && validateIPv4(selectedSite.ipStart) && !isValidHostIP(selectedSite.ipStart) && (
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                    Warnung: IP endet auf .0 oder .255
                  </p>
                )}
              </div>

              {/* CIDR */}
              <div>
                <label htmlFor={`ipCidr-${selectedSiteIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subnetzmaske (CIDR)
                </label>
                <select
                  id={`ipCidr-${selectedSiteIndex}`}
                  value={selectedSite.ipCidr || '24'}
                  onChange={(e) => updateSiteIPDoc('ipCidr', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-600 outline-none"
                >
                  <option value="24">/24 (255.255.255.0)</option>
                  <option value="16">/16 (255.255.0.0)</option>
                  <option value="8">/8 (255.0.0.0)</option>
                </select>
              </div>

              {/* Gateway */}
              <div className="md:col-span-2">
                <label htmlFor={`ipGateway-${selectedSiteIndex}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gateway (Optional)
                </label>
                <input
                  id={`ipGateway-${selectedSiteIndex}`}
                  type="text"
                  value={selectedSite.ipGateway || ''}
                  onChange={(e) => updateSiteIPDoc('ipGateway', e.target.value)}
                  placeholder="z.B. 192.168.10.1"
                  className={`w-full px-4 py-3 rounded-lg border bg-ci-light dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none ${
                    selectedSite.ipGateway && selectedSite.ipGateway.length > 0 && !validateIPv4(selectedSite.ipGateway)
                      ? 'border-red-500 dark:border-red-400'
                      : 'border-gray-300 dark:border-slate-600'
                  }`}
                />
                {selectedSite.ipGateway && selectedSite.ipGateway.length > 0 && !validateIPv4(selectedSite.ipGateway) && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Ungültige IPv4-Adresse
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <p className="text-xs text-primary-800 dark:text-primary-200">
                <strong>💡 Hinweis:</strong> Die IP-Adressen werden automatisch fortlaufend an alle Netzwerkgeräte vergeben.
                Die Reihenfolge ist: <strong>Router → Switches → WLAN-Bridge → NVR/VMS → Kameras</strong>. In Schritt 6 können Sie die Bezeichnungen vor dem Export anpassen.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Step 6: Summary
const Step6Summary = ({ project }: { project: Partial<Project> }) => {
  // State for editable device labels
  const [editableDevices, setEditableDevices] = useState<Record<string, Record<string, string>>>({})
  
  // Update device label
  const updateDeviceLabel = (siteId: string, deviceId: string, newLabel: string) => {
    setEditableDevices(prev => ({
      ...prev,
      [siteId]: {
        ...(prev[siteId] || {}),
        [deviceId]: newLabel
      }
    }))
  }
  
  // CSV Export function
  const exportToExcel = () => {
    if (!project.sites) return
    
    const sitesWithIP = project.sites.filter(site => site.ipDocEnabled)
    if (sitesWithIP.length === 0) return
    
    // Create a new workbook
    const wb = XLSX.utils.book_new()
    
    sitesWithIP.forEach(site => {
      // Generate all devices for this site in correct order
      let devices = generateAllNetworkDevices(site, project, site.ipVideoDevicePrefix, site.ipNetworkDevicePrefix)
      
      // Assign IPs
      const { devices: devicesWithIP } = assignIPsToDevices(devices, site.ipStart || '')
      
      // Prepare data for worksheet
      const wsData: any[][] = []
      
      // Header row 1: Site info
      wsData.push([`Standort: ${site.name}`])
      wsData.push([`Gateway: ${site.ipGateway || 'N/A'}`, '', '', '', '', `Subnetz: /${site.ipCidr || '24'}`])
      wsData.push([]) // Empty row
      
      // Header row 2: Column headers
      wsData.push(['Geräte-ID', 'Bezeichnung', 'Typ', 'Hersteller', 'ESO-Artikelnummer', 'IP-Adresse'])
      
      // Data rows
      devicesWithIP.forEach(device => {
        const label = editableDevices[site.id]?.[device.id] || device.label
        wsData.push([
          device.id,
          label,
          device.type,
          device.manufacturer,
          device.esoNumber,
          device.ip
        ])
      })
      
      // Create worksheet from data
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      
      // Set column widths
      ws['!cols'] = [
        { wch: 18 },  // Geräte-ID
        { wch: 35 },  // Bezeichnung
        { wch: 15 },  // Typ
        { wch: 15 },  // Hersteller
        { wch: 20 },  // ESO-Artikelnummer
        { wch: 16 }   // IP-Adresse
      ]
      
      // Apply styles to header rows
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      // Style header row (row 4, index 3)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 3, c: col })
        if (!ws[cellAddress]) continue
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2563EB" } },
          alignment: { horizontal: "center", vertical: "center" }
        }
      }
      
      // Style site name row (row 1, index 0)
      if (ws['A1']) {
        ws['A1'].s = {
          font: { bold: true, sz: 14 },
          fill: { fgColor: { rgb: "DBEAFE" } }
        }
      }
      
      // Merge cells for site name
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }  // Merge A1:F1
      ]
      
      // Add worksheet to workbook (use site name, max 31 chars for Excel)
      const sheetName = site.name.substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })
    
    // Generate Excel file and download
    const fileName = `IP-Dokumentation_${project.name?.replace(/\s+/g, '_') || 'Projekt'}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const exportToPDF = () => {
    // Prepare BOM
    const bom = calculateBOM()
    
    // Prepare IP Documentation (if enabled)
    let ipDocumentation: any[] | undefined = undefined
    
    if (project.sites && project.sites.some(site => site.ipDocEnabled)) {
      ipDocumentation = []
      
      project.sites.filter(site => site.ipDocEnabled).forEach(site => {
        // Generate all devices for this site in correct order
        let devices = generateAllNetworkDevices(site, project, site.ipVideoDevicePrefix, site.ipNetworkDevicePrefix)
        
        // Assign IPs
        const { devices: devicesWithIP } = assignIPsToDevices(devices, site.ipStart || '')
        
        // Apply editable labels
        const finalDevices = devicesWithIP.map(device => ({
          ...device,
          label: editableDevices[site.id]?.[device.id] || device.label
        }))
        
        ipDocumentation!.push({
          siteId: site.id,
          siteName: site.name,
          devices: finalDevices,
          gateway: site.ipGateway,
          cidr: site.ipCidr
        })
      })
    }
    
    // Generate PDF
    generatePDF({
      project: project as Project,
      bom,
      ipDocumentation
    })
  }
  
  // Calculate BOM based on project configuration
  const calculateBOM = () => {
    const bom: BOMItem[] = []

    if (!project.sites || !project.manufacturer) return bom

    project.sites.forEach((site) => {
      const sitePrefix = `[${site.name}]`

      // Dome Fixed Cameras + Mounting
      if (site.cameras.domeFixed.quantity > 0) {
        bom.push({
          articleName: `${sitePrefix} Dome Kamera - Fixed`,
          manufacturer: project.manufacturer!,
          esoArticleNumber: `${project.manufacturer}-DOME-FIX-001`,
          quantity: site.cameras.domeFixed.quantity,
          unitPrice: 299,
          category: 'Kameras'
        })
        // Add mounting accessories
        bom.push(...generateMountingAccessories('dome', site.cameras.domeFixed.mount, site.cameras.domeFixed.quantity, project.manufacturer!, sitePrefix))
      }

      // Dome Vario Cameras + Mounting
      if (site.cameras.domeVario.quantity > 0) {
        bom.push({
          articleName: `${sitePrefix} Dome Kamera - Vario`,
          manufacturer: project.manufacturer!,
          esoArticleNumber: `${project.manufacturer}-DOME-VAR-001`,
          quantity: site.cameras.domeVario.quantity,
          unitPrice: 399,
          category: 'Kameras'
        })
        // Add mounting accessories
        bom.push(...generateMountingAccessories('dome', site.cameras.domeVario.mount, site.cameras.domeVario.quantity, project.manufacturer!, sitePrefix))
      }

      // Bullet Fixed Cameras + Mounting
      if (site.cameras.bulletFixed.quantity > 0) {
        bom.push({
          articleName: `${sitePrefix} Bullet Kamera - Fixed`,
          manufacturer: project.manufacturer!,
          esoArticleNumber: `${project.manufacturer}-BULL-FIX-001`,
          quantity: site.cameras.bulletFixed.quantity,
          unitPrice: 329,
          category: 'Kameras'
        })
        // Add mounting accessories
        bom.push(...generateMountingAccessories('bullet', site.cameras.bulletFixed.mount, site.cameras.bulletFixed.quantity, project.manufacturer!, sitePrefix))
      }

      // Bullet Vario Cameras + Mounting
      if (site.cameras.bulletVario.quantity > 0) {
        bom.push({
          articleName: `${sitePrefix} Bullet Kamera - Vario`,
          manufacturer: project.manufacturer!,
          esoArticleNumber: `${project.manufacturer}-BULL-VAR-001`,
          quantity: site.cameras.bulletVario.quantity,
          unitPrice: 429,
          category: 'Kameras'
        })
        // Add mounting accessories
        bom.push(...generateMountingAccessories('bullet', site.cameras.bulletVario.mount, site.cameras.bulletVario.quantity, project.manufacturer!, sitePrefix))
      }

      // PTZ Cameras + Mounting
      if (site.cameras.ptz.quantity > 0) {
        bom.push({
          articleName: `${sitePrefix} PTZ Kamera`,
          manufacturer: project.manufacturer!,
          esoArticleNumber: `${project.manufacturer}-PTZ-001`,
          quantity: site.cameras.ptz.quantity,
          unitPrice: 1299,
          category: 'Kameras'
        })
        // Add mounting accessories
        bom.push(...generateMountingAccessories('ptz', site.cameras.ptz.mount, site.cameras.ptz.quantity, project.manufacturer!, sitePrefix))
      }

      // Thermal Cameras + Mounting
      if (site.cameras.thermal.quantity > 0) {
        bom.push({
          articleName: `${sitePrefix} Thermal Kamera`,
          manufacturer: project.manufacturer!,
          esoArticleNumber: `${project.manufacturer}-THRM-001`,
          quantity: site.cameras.thermal.quantity,
          unitPrice: 2499,
          category: 'Kameras'
        })
        // Add mounting accessories
        bom.push(...generateMountingAccessories('thermal', site.cameras.thermal.mount, site.cameras.thermal.quantity, project.manufacturer!, sitePrefix))
      }

      if (site.cameras.ipSpeakers.quantity > 0) {
        bom.push({
          articleName: `${sitePrefix} IP-Lautsprecher`,
          manufacturer: project.manufacturer!,
          esoArticleNumber: `${project.manufacturer}-SPEAK-001`,
          quantity: site.cameras.ipSpeakers.quantity,
          unitPrice: 249,
          category: 'Audio'
        })
      }

      // Outdoor accessories (Junction Boxes)
      if (site.outdoor) {
        const totalOutdoorCameras = 
          site.cameras.domeFixed.quantity + 
          site.cameras.domeVario.quantity + 
          site.cameras.bulletFixed.quantity + 
          site.cameras.bulletVario.quantity +
          site.cameras.ptz.quantity + 
          site.cameras.thermal.quantity
        if (totalOutdoorCameras > 0) {
          bom.push({
            articleName: `${sitePrefix} Junction Box (Outdoor)`,
            manufacturer: 'Universal',
            esoArticleNumber: 'ACC-JBOX-001',
            quantity: totalOutdoorCameras,
            unitPrice: 29,
            category: 'Zubehör'
          })
        }
      }

      // Network & Cabling
      if (site.cabling === 'fiber') {
        bom.push({
          articleName: `${sitePrefix} Medienkonverter Set`,
          manufacturer: 'Universal',
          esoArticleNumber: 'NET-CONV-001',
          quantity: 2,
          unitPrice: 189,
          category: 'Netzwerk'
        })
        bom.push({
          articleName: `${sitePrefix} SFP-Module (Paar)`,
          manufacturer: 'Universal',
          esoArticleNumber: 'NET-SFP-001',
          quantity: 1,
          unitPrice: 79,
          category: 'Netzwerk'
        })
      }

      if (site.cabling === 'wlan-bridge') {
        bom.push({
          articleName: `${sitePrefix} WLAN-Bridge Set`,
          manufacturer: 'Universal',
          esoArticleNumber: 'NET-WLAN-001',
          quantity: 1,
          unitPrice: 449,
          category: 'Netzwerk'
        })
        bom.push({
          articleName: `${sitePrefix} Outdoor-Gehäuse für WLAN`,
          manufacturer: 'Universal',
          esoArticleNumber: 'ACC-ENCL-001',
          quantity: 2,
          unitPrice: 69,
          category: 'Infrastruktur'
        })
      }

      // Standalone site infrastructure
      if (site.isStandalone) {
        const totalDevices = 
          site.cameras.domeFixed.quantity +
          site.cameras.domeVario.quantity +
          site.cameras.bulletFixed.quantity +
          site.cameras.bulletVario.quantity +
          site.cameras.ptz.quantity +
          site.cameras.thermal.quantity +
          site.cameras.ipSpeakers.quantity
        const switchPorts = Math.max(8, Math.ceil(totalDevices / 8) * 8)
        
        bom.push({
          articleName: `${sitePrefix} Netzwerk-Switch ${switchPorts}-Port PoE+`,
          manufacturer: 'Universal',
          esoArticleNumber: `NET-SW-${switchPorts}P-001`,
          quantity: 1,
          unitPrice: switchPorts === 8 ? 299 : switchPorts === 16 ? 599 : 899,
          category: 'Netzwerk'
        })

        if (site.outdoor) {
          bom.push({
            articleName: `${sitePrefix} Outdoor-Cabinet`,
            manufacturer: 'Universal',
            esoArticleNumber: 'INFRA-CAB-001',
            quantity: 1,
            unitPrice: 449,
            category: 'Infrastruktur'
          })
        }

        bom.push({
          articleName: `${sitePrefix} Stromversorgung / PoE-Injektor`,
          manufacturer: 'Universal',
          esoArticleNumber: 'INFRA-PSU-001',
          quantity: 1,
          unitPrice: 189,
          category: 'Infrastruktur'
          })
      }
    })

    // Video Management System (NVR or VMS)
    const totalCameras = project.sites.reduce((sum, site) => 
      sum + 
      site.cameras.domeFixed.quantity +
      site.cameras.domeVario.quantity +
      site.cameras.bulletFixed.quantity +
      site.cameras.bulletVario.quantity +
      site.cameras.ptz.quantity +
      site.cameras.thermal.quantity +
      site.cameras.ipSpeakers.quantity,
    0)

    if (project.videoManagement === 'nvr') {
      // Automatische Reserve: Immer nächstgrößere Gerätegröße
      let channels = 8
      if (totalCameras > 16) {
        channels = 32
      } else if (totalCameras > 8) {
        channels = 16
      } else if (totalCameras > 4) {
        channels = 8
      } else {
        channels = 8 // Minimum
      }
      
      // For ECO tier with PoE, use NVR with integrated PoE
      const isEcoWithPoE = project.tier === 'eco'
      
      bom.push({
        articleName: `NVR ${channels}-Kanal${isEcoWithPoE ? ' mit PoE' : ''}`,
        manufacturer: project.manufacturer!,
        esoArticleNumber: `${project.manufacturer}-NVR-${channels}CH${isEcoWithPoE ? '-POE' : ''}`,
        quantity: 1,
        unitPrice: channels === 8 ? (isEcoWithPoE ? 999 : 899) : channels === 16 ? 1499 : 2499,
        category: 'Recorder/VMS'
      })
    } else {
      // VMS
      bom.push({
        articleName: 'VMS Server-Lizenz',
        manufacturer: project.manufacturer!,
        esoArticleNumber: `${project.manufacturer}-VMS-SRV`,
        quantity: 1,
        unitPrice: 1299,
        category: 'Lizenzen'
      })
      bom.push({
        articleName: 'VMS Kamera-Lizenz',
        manufacturer: project.manufacturer!,
        esoArticleNumber: `${project.manufacturer}-VMS-CAM`,
        quantity: totalCameras,
        unitPrice: 49,
        category: 'Lizenzen'
      })
      
      // VMS Server Hardware (dimensioniert nach Kamera-Anzahl)
      let serverSpec = ''
      let serverPrice = 0
      if (totalCameras <= 16) {
        serverSpec = 'Entry (bis 16 Kameras)'
        serverPrice = 1899
      } else if (totalCameras <= 32) {
        serverSpec = 'Standard (bis 32 Kameras)'
        serverPrice = 2899
      } else if (totalCameras <= 64) {
        serverSpec = 'Professional (bis 64 Kameras)'
        serverPrice = 4499
      } else {
        serverSpec = 'Enterprise (64+ Kameras)'
        serverPrice = 6999
      }
      
      bom.push({
        articleName: `VMS Server ${serverSpec}`,
        manufacturer: 'Universal',
        esoArticleNumber: `VMS-SERVER-${totalCameras <= 16 ? 'E' : totalCameras <= 32 ? 'S' : totalCameras <= 64 ? 'P' : 'ENT'}`,
        quantity: 1,
        unitPrice: serverPrice,
        category: 'Hardware'
      })
      
      // VMS: Automatisch Client-Workstation, Display, Maus+Tastatur
      const isMultiMonitor = project.vmsMultiMonitor || false
      
      bom.push({
        articleName: `VMS Client-Workstation${isMultiMonitor ? ' (RTX-Grafikkarte)' : ''}`,
        manufacturer: 'Universal',
        esoArticleNumber: isMultiMonitor ? 'VMS-WS-RTX-001' : 'VMS-WS-STD-001',
        quantity: 1,
        unitPrice: isMultiMonitor ? 1899 : 1299,
        category: 'Hardware'
      })
      
      bom.push({
        articleName: 'Display 27" (Full HD)',
        manufacturer: 'Universal',
        esoArticleNumber: 'VMS-MON-27-001',
        quantity: isMultiMonitor ? 2 : 1,
        unitPrice: 299,
        category: 'Hardware'
      })
      
      bom.push({
        articleName: 'Maus + Tastatur Set',
        manufacturer: 'Universal',
        esoArticleNumber: 'VMS-INPUT-001',
        quantity: 1,
        unitPrice: 49,
        category: 'Hardware'
      })
    }

    // Storage - Use configured HDD for NVR or calculate for VMS
    if (project.videoManagement === 'nvr' && project.storageHddSize && project.storageHddQuantity) {
      // NVR: Use configured storage
      bom.push({
        articleName: `Festplatte ${project.storageHddSize}TB (Surveillance-Grade)`,
        manufacturer: 'Universal',
        esoArticleNumber: `STOR-HDD-${project.storageHddSize}TB`,
        quantity: project.storageHddQuantity,
        unitPrice: project.storageHddSize * 89,
        category: 'Speicher'
      })
    } else if (project.videoManagement === 'vms') {
      // VMS: Calculate storage based on cameras and days
      const storageTB = Math.ceil((totalCameras / 4) * (project.storageDays || 2) / 7)
      if (storageTB > 0) {
        bom.push({
          articleName: `Festplatte ${storageTB}TB (Surveillance-Grade)`,
          manufacturer: 'Universal',
          esoArticleNumber: `STOR-HDD-${storageTB}TB`,
          quantity: 1,
          unitPrice: storageTB * 89,
          category: 'Speicher'
        })
      }
    }

    // Remote Access (VPN Router)
    if (project.remoteCapable) {
      bom.push({
        articleName: 'VPN-Router',
        manufacturer: 'Universal',
        esoArticleNumber: 'NET-VPN-001',
        quantity: 1,
        unitPrice: 399,
        category: 'Netzwerk'
      })
    }

    // UPS
    if (project.upsRequired) {
      bom.push({
        articleName: 'USV (Unterbrechungsfreie Stromversorgung)',
        manufacturer: 'Universal',
        esoArticleNumber: 'INFRA-UPS-001',
        quantity: 1,
        unitPrice: 599,
        category: 'Infrastruktur'
      })
    }

    // 9 HE Network Cabinet (Optional)
    if (project.networkCabinet9HE) {
      bom.push({
        articleName: '9 HE Netzwerkschrank (Komplettset)',
        manufacturer: 'Universal',
        esoArticleNumber: 'INFRA-RACK-9HE-001',
        quantity: 1,
        unitPrice: 749,
        category: 'Infrastruktur'
      })
    }

    // Lift Platform / Hubsteiger (Optional)
    if (project.liftPlatform) {
      bom.push({
        articleName: 'Hubsteiger max. 12m inkl. Anlieferung',
        manufacturer: 'Universal',
        esoArticleNumber: 'SERVICE-LIFT-001',
        quantity: 1,
        unitPrice: 850,
        category: 'Dienstleistung'
      })
    }

    // ====== SERVICE POSITIONS / DIENSTLEISTUNGEN ======
    
    // Calculate material subtotal (before services)
    const materialSubtotal = bom.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    
    // BHE-Zeiten (Installation times based on BHE_TIME_MODEL_VIDEO.md)
    // All times in minutes, rate: 120€/hour
    let totalBHEMinutes = 0
    
    // 1. CAMERAS - Base installation time per camera
    // IP Netzwerkkamera montieren, einstellen, programmieren: 75 min
    // Grundeinrichtung IP Netzwerkkamera: 10 min
    // Einstellung Bildausschnitt nach Kundenvorgaben: 20 min
    // Einstellung IP-Security & DSGVO je Kanal: 30 min
    // TOTAL: 135 min per camera
    const baseCameraTime = 135
    totalBHEMinutes += totalCameras * baseCameraTime
    
    // 2. CAMERAS - Additional mounting time per camera type & mount
    project.sites.forEach(site => {
      // Dome cameras
      if (site.cameras.domeFixed.quantity > 0) {
        const mountTime = site.cameras.domeFixed.mount === 'ceiling' ? 30 : 
                          site.cameras.domeFixed.mount === 'wall' ? 20 : 20 // pole
        totalBHEMinutes += site.cameras.domeFixed.quantity * mountTime
      }
      if (site.cameras.domeVario.quantity > 0) {
        const mountTime = site.cameras.domeVario.mount === 'ceiling' ? 30 : 
                          site.cameras.domeVario.mount === 'wall' ? 20 : 20
        totalBHEMinutes += site.cameras.domeVario.quantity * mountTime
      }
      
      // Bullet cameras (using similar times as Dome)
      if (site.cameras.bulletFixed.quantity > 0) {
        const mountTime = site.cameras.bulletFixed.mount === 'ceiling' ? 20 : 
                          site.cameras.bulletFixed.mount === 'wall' ? 20 : 20
        totalBHEMinutes += site.cameras.bulletFixed.quantity * mountTime
      }
      if (site.cameras.bulletVario.quantity > 0) {
        const mountTime = site.cameras.bulletVario.mount === 'ceiling' ? 20 : 
                          site.cameras.bulletVario.mount === 'wall' ? 20 : 20
        totalBHEMinutes += site.cameras.bulletVario.quantity * mountTime
      }
      
      // PTZ cameras
      if (site.cameras.ptz.quantity > 0) {
        const mountTime = site.cameras.ptz.mount === 'ceiling' ? 30 : 
                          site.cameras.ptz.mount === 'wall' ? 20 : 20
        totalBHEMinutes += site.cameras.ptz.quantity * mountTime
      }
      
      // Thermal cameras (High-Risk only)
      if (site.cameras.thermal?.quantity > 0) {
        const mountTime = site.cameras.thermal.mount === 'ceiling' ? 30 : 
                          site.cameras.thermal.mount === 'wall' ? 20 : 20
        totalBHEMinutes += site.cameras.thermal.quantity * mountTime
      }
    })
    
    // 3. IP SPEAKERS
    // Treating similar to cameras but simpler installation
    const totalIPSpeakers = project.sites.reduce((sum, site) => 
      sum + (site.cameras.ipSpeakers?.quantity || 0), 0)
    totalBHEMinutes += totalIPSpeakers * 60 // Simplified: 60 min per speaker
    
    // 4. SWITCHES
    // Switch 4-Port: 15 min, 8-Port: 20 min, 16-Port: 25 min, 24-Port: 30 min
    const switchTime = totalCameras <= 4 ? 15 : 
                       totalCameras <= 8 ? 20 : 
                       totalCameras <= 16 ? 25 : 30
    const switchCount = project.sites.filter(s => s.isStandalone).length + 
                        (project.videoManagement === 'vms' ? 1 : 0) // Core switch for VMS
    totalBHEMinutes += switchCount * switchTime
    
    // 5. NVR
    // Digitalrecorder einstellen / programmieren: 15 min pro Kanal
    // Kundenspezifische Programmierung NVR: 15 min pro Kanal
    // Aufschaltung je Videokanal: 10 min
    // TOTAL: 40 min per channel
    if (project.videoManagement === 'nvr') {
      totalBHEMinutes += totalCameras * 40
    }
    
    // 6. VMS
    // Grundeinrichtung IP-Server: 240 min
    // Workstation Videomanagement einrichten: 90 min
    // Einrichtung Remoteservice je System: 30 min (if remote)
    if (project.videoManagement === 'vms') {
      totalBHEMinutes += 240 // VMS Server setup
      totalBHEMinutes += 90  // Workstation setup
      if (project.remoteCapable) {
        totalBHEMinutes += 30 // Remote service setup
      }
    }
    
    // 7. MONITORS
    // Desktop-Monitor aufstellen / einstellen: 10 min
    // Zusätzlicher Monitor (Multibild): 15 min
    if (project.videoManagement === 'vms') {
      totalBHEMinutes += 10 // Main monitor
      if (project.vmsMultiMonitor) {
        totalBHEMinutes += 15 // Additional monitor
      }
    }
    
    // 8. DOCUMENTATION
    // Erstellung Anlagendokumentation: 15 min pro Kanal
    totalBHEMinutes += totalCameras * 15
    
    // Convert to hours and add to BOM
    const installationHours = Math.ceil(totalBHEMinutes / 60)
    const installationCost = installationHours * 120
    
    if (installationHours > 0) {
      bom.push({
        articleName: `Montage & Inbetriebnahme (${totalBHEMinutes} min = ${installationHours}h à 120€)`,
        manufacturer: 'Securitas Technology',
        esoArticleNumber: 'SERVICE-INST-001',
        quantity: installationHours,
        unitPrice: 120,
        category: 'Dienstleistung'
      })
    }
    
    // Anfahrtspauschale (135€ je 4 Kameras, aufgerundet)
    const tripCount = Math.ceil(totalCameras / 4)
    if (tripCount > 0) {
      bom.push({
        articleName: `Anfahrtspauschale (${tripCount}× à 135€)`,
        manufacturer: 'Securitas Technology',
        esoArticleNumber: 'SERVICE-TRIP-001',
        quantity: tripCount,
        unitPrice: 135,
        category: 'Dienstleistung'
      })
    }
    
    // Dokumentationskosten (5% der Gesamtsumme aller bisherigen Positionen)
    const subtotalBeforeDocs = bom.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const documentationCost = Math.round(subtotalBeforeDocs * 0.05)
    
    if (documentationCost > 0) {
      bom.push({
        articleName: 'Dokumentation (5% der Gesamtsumme)',
        manufacturer: 'Securitas Technology',
        esoArticleNumber: 'SERVICE-DOC-001',
        quantity: 1,
        unitPrice: documentationCost,
        category: 'Dienstleistung'
      })
    }

    return bom
  }

  const bom = calculateBOM()
  
  // Group BOM by category
  const groupedBOM = bom.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, BOMItem[]>)

  const categories = ['Kameras', 'Netzwerk', 'Recorder/VMS', 'Lizenzen', 'Speicher', 'Hardware', 'Audio', 'Zubehör', 'Infrastruktur', 'Dienstleistung']
  
  const totalPrice = bom.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

  const getTotalCameras = () => {
    if (!project.sites) return 0
    return project.sites.reduce((sum, site) => 
      sum + 
      site.cameras.domeFixed.quantity +
      site.cameras.domeVario.quantity +
      site.cameras.bulletFixed.quantity +
      site.cameras.bulletVario.quantity +
      site.cameras.ptz.quantity +
      site.cameras.thermal.quantity +
      site.cameras.ipSpeakers.quantity,
    0)
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Zusammenfassung & Stückliste
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Ihre Konfiguration ist abgeschlossen. Hier ist die detaillierte Stückliste.
      </p>

      {/* Project Summary */}
      <div className="mb-8 p-6 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-lg border-2 border-primary-200 dark:border-primary-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Projekt-Übersicht</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Projektname:</dt>
              <dd className="text-gray-900 dark:text-white font-medium">{project.name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Standorte:</dt>
              <dd className="text-gray-900 dark:text-white font-medium">{project.sites?.length || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Gesamt Kameras:</dt>
              <dd className="text-gray-900 dark:text-white font-medium">{getTotalCameras()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Paket:</dt>
              <dd className="text-gray-900 dark:text-white font-medium">{project.tier || '-'}</dd>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Hersteller:</dt>
              <dd className="text-gray-900 dark:text-white font-medium">
                {project.manufacturer || '-'}
                {project.manufacturer === 'Hanwha' && project.hanwhaSeries && ` (${project.hanwhaSeries})`}
                {project.manufacturer === 'AJAX' && project.ajaxSeries && ` (${project.ajaxSeries})`}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Video-Management:</dt>
              <dd className="text-gray-900 dark:text-white font-medium">
                {project.videoManagement === 'nvr' ? 'NVR' : 'VMS'}
              </dd>
            </div>
            {project.videoManagement === 'nvr' && project.storageHddSize && project.storageHddQuantity && (
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Festplatten:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {project.storageHddQuantity}x {project.storageHddSize}TB ({project.storageHddSize * project.storageHddQuantity}TB)
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Speicherdauer:</dt>
              <dd className="text-gray-900 dark:text-white font-medium">
                {project.storageDays ? `${project.storageDays} ${project.storageDays === 1 ? 'Tag' : 'Tage'}` : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Remote-Zugriff:</dt>
              <dd className="text-gray-900 dark:text-white font-medium">
                {project.remoteCapable ? 'Ja' : 'Nein'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">USV:</dt>
              <dd className="text-gray-900 dark:text-white font-medium">
                {project.upsRequired ? 'Ja' : 'Nein'}
              </dd>
            </div>
          </div>
        </div>

        {/* Remote Access Bandwidth Recommendation */}
        {project.remoteCapable && getTotalCameras() > 0 && (
          <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <h4 className="font-semibold text-primary-900 dark:text-primary-300 mb-2">
              📡 Empfohlene Upload-Bandbreite
            </h4>
            <p className="text-sm text-primary-800 dark:text-primary-200">
              Für {getTotalCameras()} Kamera{getTotalCameras() > 1 ? 's' : ''} wird empfohlen:
              <strong className="ml-2">
                ≥ {Math.max(10, Math.ceil(getTotalCameras() * 2))} Mbit/s Upload
              </strong>
            </p>
            <p className="text-xs text-primary-700 dark:text-primary-300 mt-2">
              💡 Tipp: Für bessere Performance empfehlen wir die Verwendung von Substreams für Remote-Zugriff.
            </p>
          </div>
        )}
      </div>

      {/* BOM Table */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Stückliste
          </h3>
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            UVP: {totalPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </div>
        </div>

        {categories.map((category) => {
          const items = groupedBOM[category]
          if (!items || items.length === 0) return null

          const categoryTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)

          return (
            <div key={category} className="mb-6">
              <div className="bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-t-lg border-b-2 border-primary-500">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-900 dark:text-white">{category}</h4>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {categoryTotal.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>
              <div className="bg-ci-light dark:bg-slate-800 rounded-b-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700/50">
                    <tr className="text-left text-xs text-gray-600 dark:text-gray-400 uppercase">
                      <th className="px-4 py-3">Artikelname</th>
                      <th className="px-4 py-3">Hersteller</th>
                      <th className="px-4 py-3">ESO-Nr.</th>
                      <th className="px-4 py-3 text-center">Menge</th>
                      <th className="px-4 py-3 text-right">Einzel-UVP</th>
                      <th className="px-4 py-3 text-right">Gesamt-UVP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.articleName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.manufacturer}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{item.esoArticleNumber}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-white">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                          {item.unitPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {(item.quantity * item.unitPrice).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      {/* Total Summary */}
      <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-gray-200 dark:border-slate-600">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gesamt-UVP (netto)</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {totalPrice.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Positionen</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {bom.length}
            </div>
          </div>
        </div>
        <div className="flex justify-center pt-4 border-t border-gray-300 dark:border-slate-600">
          <button
            onClick={exportToPDF}
            className="px-8 py-3 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Angebot als PDF exportieren
          </button>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-300 dark:border-slate-600 text-xs text-gray-500 dark:text-gray-400">
          * Alle Preise sind unverbindliche Verkaufspreise (UVP) zzgl. MwSt. | Die Stückliste dient als Grundlage für die Angebotserstellung.
        </div>
      </div>

      {/* IP Documentation per Site */}
      {project.sites && project.sites.some(site => site.ipDocEnabled) && (
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              IP-Dokumentation
            </h3>
            <div className="flex gap-3">
              <button
                onClick={exportToExcel}
                className="px-6 py-3 rounded-lg bg-ci-accent text-white font-semibold hover:bg-primary-400 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel Export
              </button>
              <button
                onClick={exportToPDF}
                className="px-6 py-3 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF Export
              </button>
            </div>
          </div>
          
          {project.sites.filter(site => site.ipDocEnabled).map((site) => {
            // Generate all network devices for this site in correct order
            let devices = generateAllNetworkDevices(site, project, site.ipVideoDevicePrefix, site.ipNetworkDevicePrefix)
            
            // Assign IPs
            const { devices: devicesWithIP, error } = assignIPsToDevices(devices, site.ipStart || '')
            
            return (
              <div key={site.id} className="mb-8">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-t-lg border-b-2 border-primary-500">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      Standort: {site.name}
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {site.ipGateway && `Gateway: ${site.ipGateway} | `}
                      Subnetz: /{site.ipCidr || '24'}
                    </div>
                  </div>
                </div>
                
                {error ? (
                  <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-b-lg border-2 border-red-200 dark:border-red-800">
                    <p className="text-red-800 dark:text-red-200 font-medium">
                      ⚠️ Fehler: {error}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                      Bitte überprüfen Sie die Start-IP-Adresse in Schritt 5.
                    </p>
                  </div>
                ) : (
                  <div className="bg-ci-light dark:bg-slate-800 rounded-b-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-slate-700/50">
                        <tr className="text-left text-xs text-gray-600 dark:text-gray-400 uppercase">
                          <th className="px-4 py-3">Geräte-ID</th>
                          <th className="px-4 py-3">Bezeichnung (editierbar)</th>
                          <th className="px-4 py-3">Typ</th>
                          <th className="px-4 py-3">Hersteller</th>
                          <th className="px-4 py-3">ESO-Nr.</th>
                          <th className="px-4 py-3 font-bold">IP-Adresse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {devicesWithIP.map((device) => (
                          <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                            <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white font-semibold">
                              {device.id}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <input
                                type="text"
                                value={editableDevices[site.id]?.[device.id] || device.label}
                                onChange={(e) => updateDeviceLabel(site.id, device.id, e.target.value)}
                                className="w-full px-2 py-1 rounded border-2 border-primary-500 dark:border-primary-400 bg-ci-light dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-primary-600 outline-none"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {device.type}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {device.manufacturer}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                              {device.esoNumber}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-primary-600 dark:text-primary-400 font-bold">
                              {device.ip}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 text-xs text-gray-500 dark:text-gray-400">
                      Gesamt: {devicesWithIP.length} Netzwerkgeräte | Start-IP: {site.ipStart} | End-IP: {devicesWithIP[devicesWithIP.length - 1]?.ip}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

