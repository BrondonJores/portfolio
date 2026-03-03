/* Hook d'acces au contexte d'authentification */
import { useAuthContext } from '../context/AuthContext.jsx'

/* Retourne le contexte d'authentification */
export function useAuth() {
  return useAuthContext()
}
