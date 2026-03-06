import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ImageUploader from '../../components/ui/ImageUploader.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAdminSettings, updateSettings } from '../../services/settingService.js'
import {
  DEFAULT_THEME_SETTINGS,
  FONT_FAMILY_OPTIONS,
  mergeWithThemeDefaults,
} from '../../utils/themeSettings.js'

const TABS = [
  { id: 'identity', label: 'Identite' },
  { id: 'social', label: 'Reseaux sociaux' },
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

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const DARK_COLOR_FIELDS = [
  { key: 'theme_dark_bg_primary', label: 'Fond principal (sombre)' },
  { key: 'theme_dark_bg_secondary', label: 'Fond secondaire (sombre)' },
  { key: 'theme_dark_bg_card', label: 'Fond cartes (sombre)' },
  { key: 'theme_dark_accent', label: 'Accent principal (sombre)' },
  { key: 'theme_dark_accent_light', label: 'Accent secondaire (sombre)' },
  { key: 'theme_dark_text_primary', label: 'Texte principal (sombre)' },
  { key: 'theme_dark_text_secondary', label: 'Texte secondaire (sombre)' },
  { key: 'theme_dark_border', label: 'Bordures (sombre)' },
]

const LIGHT_COLOR_FIELDS = [
  { key: 'theme_light_bg_primary', label: 'Fond principal (clair)' },
  { key: 'theme_light_bg_secondary', label: 'Fond secondaire (clair)' },
  { key: 'theme_light_bg_card', label: 'Fond cartes (clair)' },
  { key: 'theme_light_accent', label: 'Accent principal (clair)' },
  { key: 'theme_light_accent_light', label: 'Accent secondaire (clair)' },
  { key: 'theme_light_text_primary', label: 'Texte principal (clair)' },
  { key: 'theme_light_text_secondary', label: 'Texte secondaire (clair)' },
  { key: 'theme_light_border', label: 'Bordures (clair)' },
]

function normalizeColor(rawValue, fallback) {
  if (typeof rawValue !== 'string') {
    return fallback
  }

  const value = rawValue.trim()
  if (HEX_COLOR_REGEX.test(value)) {
    return value
  }
  return fallback
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
      {children}
    </h3>
  )
}

function FieldInput({
  label,
  fieldKey,
  settings,
  onChange,
  textarea = false,
  type = 'text',
  placeholder = '',
}) {
  const commonProps = {
    value: settings[fieldKey] ?? '',
    onChange: (e) => onChange(fieldKey, e.target.value),
    className: 'w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]',
    style: inputStyle,
    placeholder,
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      {textarea ? (
        <textarea
          {...commonProps}
          rows={4}
          className={`${commonProps.className} resize-none`}
        />
      ) : (
        <input
          {...commonProps}
          type={type}
        />
      )}
    </div>
  )
}

