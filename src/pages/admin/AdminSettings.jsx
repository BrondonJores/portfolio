import { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ImageUploader from '../../components/ui/ImageUploader.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getAdminSettings, updateSettings } from '../../services/settingService.js'
import {
  createTwoFactorSetup,
  disableTwoFactor,
  enableTwoFactor,
  getTwoFactorStatus,
  regenerateTwoFactorRecoveryCodes,
} from '../../services/authService.js'
import QRCode from 'qrcode'
import {
  DEFAULT_THEME_SETTINGS,
  FONT_FAMILY_OPTIONS,
  mergeWithThemeDefaults,
} from '../../utils/themeSettings.js'
import {
  ANIMATION_EASE_OPTIONS,
  ANIMATION_PROFILE_OPTIONS,
  MASCOT_STYLE_OPTIONS,
  REDUCE_MOTION_OPTIONS,
  SPRITE_PATH_OPTIONS,
  SPRITE_SIDE_PATTERN_OPTIONS,
  SPRITE_STYLE_OPTIONS,
  SECTION_REVEAL_OPTIONS,
} from '../../utils/animationSettings.js'

const TABS = [
  { id: 'identity', label: 'Identite' },
  { id: 'social', label: 'Reseaux sociaux' },
  { id: 'contact', label: 'Contact' },
  { id: 'seo', label: 'SEO' },
  { id: 'appearance', label: 'Apparence' },
  { id: 'animations', label: 'Animations' },
  { id: 'security', label: 'Securite' },
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

function normalizeTwoFactorStatus(raw) {
  const count = Number(raw?.recoveryCodesCount)
  const recoveryCodesCount = Number.isInteger(count) && count >= 0 ? count : 0

  return {
    enabled: raw?.enabled === true,
    hasRecoveryCodes: raw?.hasRecoveryCodes === true || recoveryCodesCount > 0,
    recoveryCodesCount,
  }
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

function InlineTip({ children }) {
  return (
    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
      {children}
    </p>
  )
}

export default function AdminSettings() {
  const addToast = useAdminToast()
  const { updateLocalSettings } = useSettings()
  const [settings, setSettings] = useState(() => mergeWithThemeDefaults({}))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('identity')
  const [twoFactorBusy, setTwoFactorBusy] = useState(false)
  const [twoFactorStatus, setTwoFactorStatus] = useState(() =>
    normalizeTwoFactorStatus({ enabled: false, hasRecoveryCodes: false, recoveryCodesCount: 0 })
  )
  const [twoFactorSetup, setTwoFactorSetup] = useState(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorDisableTotp, setTwoFactorDisableTotp] = useState('')
  const [twoFactorDisableRecoveryCode, setTwoFactorDisableRecoveryCode] = useState('')
  const [twoFactorRegenerateCode, setTwoFactorRegenerateCode] = useState('')
  const [freshRecoveryCodes, setFreshRecoveryCodes] = useState([])
  const [twoFactorQrCodeUrl, setTwoFactorQrCodeUrl] = useState('')
  const [twoFactorQrLoading, setTwoFactorQrLoading] = useState(false)

  const styleKeys = useMemo(() => Object.keys(DEFAULT_THEME_SETTINGS), [])

  const loadTwoFactorStatus = useCallback(async () => {
    setTwoFactorBusy(true)
    try {
      const response = await getTwoFactorStatus()
      setTwoFactorStatus(normalizeTwoFactorStatus(response?.data || {}))
    } catch {
      addToast('Erreur lors du chargement du statut 2FA.', 'error')
    } finally {
      setTwoFactorBusy(false)
    }
  }, [addToast])

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

  useEffect(() => {
    loadTwoFactorStatus()
  }, [loadTwoFactorStatus])

  useEffect(() => {
    const otpauthUrl = String(twoFactorSetup?.otpauthUrl || '').trim()
    if (!otpauthUrl) {
      setTwoFactorQrCodeUrl('')
      setTwoFactorQrLoading(false)
      return
    }

    let cancelled = false
    setTwoFactorQrLoading(true)

    QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#0000',
      },
    })
      .then((dataUrl) => {
        if (cancelled) return
        setTwoFactorQrCodeUrl(dataUrl)
      })
      .catch(() => {
        if (cancelled) return
        setTwoFactorQrCodeUrl('')
      })
      .finally(() => {
        if (cancelled) return
        setTwoFactorQrLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [twoFactorSetup?.otpauthUrl])

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    updateLocalSettings({ [key]: value })
  }

  const handleResetAppearance = () => {
    const next = { ...settings }
    styleKeys.forEach((key) => {
      next[key] = DEFAULT_THEME_SETTINGS[key]
    })
    setSettings(next)
    updateLocalSettings(next)
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

  const handleStartTwoFactorSetup = async () => {
    setTwoFactorBusy(true)
    try {
      const response = await createTwoFactorSetup()
      setTwoFactorSetup(response?.data || null)
      setTwoFactorCode('')
      addToast('Configuration 2FA generee. Scanne le QR ou copie le secret.', 'success')
    } catch {
      addToast('Impossible de demarrer la configuration 2FA.', 'error')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  const handleEnableTwoFactor = async () => {
    if (!twoFactorSetup?.setupToken || !twoFactorCode.trim()) {
      addToast('Code TOTP requis pour activer le 2FA.', 'error')
      return
    }

    setTwoFactorBusy(true)
    try {
      const response = await enableTwoFactor({
        setupToken: twoFactorSetup.setupToken,
        totpCode: twoFactorCode,
      })
      setFreshRecoveryCodes(Array.isArray(response?.data?.recoveryCodes) ? response.data.recoveryCodes : [])
      setTwoFactorSetup(null)
      setTwoFactorCode('')
      setTwoFactorDisableTotp('')
      setTwoFactorDisableRecoveryCode('')
      await loadTwoFactorStatus()
      addToast('2FA active avec succes.', 'success')
    } catch {
      addToast('Activation 2FA refusee. Verifie le code Authenticator.', 'error')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  const handleDisableTwoFactor = async () => {
    if (!twoFactorDisableTotp.trim() && !twoFactorDisableRecoveryCode.trim()) {
      addToast('Renseigne un code TOTP ou un recovery code.', 'error')
      return
    }

    setTwoFactorBusy(true)
    try {
      await disableTwoFactor({
        totpCode: twoFactorDisableTotp,
        recoveryCode: twoFactorDisableRecoveryCode,
      })
      setTwoFactorSetup(null)
      setTwoFactorCode('')
      setTwoFactorDisableTotp('')
      setTwoFactorDisableRecoveryCode('')
      setTwoFactorRegenerateCode('')
      setFreshRecoveryCodes([])
      await loadTwoFactorStatus()
      addToast('2FA desactive.', 'success')
    } catch {
      addToast('Impossible de desactiver le 2FA avec ce code.', 'error')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  const handleRegenerateRecoveryCodes = async () => {
    if (!twoFactorRegenerateCode.trim()) {
      addToast('Code TOTP requis pour regenarer les recovery codes.', 'error')
      return
    }

    setTwoFactorBusy(true)
    try {
      const response = await regenerateTwoFactorRecoveryCodes({
        totpCode: twoFactorRegenerateCode,
      })
      setFreshRecoveryCodes(Array.isArray(response?.data?.recoveryCodes) ? response.data.recoveryCodes : [])
      setTwoFactorRegenerateCode('')
      await loadTwoFactorStatus()
      addToast('Nouveaux recovery codes generes.', 'success')
    } catch {
      addToast('Impossible de regenarer les recovery codes.', 'error')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  const handleCopy = async (text, successMessage) => {
    if (!text) {
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      addToast(successMessage, 'success')
    } catch {
      addToast('Copie impossible depuis ce navigateur.', 'error')
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
            {(activeTab === 'appearance' || activeTab === 'animations') && (
              <button
                onClick={handleResetAppearance}
                className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {activeTab === 'appearance' ? 'Reinitialiser le style' : 'Reinitialiser les animations'}
              </button>
            )}
            {activeTab !== 'security' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            )}
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
              <FieldInput label="Hero photo - statut" fieldKey="hero_photo_status" settings={settings} onChange={handleChange} />
              <FieldInput label="Hero photo - stack" fieldKey="hero_photo_stack" settings={settings} onChange={handleChange} />
              <FieldInput label="Hero photo - texte alternatif" fieldKey="hero_photo_alt" settings={settings} onChange={handleChange} />
              <FieldInput
                label="Hero photo - cadrage (object-position)"
                fieldKey="hero_photo_object_position"
                settings={settings}
                onChange={handleChange}
                placeholder="50% 30%"
              />
              <InlineTip>Format conseille: 50% 30% (x horizontal, y vertical).</InlineTip>
              <FieldInput label="About photo - badge" fieldKey="about_photo_badge" settings={settings} onChange={handleChange} />
              <FieldInput label="About photo - legende" fieldKey="about_photo_caption" settings={settings} onChange={handleChange} textarea />

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

          {activeTab === 'animations' && (
            <>
              <CardSection>
                <SectionTitle>Moteur Global</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCheckbox label="Activer les animations" fieldKey="anim_enabled" settings={settings} onChange={handleChange} />
                  <FieldCheckbox label="Reveler chaque section une seule fois" fieldKey="anim_section_once" settings={settings} onChange={handleChange} />
                  <FieldSelect
                    label="Profil"
                    fieldKey="anim_profile"
                    settings={settings}
                    onChange={handleChange}
                    options={ANIMATION_PROFILE_OPTIONS}
                  />
                  <FieldSelect
                    label="Easing principal"
                    fieldKey="anim_ease_preset"
                    settings={settings}
                    onChange={handleChange}
                    options={ANIMATION_EASE_OPTIONS}
                  />
                  <FieldSelect
                    label="Gestion reduce-motion"
                    fieldKey="anim_reduce_motion_mode"
                    settings={settings}
                    onChange={handleChange}
                    options={REDUCE_MOTION_OPTIONS}
                  />
                  <FieldSelect
                    label="Reveal de section"
                    fieldKey="anim_section_reveal_type"
                    settings={settings}
                    onChange={handleChange}
                    options={SECTION_REVEAL_OPTIONS}
                  />
                  <FieldRange
                    label="Echelle des durees"
                    fieldKey="anim_duration_scale"
                    settings={settings}
                    onChange={handleChange}
                    min={0.6}
                    max={2}
                    step={0.05}
                    unit="x"
                    defaultValue={1}
                  />
                  <FieldRange
                    label="Intensite globale"
                    fieldKey="anim_intensity"
                    settings={settings}
                    onChange={handleChange}
                    min={0.4}
                    max={2.5}
                    step={0.05}
                    unit="x"
                    defaultValue={1}
                  />
                  <FieldRange
                    label="Duree reveal section"
                    fieldKey="anim_section_duration_ms"
                    settings={settings}
                    onChange={handleChange}
                    min={200}
                    max={1600}
                    step={25}
                    unit="ms"
                    defaultValue={650}
                  />
                  <FieldRange
                    label="Distance reveal section"
                    fieldKey="anim_section_distance_px"
                    settings={settings}
                    onChange={handleChange}
                    min={0}
                    max={120}
                    step={1}
                    unit="px"
                    defaultValue={36}
                  />
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Mascottes Animees (Petits Bonhommes)</SectionTitle>
                <InlineTip>
                  Ces mascottes apparaissent dans les sections clefs et flottent selon ton style.
                </InlineTip>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCheckbox label="Activer les mascottes" fieldKey="anim_mascots_enabled" settings={settings} onChange={handleChange} />
                  <FieldSelect
                    label="Style de mascotte"
                    fieldKey="anim_mascot_style"
                    settings={settings}
                    onChange={handleChange}
                    options={MASCOT_STYLE_OPTIONS}
                  />
                  <FieldRange
                    label="Nombre de mascottes"
                    fieldKey="anim_mascot_count"
                    settings={settings}
                    onChange={handleChange}
                    min={0}
                    max={8}
                    step={1}
                    defaultValue={4}
                  />
                  <FieldRange
                    label="Taille des mascottes"
                    fieldKey="anim_mascot_size"
                    settings={settings}
                    onChange={handleChange}
                    min={56}
                    max={180}
                    step={1}
                    unit="px"
                    defaultValue={96}
                  />
                  <FieldRange
                    label="Vitesse des mascottes"
                    fieldKey="anim_mascot_speed"
                    settings={settings}
                    onChange={handleChange}
                    min={0.5}
                    max={2.5}
                    step={0.05}
                    unit="x"
                    defaultValue={1}
                  />
                  <FieldRange
                    label="Opacite mascottes"
                    fieldKey="anim_mascot_opacity"
                    settings={settings}
                    onChange={handleChange}
                    min={0.2}
                    max={1}
                    step={0.05}
                    defaultValue={0.85}
                  />
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Sprites SVG Dynamiques</SectionTitle>
                <InlineTip>
                  Active des petits bonhommes SVG: un sprite principal qui se balade + des sprites lateraux qui apparaissent puis disparaissent.
                </InlineTip>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCheckbox label="Sprite principal baladeur" fieldKey="anim_sprite_wander_enabled" settings={settings} onChange={handleChange} />
                  <FieldCheckbox label="Sprites lateraux apparition/disparition" fieldKey="anim_sprite_side_enabled" settings={settings} onChange={handleChange} />
                  <FieldSelect
                    label="Style sprite"
                    fieldKey="anim_sprite_style"
                    settings={settings}
                    onChange={handleChange}
                    options={SPRITE_STYLE_OPTIONS}
                  />
                  <FieldSelect
                    label="Trajet du sprite principal"
                    fieldKey="anim_sprite_path"
                    settings={settings}
                    onChange={handleChange}
                    options={SPRITE_PATH_OPTIONS}
                  />
                  <FieldSelect
                    label="Pattern des sprites lateraux"
                    fieldKey="anim_sprite_side_pattern"
                    settings={settings}
                    onChange={handleChange}
                    options={SPRITE_SIDE_PATTERN_OPTIONS}
                  />
                  <FieldCheckbox
                    label="Orientation automatique gauche/droite"
                    fieldKey="anim_sprite_flip_enabled"
                    settings={settings}
                    onChange={handleChange}
                  />
                  <FieldRange
                    label="Taille sprite principal"
                    fieldKey="anim_sprite_wander_size"
                    settings={settings}
                    onChange={handleChange}
                    min={36}
                    max={140}
                    step={1}
                    unit="px"
                    defaultValue={74}
                  />
                  <FieldRange
                    label="Vitesse sprite principal"
                    fieldKey="anim_sprite_wander_speed"
                    settings={settings}
                    onChange={handleChange}
                    min={0.4}
                    max={2.6}
                    step={0.05}
                    unit="x"
                    defaultValue={1}
                  />
                  <FieldRange
                    label="Opacite sprite principal"
                    fieldKey="anim_sprite_wander_opacity"
                    settings={settings}
                    onChange={handleChange}
                    min={0.2}
                    max={1}
                    step={0.05}
                    defaultValue={0.88}
                  />
                  <FieldRange
                    label="Amplitude de rebond"
                    fieldKey="anim_sprite_bounce_px"
                    settings={settings}
                    onChange={handleChange}
                    min={0}
                    max={24}
                    step={1}
                    unit="px"
                    defaultValue={8}
                  />
                  <FieldRange
                    label="Inclinaison max du sprite"
                    fieldKey="anim_sprite_wander_rotation_deg"
                    settings={settings}
                    onChange={handleChange}
                    min={0}
                    max={24}
                    step={1}
                    unit="deg"
                    defaultValue={8}
                  />
                  <FieldRange
                    label="Nombre de sprites lateraux"
                    fieldKey="anim_sprite_side_count"
                    settings={settings}
                    onChange={handleChange}
                    min={1}
                    max={6}
                    step={1}
                    defaultValue={2}
                  />
                  <FieldRange
                    label="Taille sprites lateraux"
                    fieldKey="anim_sprite_side_size"
                    settings={settings}
                    onChange={handleChange}
                    min={36}
                    max={160}
                    step={1}
                    unit="px"
                    defaultValue={92}
                  />
                  <FieldRange
                    label="Frequence apparition laterale"
                    fieldKey="anim_sprite_side_frequency_ms"
                    settings={settings}
                    onChange={handleChange}
                    min={1400}
                    max={12000}
                    step={100}
                    unit="ms"
                    defaultValue={5200}
                  />
                  <FieldRange
                    label="Duree apparition laterale"
                    fieldKey="anim_sprite_side_duration_ms"
                    settings={settings}
                    onChange={handleChange}
                    min={700}
                    max={5000}
                    step={50}
                    unit="ms"
                    defaultValue={1700}
                  />
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Interactions et Effets</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCheckbox label="Hover anime sur les cartes" fieldKey="anim_card_hover" settings={settings} onChange={handleChange} />
                  <FieldCheckbox label="Pulse sur les CTA primaires" fieldKey="anim_cta_pulse" settings={settings} onChange={handleChange} />
                  <FieldCheckbox label="Barre de progression du scroll" fieldKey="anim_scroll_progress_enabled" settings={settings} onChange={handleChange} />
                  <FieldRange
                    label="Lift des cartes"
                    fieldKey="anim_card_lift_px"
                    settings={settings}
                    onChange={handleChange}
                    min={0}
                    max={24}
                    step={1}
                    unit="px"
                    defaultValue={8}
                  />
                  <FieldRange
                    label="Scale hover cartes"
                    fieldKey="anim_card_scale"
                    settings={settings}
                    onChange={handleChange}
                    min={1}
                    max={1.1}
                    step={0.005}
                    unit="x"
                    defaultValue={1.02}
                  />
                  <FieldRange
                    label="Tilt hover cartes"
                    fieldKey="anim_card_tilt_deg"
                    settings={settings}
                    onChange={handleChange}
                    min={0}
                    max={6}
                    step={0.1}
                    unit="deg"
                    defaultValue={1.5}
                  />
                  <FieldRange
                    label="Intervalle pulse CTA"
                    fieldKey="anim_cta_pulse_interval_ms"
                    settings={settings}
                    onChange={handleChange}
                    min={900}
                    max={4000}
                    step={50}
                    unit="ms"
                    defaultValue={1800}
                  />
                  <FieldRange
                    label="Epaisseur barre scroll"
                    fieldKey="anim_scroll_progress_thickness"
                    settings={settings}
                    onChange={handleChange}
                    min={2}
                    max={10}
                    step={1}
                    unit="px"
                    defaultValue={4}
                  />
                </div>
              </CardSection>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <CardSection className="max-w-3xl">
                <SectionTitle>Authentification 2 facteurs</SectionTitle>
                <InlineTip>
                  Le 2FA ajoute une verification Authenticator apres le mot de passe.
                </InlineTip>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: twoFactorStatus.enabled ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: twoFactorStatus.enabled ? '#4ade80' : '#f87171',
                    }}
                  >
                    {twoFactorStatus.enabled ? '2FA active' : '2FA inactive'}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Recovery codes restants: {twoFactorStatus.recoveryCodesCount}
                  </span>
                  <button
                    type="button"
                    onClick={loadTwoFactorStatus}
                    disabled={twoFactorBusy}
                    className="px-3 py-2 rounded-lg text-sm font-medium border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    Rafraichir
                  </button>
                </div>

                {twoFactorBusy && (
                  <div className="py-3">
                    <Spinner size="sm" />
                  </div>
                )}
              </CardSection>

              {!twoFactorStatus.enabled && (
                <CardSection className="max-w-3xl">
                  <SectionTitle>Activer le 2FA</SectionTitle>

                  {!twoFactorSetup && (
                    <div className="space-y-3">
                      <InlineTip>
                        Genere un secret, ajoute-le dans Google Authenticator (ou equivalent), puis confirme avec un code.
                      </InlineTip>
                      <button
                        type="button"
                        onClick={handleStartTwoFactorSetup}
                        disabled={twoFactorBusy}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                      >
                        Demarrer la configuration
                      </button>
                    </div>
                  )}

                  {twoFactorSetup && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                          QR code Authenticator
                        </label>
                        <div
                          className="rounded-lg border p-3 inline-flex"
                          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-primary)' }}
                        >
                          {twoFactorQrLoading ? (
                            <Spinner size="sm" />
                          ) : twoFactorQrCodeUrl ? (
                            <img
                              src={twoFactorQrCodeUrl}
                              alt="QR code 2FA"
                              className="h-52 w-52 rounded-md"
                            />
                          ) : (
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              QR indisponible. Utilise le secret manuel ci-dessous.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                          Secret manuel
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={twoFactorSetup.secret || ''}
                            className="flex-1 px-3 py-2 rounded-lg border text-sm"
                            style={inputStyle}
                          />
                          <button
                            type="button"
                            onClick={() => handleCopy(twoFactorSetup.secret, 'Secret copie.')}
                            className="px-3 py-2 rounded-lg text-sm font-medium border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                          >
                            Copier
                          </button>
                        </div>
                      </div>

                      {twoFactorSetup.otpauthUrl && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            Lien otpauth
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={twoFactorSetup.otpauthUrl}
                              className="flex-1 px-3 py-2 rounded-lg border text-sm"
                              style={inputStyle}
                            />
                            <button
                              type="button"
                              onClick={() => handleCopy(twoFactorSetup.otpauthUrl, 'Lien otpauth copie.')}
                              className="px-3 py-2 rounded-lg text-sm font-medium border"
                              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                            >
                              Copier
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label
                          className="block text-sm font-medium mb-1"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Code Authenticator (6 chiffres)
                        </label>
                        <input
                          type="text"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          inputMode="numeric"
                          maxLength={12}
                          className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          style={inputStyle}
                          placeholder="123456"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleEnableTwoFactor}
                          disabled={twoFactorBusy}
                          className="px-4 py-2.5 rounded-lg text-sm font-medium"
                          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                        >
                          Activer le 2FA
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTwoFactorSetup(null)
                            setTwoFactorCode('')
                          }}
                          disabled={twoFactorBusy}
                          className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </CardSection>
              )}

              {twoFactorStatus.enabled && (
                <>
                  <CardSection className="max-w-3xl">
                    <SectionTitle>Recovery Codes</SectionTitle>
                    <InlineTip>
                      Regenere tes recovery codes avec un code Authenticator. Les anciens seront invalides.
                    </InlineTip>

                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Code Authenticator pour regeneration
                      </label>
                      <input
                        type="text"
                        value={twoFactorRegenerateCode}
                        onChange={(e) => setTwoFactorRegenerateCode(e.target.value)}
                        inputMode="numeric"
                        maxLength={12}
                        className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={inputStyle}
                        placeholder="123456"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleRegenerateRecoveryCodes}
                      disabled={twoFactorBusy}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                    >
                      Regenerer les recovery codes
                    </button>
                  </CardSection>

                  <CardSection className="max-w-3xl">
                    <SectionTitle>Desactiver le 2FA</SectionTitle>
                    <InlineTip>
                      Pour desactiver, renseigne soit un code Authenticator, soit un recovery code.
                    </InlineTip>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          className="block text-sm font-medium mb-1"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Code Authenticator
                        </label>
                        <input
                          type="text"
                          value={twoFactorDisableTotp}
                          onChange={(e) => setTwoFactorDisableTotp(e.target.value)}
                          inputMode="numeric"
                          maxLength={12}
                          className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          style={inputStyle}
                          placeholder="123456"
                        />
                      </div>

                      <div>
                        <label
                          className="block text-sm font-medium mb-1"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Recovery code
                        </label>
                        <input
                          type="text"
                          value={twoFactorDisableRecoveryCode}
                          onChange={(e) => setTwoFactorDisableRecoveryCode(e.target.value)}
                          maxLength={32}
                          className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                          style={inputStyle}
                          placeholder="ABCDE-12345"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisableTwoFactor}
                      disabled={twoFactorBusy}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: '#dc2626', color: '#fff' }}
                    >
                      Desactiver le 2FA
                    </button>
                  </CardSection>
                </>
              )}

              {freshRecoveryCodes.length > 0 && (
                <CardSection className="max-w-3xl">
                  <SectionTitle>Nouveaux recovery codes</SectionTitle>
                  <InlineTip>
                    Copie-les maintenant. Ils ne seront plus affiches ensuite.
                  </InlineTip>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {freshRecoveryCodes.map((code) => (
                      <code
                        key={code}
                        className="px-3 py-2 rounded-lg border text-sm font-semibold"
                        style={{
                          borderColor: 'var(--color-border)',
                          backgroundColor: 'var(--color-bg-primary)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {code}
                      </code>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(freshRecoveryCodes.join('\n'), 'Recovery codes copies.')}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    Copier tous les codes
                  </button>
                </CardSection>
              )}
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
