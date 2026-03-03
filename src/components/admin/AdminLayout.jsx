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
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {/* Sidebar fixe sur desktop */}
        <div className="hidden lg:flex flex-shrink-0">
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
            <div className="relative z-10">
              <AdminSidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Zone principale */}
        <div className="flex flex-col flex-1 min-w-0">
          <AdminNavbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>

        {/* Conteneur des notifications */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </AdminToastContext.Provider>
  )
}
