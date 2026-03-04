/* Page de parametres admin */
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ImageUploader from '../../components/ui/ImageUploader.jsx'
import { getAdminSettings, updateSettings } from '../../services/settingService.js'

/* Definition des onglets et de leurs champs */
const TABS = [
  { id: 'identity', label: 'Identité' },
  { id: 'social', label: 'Réseaux sociaux' },
  { id: 'contact', label: 'Contact' },
  { id: 'seo', label: 'SEO' },
  { id: 'appearance', label: 'Apparence' },
  { id: 'newsletter', label: 'Newsletter' },
]

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

function FieldInput({ label, fieldKey, settings, onChange, textarea }) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </label>
      {textarea ? (
        <textarea
          value={settings[fieldKey] || ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          rows={4}
          className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
          style={inputStyle}
        />
      ) : (
        <input
          type="text"
          value={settings[fieldKey] || ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={inputStyle}
        />
      )}
    </div>
  )
}

export default function AdminSettings() {
  const addToast = useAdminToast()
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('identity')

  useEffect(() => {
    getAdminSettings()
      .then((res) => setSettings(res?.data || {}))
      .catch(() => addToast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings(settings)
      addToast('Paramètres enregistrés.', 'success')
    } catch {
      addToast('Erreur lors de l\'enregistrement.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>Paramètres - Administration</title>
      </Helmet>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Paramètres
          </h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>

        {/* Onglets */}
        <div
          className="flex flex-wrap gap-1 mb-6 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 text-sm font-medium transition-colors focus:outline-none"
              style={{
                color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu de l'onglet */}
        <div className="space-y-5 max-w-2xl">
          {activeTab === 'identity' && (
            <>
              <FieldInput label="Nom du site" fieldKey="site_name" settings={settings} onChange={handleChange} />
              <FieldInput label="Url du site" fieldKey="site_url" settings={settings} onChange={handleChange} />
              <FieldInput label="Accroche" fieldKey="tagline" settings={settings} onChange={handleChange} />
              <FieldInput label="Nom hero" fieldKey="hero_name" settings={settings} onChange={handleChange} />
              <FieldInput label="Titre hero" fieldKey="hero_title" settings={settings} onChange={handleChange} />
              <FieldInput label="Hero bio" fieldKey="hero_bio" settings={settings} onChange={handleChange} textarea />
              <FieldInput label="Bio" fieldKey="bio" settings={settings} onChange={handleChange} textarea />
              <ImageUploader
                label="Avatar"
                value={settings['avatar_url'] || ''}
                onUpload={(url) => handleChange('avatar_url', url)}
              />
              <ImageUploader
                label="Logo"
                value={settings['logo_url'] || ''}
                onUpload={(url) => handleChange('logo_url', url)}
              />
              <div className="grid grid-cols-2 gap-4">
                <FieldInput label="Stat 1 — valeur" fieldKey="stat_1_value" settings={settings} onChange={handleChange} />
                <FieldInput label="Stat 1 — libellé" fieldKey="stat_1_label" settings={settings} onChange={handleChange} />
                <FieldInput label="Stat 2 — valeur" fieldKey="stat_2_value" settings={settings} onChange={handleChange} />
                <FieldInput label="Stat 2 — libellé" fieldKey="stat_2_label" settings={settings} onChange={handleChange} />
                <FieldInput label="Stat 3 — valeur" fieldKey="stat_3_value" settings={settings} onChange={handleChange} />
                <FieldInput label="Stat 3 — libellé" fieldKey="stat_3_label" settings={settings} onChange={handleChange} />
              </div>
            </>
          )}

          {activeTab === 'social' && (
            <>
              <FieldInput label="GitHub" fieldKey="github_url" settings={settings} onChange={handleChange} />
              <FieldInput label="LinkedIn" fieldKey="linkedin_url" settings={settings} onChange={handleChange} />
              <FieldInput label="Twitter/X" fieldKey="twitter_url" settings={settings} onChange={handleChange} />
              <FieldInput label="YouTube" fieldKey="youtube_url" settings={settings} onChange={handleChange} />
              <FieldInput label="Instagram" fieldKey="instagram_url" settings={settings} onChange={handleChange} />
            </>
          )}

          {activeTab === 'contact' && (
            <>
              <FieldInput label="Email de contact" fieldKey="contact_email" settings={settings} onChange={handleChange} />
              <FieldInput label="Localisation" fieldKey="contact_location" settings={settings} onChange={handleChange} />
              <FieldInput label="Disponibilité" fieldKey="contact_availability" settings={settings} onChange={handleChange} />
            </>
          )}

          {activeTab === 'seo' && (
            <>
              <FieldInput label="Titre SEO" fieldKey="seo_title" settings={settings} onChange={handleChange} />
              <FieldInput label="Description SEO" fieldKey="seo_description" settings={settings} onChange={handleChange} textarea />
              <FieldInput label="Mots-clés SEO" fieldKey="seo_keywords" settings={settings} onChange={handleChange} />
              <ImageUploader
                label="Image OG"
                value={settings['og_image_url'] || ''}
                onUpload={(url) => handleChange('og_image_url', url)}
              />
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <FieldInput label="Texte du footer" fieldKey="footer_text" settings={settings} onChange={handleChange} />
              <FieldInput label="Crédits du footer" fieldKey="footer_credits" settings={settings} onChange={handleChange} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings['maintenance_mode'] === 'true' || settings['maintenance_mode'] === true}
                  onChange={(e) => handleChange('maintenance_mode', String(e.target.checked))}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Mode maintenance
                </span>
              </label>
            </>
          )}

          {activeTab === 'newsletter' && (
            <>
              <FieldInput label="Nom de l'expediteur" fieldKey="newsletter_from_name" settings={settings} onChange={handleChange} />
              <FieldInput label="Email de l'expediteur" fieldKey="newsletter_from_email" settings={settings} onChange={handleChange} />
              <FieldInput label="Texte du pied de campagne" fieldKey="newsletter_footer_text" settings={settings} onChange={handleChange} textarea />
            </>
          )}
        </div>
      </div>
    </>
  )
}