function FieldSelect({ label, fieldKey, settings, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      <select
        value={settings[fieldKey] ?? ''}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        style={inputStyle}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function FieldRange({
  label,
  fieldKey,
  settings,
  onChange,
  min,
  max,
  step,
  unit = '',
  defaultValue,
}) {
  const value = Number(settings[fieldKey] ?? defaultValue)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </label>
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {Number.isFinite(value) ? `${value}${unit}` : `${defaultValue}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : defaultValue}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="w-full"
        style={{ accentColor: 'var(--color-accent)' }}
      />
    </div>
  )
}

function FieldColor({ label, fieldKey, settings, onChange }) {
  const fallback = DEFAULT_THEME_SETTINGS[fieldKey] || '#000000'
  const colorValue = normalizeColor(settings[fieldKey], fallback)

  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={colorValue}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="h-10 w-14 rounded border cursor-pointer"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'transparent' }}
        />
        <input
          type="text"
          value={settings[fieldKey] ?? fallback}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          onBlur={(e) => onChange(fieldKey, normalizeColor(e.target.value, fallback))}
          className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={inputStyle}
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

function FieldCheckbox({ label, fieldKey, settings, onChange }) {
  const checked = settings[fieldKey] === true || settings[fieldKey] === 'true'

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(fieldKey, String(e.target.checked))}
        style={{ accentColor: 'var(--color-accent)' }}
      />
      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
    </label>
  )
}

function CardSection({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl border p-4 space-y-4 ${className}`}
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {children}
    </div>
  )
}

export default function AdminSettings() {
  const addToast = useAdminToast()
  const { updateLocalSettings } = useSettings()
  const [settings, setSettings] = useState(() => mergeWithThemeDefaults({}))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('identity')

  const styleKeys = useMemo(() => Object.keys(DEFAULT_THEME_SETTINGS), [])

  useEffect(() => {
    getAdminSettings()
      .then((res) => {
        const nextSettings = mergeWithThemeDefaults(res?.data || {})
        setSettings(nextSettings)
        updateLocalSettings(nextSettings)
      })
      .catch(() => addToast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }, [addToast, updateLocalSettings])

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetAppearance = () => {
    setSettings((prev) => {
      const next = { ...prev }
      styleKeys.forEach((key) => {
        next[key] = DEFAULT_THEME_SETTINGS[key]
      })
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSettings(settings)
      updateLocalSettings(settings)
      addToast('Parametres enregistres.', 'success')
    } catch {
      addToast("Erreur lors de l'enregistrement.", 'error')
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
        <title>Parametres - Administration</title>
      </Helmet>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Parametres
          </h1>

          <div className="flex items-center gap-2">
            {activeTab === 'appearance' && (
              <button
                onClick={handleResetAppearance}
                className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Reinitialiser le style
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
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

        <div className="space-y-5 max-w-5xl">
          {activeTab === 'identity' && (
            <CardSection className="max-w-2xl">
              <FieldInput label="Nom du site" fieldKey="site_name" settings={settings} onChange={handleChange} />
              <FieldInput label="URL du site" fieldKey="site_url" settings={settings} onChange={handleChange} type="url" />
              <FieldInput label="Accroche" fieldKey="tagline" settings={settings} onChange={handleChange} />
              <FieldInput label="Nom hero" fieldKey="hero_name" settings={settings} onChange={handleChange} />
              <FieldInput label="Titre hero" fieldKey="hero_title" settings={settings} onChange={handleChange} />
              <FieldInput label="Hero bio" fieldKey="hero_bio" settings={settings} onChange={handleChange} textarea />
              <FieldInput label="Bio" fieldKey="bio" settings={settings} onChange={handleChange} textarea />

              <ImageUploader
                label="Avatar"
                value={settings.avatar_url || ''}
                onUpload={(url) => handleChange('avatar_url', url)}
              />
              <ImageUploader
                label="Logo"
                value={settings.logo_url || ''}
                onUpload={(url) => handleChange('logo_url', url)}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldInput label="Stat 1 - valeur" fieldKey="stat_1_value" settings={settings} onChange={handleChange} />
                <FieldInput label="Stat 1 - libelle" fieldKey="stat_1_label" settings={settings} onChange={handleChange} />
                <FieldInput label="Stat 2 - valeur" fieldKey="stat_2_value" settings={settings} onChange={handleChange} />
                <FieldInput label="Stat 2 - libelle" fieldKey="stat_2_label" settings={settings} onChange={handleChange} />
                <FieldInput label="Stat 3 - valeur" fieldKey="stat_3_value" settings={settings} onChange={handleChange} />
                <FieldInput label="Stat 3 - libelle" fieldKey="stat_3_label" settings={settings} onChange={handleChange} />
              </div>
            </CardSection>
          )}

          {activeTab === 'social' && (
            <CardSection className="max-w-2xl">
              <FieldInput label="GitHub" fieldKey="github_url" settings={settings} onChange={handleChange} type="url" />
              <FieldInput label="LinkedIn" fieldKey="linkedin_url" settings={settings} onChange={handleChange} type="url" />
              <FieldInput label="Twitter/X" fieldKey="twitter_url" settings={settings} onChange={handleChange} type="url" />
              <FieldInput label="YouTube" fieldKey="youtube_url" settings={settings} onChange={handleChange} type="url" />
              <FieldInput label="Instagram" fieldKey="instagram_url" settings={settings} onChange={handleChange} type="url" />
            </CardSection>
          )}

          {activeTab === 'contact' && (
            <CardSection className="max-w-2xl">
              <FieldInput label="Email de contact" fieldKey="contact_email" settings={settings} onChange={handleChange} type="email" />
              <FieldInput label="Localisation" fieldKey="contact_location" settings={settings} onChange={handleChange} />
              <FieldInput label="Disponibilite" fieldKey="contact_availability" settings={settings} onChange={handleChange} />
            </CardSection>
          )}

          {activeTab === 'seo' && (
            <CardSection className="max-w-2xl">
              <FieldInput label="Titre SEO" fieldKey="seo_title" settings={settings} onChange={handleChange} />
              <FieldInput label="Description SEO" fieldKey="seo_description" settings={settings} onChange={handleChange} textarea />
              <FieldInput label="Mots-cles SEO" fieldKey="seo_keywords" settings={settings} onChange={handleChange} />
              <ImageUploader
                label="Image OG"
                value={settings.og_image_url || ''}
                onUpload={(url) => handleChange('og_image_url', url)}
              />
            </CardSection>
          )}

          {activeTab === 'appearance' && (
            <>
              <CardSection className="max-w-2xl">
                <SectionTitle>Contenu</SectionTitle>
                <FieldInput label="Texte du footer" fieldKey="footer_text" settings={settings} onChange={handleChange} />
                <FieldInput label="Credits du footer" fieldKey="footer_credits" settings={settings} onChange={handleChange} />
                <FieldCheckbox label="Mode maintenance" fieldKey="maintenance_mode" settings={settings} onChange={handleChange} />
              </CardSection>

              <CardSection>
                <SectionTitle>Palette Sombre</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DARK_COLOR_FIELDS.map((field) => (
                    <FieldColor
                      key={field.key}
                      label={field.label}
                      fieldKey={field.key}
                      settings={settings}
                      onChange={handleChange}
                    />
                  ))}
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Palette Claire</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LIGHT_COLOR_FIELDS.map((field) => (
                    <FieldColor
                      key={field.key}
                      label={field.label}
                      fieldKey={field.key}
                      settings={settings}
                      onChange={handleChange}
                    />
                  ))}
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Typographie</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldSelect
                    label="Police principale"
                    fieldKey="ui_font_body"
                    settings={settings}
                    onChange={handleChange}
                    options={FONT_FAMILY_OPTIONS}
                  />
                  <FieldSelect
                    label="Police titres"
                    fieldKey="ui_font_heading"
                    settings={settings}
                    onChange={handleChange}
                    options={FONT_FAMILY_OPTIONS}
                  />
                  <FieldSelect
                    label="Police code/mono"
                    fieldKey="ui_font_mono"
                    settings={settings}
                    onChange={handleChange}
                    options={FONT_FAMILY_OPTIONS}
                  />
                  <FieldRange
                    label="Echelle de texte"
                    fieldKey="ui_font_scale"
                    settings={settings}
                    onChange={handleChange}
                    min={0.9}
                    max={1.2}
                    step={0.01}
                    unit="x"
                    defaultValue={1}
                  />
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Effets UI</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldRange
                    label="Rayon global"
                    fieldKey="ui_radius_base"
                    settings={settings}
                    onChange={handleChange}
                    min={4}
                    max={24}
                    step={1}
                    unit="px"
                    defaultValue={12}
                  />
                  <FieldRange
                    label="Intensite glow accent"
                    fieldKey="ui_glow_strength"
                    settings={settings}
                    onChange={handleChange}
                    min={0.3}
                    max={2}
                    step={0.05}
                    unit="x"
                    defaultValue={1}
                  />
                  <FieldRange
                    label="Vitesse transitions"
                    fieldKey="ui_transition_speed"
                    settings={settings}
                    onChange={handleChange}
                    min={100}
                    max={800}
                    step={25}
                    unit="ms"
                    defaultValue={300}
                  />
                  <FieldRange
                    label="Blur hero"
                    fieldKey="ui_hero_blur"
                    settings={settings}
                    onChange={handleChange}
                    min={30}
                    max={140}
                    step={1}
                    unit="px"
                    defaultValue={80}
                  />
                  <FieldRange
                    label="Vitesse animation hero"
                    fieldKey="ui_hero_speed_factor"
                    settings={settings}
                    onChange={handleChange}
                    min={0.5}
                    max={2}
                    step={0.05}
                    unit="x"
                    defaultValue={1}
                  />
                  <FieldRange
                    label="Blur navbar"
                    fieldKey="ui_navbar_blur"
                    settings={settings}
                    onChange={handleChange}
                    min={0}
                    max={24}
                    step={1}
                    unit="px"
                    defaultValue={12}
                  />
                  <FieldRange
                    label="Transparence navbar"
                    fieldKey="ui_navbar_opacity"
                    settings={settings}
                    onChange={handleChange}
                    min={0.45}
                    max={0.95}
                    step={0.01}
                    defaultValue={0.7}
                  />
                  <FieldRange
                    label="Transparence navbar scroll"
                    fieldKey="ui_navbar_opacity_scrolled"
                    settings={settings}
                    onChange={handleChange}
                    min={0.6}
                    max={1}
                    step={0.01}
                    defaultValue={0.95}
                  />
                </div>
              </CardSection>
            </>
          )}

          {activeTab === 'newsletter' && (
            <CardSection className="max-w-2xl">
              <FieldInput label="Nom de l'expediteur" fieldKey="newsletter_from_name" settings={settings} onChange={handleChange} />
              <FieldInput label="Email de l'expediteur" fieldKey="newsletter_from_email" settings={settings} onChange={handleChange} type="email" />
              <FieldInput
                label="Texte du pied de campagne"
                fieldKey="newsletter_footer_text"
                settings={settings}
                onChange={handleChange}
                textarea
              />
            </CardSection>
          )}
        </div>
      </div>
    </>
  )
}
