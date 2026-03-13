/* Layout racine de l'espace administrateur */
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AdminNavbar from './AdminNavbar.jsx'
import AdminSidebar from './AdminSidebar.jsx'
import ToastContainer from '../ui/Toast.jsx'
import { useToast } from '../../hooks/useToast.jsx'
import { createContext, useContext } from 'react'

/* Contexte des toasts disponible dans toutes les pages admin */
export const AdminToastContext = createContext(null)

export function useAdminToast() {
  return useContext(AdminToastContext)
}

/**
 * Layout principal de l'administration avec sidebar fixe et contenu scrollable.
 * Fournit le contexte des toasts a toutes les pages admin enfants.
 */
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { toasts, addToast, removeToast } = useToast()

  return (
    <AdminToastContext.Provider value={addToast}>
      <div
        className="flex h-screen overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at top left, color-mix(in srgb, var(--color-accent-glow) 16%, transparent), transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--color-bg-primary) 94%, transparent), color-mix(in srgb, var(--color-bg-secondary) 96%, transparent))',
        }}
      >
        {/* Sidebar fixe sur desktop */}
        <div className="hidden lg:flex flex-shrink-0 p-3">
          <AdminSidebar />
        </div>

        {/* Tiroir sidebar sur mobile */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            {/* Contenu sidebar */}
            <div className="relative z-10 p-3">
              <AdminSidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Zone principale */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at top right, color-mix(in srgb, var(--color-accent-glow) 10%, transparent), transparent 30%)',
            }}
            aria-hidden="true"
          />
          <AdminNavbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
          <main className="relative flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6 lg:px-8 lg:pt-6">
            <Outlet />
          </main>
        </div>

        {/* Conteneur des notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </AdminToastContext.Provider>
  )
}
