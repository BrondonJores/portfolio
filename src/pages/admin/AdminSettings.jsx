import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ImageUploader from '../../components/ui/ImageUploader.jsx'
import MascotAssetUploader from '../../components/ui/MascotAssetUploader.jsx'
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
  ANIMATION_CORE_SETTING_KEYS,
  extractAnimationSettings,
  sanitizeImportedAnimationSettings,
} from '../../utils/animationSettings.js'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
  PaintBrushIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'

const SETTINGS_NAV_GROUPS = [
  {
    label: 'Pilotage',
    items: [
      {
        id: 'overview',
        label: 'Vue d ensemble',
        description: 'Statut global du site, securite et communication.',
        icon: HomeIcon,
      },
    ],
  },
  {
    label: 'Site public',
    items: [
      {
        id: 'identity',
        label: 'Identite',
        description: 'Nom du site, hero, avatar, logo et chiffres cles.',
        icon: UsersIcon,
      },
      {
        id: 'social',
        label: 'Reseaux sociaux',
        description: 'Liens vers tes plateformes et profils publics.',
        icon: Squares2X2Icon,
      },
      {
        id: 'contact',
        label: 'Contact',
        description: 'Email public, localisation et disponibilite.',
        icon: EnvelopeIcon,
      },
      {
        id: 'content',
        label: 'Contenus UI',
        description: 'Textes dynamiques, labels et messages systeme.',
        icon: DocumentTextIcon,
      },
      {
        id: 'seo',
        label: 'SEO',
        description: 'Meta title, description, OG image et mots cles.',
        icon: WrenchScrewdriverIcon,
      },
    ],
  },
  {
    label: 'Presentation',
    items: [
      {
        id: 'appearance',
        label: 'Apparence',
        description: 'Palette, typo et style visuel global.',
        icon: PaintBrushIcon,
      },
      {
        id: 'animations',
        label: 'Animations',
        description: 'Moteur motion, mascottes, sprites et presets.',
        icon: Squares2X2Icon,
      },
    ],
  },
  {
    label: 'Confiance',
    items: [
      {
        id: 'security',
        label: 'Securite',
        description: '2FA et protection du compte administrateur.',
        icon: ShieldExclamationIcon,
      },
      {
        id: 'newsletter',
        label: 'Newsletter',
        description: 'Expediteur, email et pied de campagne.',
        icon: NewspaperIcon,
      },
    ],
  },
]

const SETTINGS_NAV_ITEMS = SETTINGS_NAV_GROUPS.flatMap((group) => group.items)

const inputStyle = {
  backgroundColor: 'var(--color-bg-primary)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const MAX_ANIMATION_PRESET_FILE_BYTES = 512 * 1024
const ANIMATION_ASSET_MAPPING_KEYS = ANIMATION_CORE_SETTING_KEYS

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

const CONTENT_TAB_SECTIONS = [
  {
    title: 'Navigation',
    fields: [
      { key: 'ui_nav_label_home', label: 'Menu: Accueil' },
      { key: 'ui_nav_label_about', label: 'Menu: A propos' },
      { key: 'ui_nav_label_skills', label: 'Menu: Competences' },
      { key: 'ui_nav_label_projects', label: 'Menu: Projets' },
      { key: 'ui_nav_label_blog', label: 'Menu: Blog' },
      { key: 'ui_nav_label_contact', label: 'Menu: Contact' },
      { key: 'ui_nav_label_admin', label: 'Menu mobile: Administration' },
      { key: 'ui_nav_aria_main', label: 'ARIA: Navigation principale' },
      { key: 'ui_nav_aria_home', label: 'ARIA: Lien accueil logo' },
      { key: 'ui_nav_toggle_to_light', label: 'ARIA: Passer en mode clair' },
      { key: 'ui_nav_toggle_to_dark', label: 'ARIA: Passer en mode sombre' },
      { key: 'ui_nav_open_menu', label: 'ARIA: Ouvrir menu mobile' },
      { key: 'ui_nav_close_menu', label: 'ARIA: Fermer menu mobile' },
    ],
  },
  {
    title: 'Accueil',
    fields: [
      { key: 'ui_hero_cta_projects', label: 'Hero CTA: Projets' },
      { key: 'ui_hero_cta_contact', label: 'Hero CTA: Contact' },
      { key: 'ui_about_title', label: 'Section About: titre' },
      { key: 'ui_section_projects_title', label: 'Section Projets: titre' },
      { key: 'ui_section_projects_subtitle', label: 'Section Projets: sous-titre' },
      { key: 'ui_section_projects_view_all', label: 'Section Projets: lien voir tout' },
      { key: 'ui_section_skills_title', label: 'Section Competences: titre' },
      { key: 'ui_section_skills_subtitle', label: 'Section Competences: sous-titre' },
      { key: 'ui_section_skills_empty', label: 'Section Competences: vide' },
      { key: 'ui_section_blog_title', label: 'Section Blog: titre' },
      { key: 'ui_section_blog_subtitle', label: 'Section Blog: sous-titre' },
      { key: 'ui_section_blog_view_all', label: 'Section Blog: lien voir tout' },
      { key: 'ui_section_contact_title', label: 'Section Contact: titre' },
      { key: 'ui_section_contact_subtitle', label: 'Section Contact: sous-titre' },
      { key: 'ui_contact_intro', label: 'Section Contact: texte intro', textarea: true, fullWidth: true },
      { key: 'ui_project_badge_featured', label: 'Projet: badge mis en avant' },
      { key: 'ui_project_action_github', label: 'Projet: bouton GitHub' },
      { key: 'ui_project_action_demo', label: 'Projet: bouton Demo' },
      { key: 'ui_project_demo_unavailable', label: 'Projet: demo indisponible' },
    ],
  },
  {
    title: 'Formulaire Contact',
    fields: [
      { key: 'ui_contact_form_name_label', label: 'Form Contact: label Nom' },
      { key: 'ui_contact_form_email_label', label: 'Form Contact: label Email' },
      { key: 'ui_contact_form_message_label', label: 'Form Contact: label Message' },
      { key: 'ui_contact_form_name_placeholder', label: 'Form Contact: placeholder Nom' },
      { key: 'ui_contact_form_email_placeholder', label: 'Form Contact: placeholder Email' },
      { key: 'ui_contact_form_message_placeholder', label: 'Form Contact: placeholder Message', textarea: true },
      { key: 'ui_contact_form_success', label: 'Form Contact: succes', textarea: true, fullWidth: true },
      { key: 'ui_contact_form_submit', label: 'Form Contact: bouton Envoyer' },
      { key: 'ui_contact_form_submitting', label: 'Form Contact: envoi en cours' },
      { key: 'ui_contact_testimonials_title', label: 'Page Contact: titre temoignages' },
    ],
  },
  {
    title: 'Pages Listes',
    fields: [
      { key: 'ui_blog_page_title', label: 'Page Blog: titre' },
      { key: 'ui_blog_page_subtitle', label: 'Page Blog: sous-titre' },
      { key: 'ui_blog_page_empty', label: 'Page Blog: etat vide' },
      { key: 'ui_projects_page_title', label: 'Page Projets: titre' },
      { key: 'ui_projects_page_subtitle', label: 'Page Projets: sous-titre' },
      { key: 'ui_skills_page_title', label: 'Page Competences: titre' },
      { key: 'ui_skills_page_subtitle', label: 'Page Competences: sous-titre' },
    ],
  },
  {
    title: 'Pages Systeme',
    fields: [
      { key: 'ui_notfound_title', label: '404: titre' },
      { key: 'ui_notfound_message', label: '404: message', textarea: true, fullWidth: true },
      { key: 'ui_notfound_cta', label: '404: bouton retour' },
      { key: 'ui_maintenance_badge', label: 'Maintenance: badge' },
      { key: 'ui_maintenance_message', label: 'Maintenance: message', textarea: true, fullWidth: true },
      { key: 'ui_cms_default_title', label: 'CMS: titre fallback' },
      { key: 'ui_cms_not_found_title', label: 'CMS: titre introuvable' },
      { key: 'ui_cms_not_found_message', label: 'CMS: message introuvable', textarea: true, fullWidth: true },
    ],
  },
  {
    title: 'Page Projet Detail',
    fields: [
      { key: 'ui_project_detail_not_found', label: 'Projet detail: introuvable' },
      { key: 'ui_project_detail_back', label: 'Projet detail: bouton retour' },
      { key: 'ui_project_detail_view_code', label: 'Projet detail: bouton code' },
      { key: 'ui_project_detail_view_demo', label: 'Projet detail: bouton demo' },
      { key: 'ui_project_detail_copy_link', label: 'Projet detail: copier lien' },
      { key: 'ui_project_detail_link_copied', label: 'Projet detail: lien copie' },
    ],
  },
  {
    title: 'Page Article Detail (General)',
    fields: [
      { key: 'ui_article_not_found', label: 'Article detail: introuvable' },
      { key: 'ui_article_back_to_top', label: 'Article detail: retour haut' },
      { key: 'ui_article_back_to_blog', label: 'Article detail: retour blog' },
      { key: 'ui_article_toc_title', label: 'Article detail: titre table matieres' },
      { key: 'ui_article_copy_link', label: 'Article detail: copier lien (sidebar)' },
      { key: 'ui_article_link_copied', label: 'Article detail: lien copie (sidebar)' },
      { key: 'ui_article_copy_short', label: 'Article detail: copier (mobile)' },
      { key: 'ui_article_copy_short_copied', label: 'Article detail: copie (mobile)' },
      { key: 'ui_article_like_add', label: 'Article detail: ARIA like' },
      { key: 'ui_article_like_remove', label: 'Article detail: ARIA unlike' },
      { key: 'ui_article_like_label_on', label: 'Article detail: label like actif' },
      { key: 'ui_article_like_label_off', label: 'Article detail: label like inactif' },
      { key: 'ui_article_like_error', label: 'Article detail: erreur like', textarea: true, fullWidth: true },
      { key: 'ui_article_reading_time_suffix', label: 'Article detail: suffixe lecture' },
      { key: 'ui_article_views_suffix', label: 'Article detail: suffixe vues' },
      { key: 'ui_article_generic_error', label: 'Article detail: erreur generique', textarea: true, fullWidth: true },
      { key: 'ui_article_related_title', label: 'Article detail: titre similaires' },
    ],
  },
  {
    title: 'Page Article Detail (Commentaires + Newsletter)',
    fields: [
      { key: 'ui_article_comments_title', label: 'Article detail: titre commentaires' },
      { key: 'ui_article_comment_word', label: 'Article detail: mot commentaire' },
      { key: 'ui_article_leave_comment', label: 'Article detail: titre formulaire commentaire' },
      { key: 'ui_article_comment_pending', label: 'Article detail: commentaire en attente', textarea: true, fullWidth: true },
      { key: 'ui_article_comment_name_placeholder', label: 'Article detail: placeholder nom' },
      { key: 'ui_article_comment_email_placeholder', label: 'Article detail: placeholder email' },
      { key: 'ui_article_comment_content_placeholder', label: 'Article detail: placeholder commentaire', textarea: true },
      { key: 'ui_article_comment_submit', label: 'Article detail: bouton publier' },
      { key: 'ui_article_comment_submitting', label: 'Article detail: publication en cours' },
      { key: 'ui_article_newsletter_success', label: 'Article detail: newsletter succes', textarea: true, fullWidth: true },
      { key: 'ui_article_newsletter_title', label: 'Article detail: newsletter texte', textarea: true, fullWidth: true },
      { key: 'ui_article_newsletter_email_placeholder', label: 'Article detail: newsletter placeholder email' },
      { key: 'ui_article_newsletter_submit', label: 'Article detail: newsletter bouton' },
      { key: 'ui_article_newsletter_submitting', label: 'Article detail: newsletter envoi' },
    ],
  },
]

const IDENTITY_FIELD_KEYS = [
  'site_name',
  'site_url',
  'tagline',
  'hero_name',
  'hero_title',
  'hero_bio',
  'bio',
  'hero_photo_status',
  'hero_photo_stack',
  'hero_photo_alt',
  'hero_photo_object_position',
  'about_photo_badge',
  'about_photo_caption',
  'avatar_url',
  'logo_url',
  'stat_1_value',
  'stat_1_label',
  'stat_2_value',
  'stat_2_label',
  'stat_3_value',
  'stat_3_label',
]

const SOCIAL_FIELD_KEYS = [
  'github_url',
  'linkedin_url',
  'twitter_url',
  'youtube_url',
  'instagram_url',
]

const CONTACT_FIELD_KEYS = [
  'contact_email',
  'contact_location',
  'contact_availability',
]

const SEO_FIELD_KEYS = [
  'seo_title',
  'seo_description',
  'seo_keywords',
  'og_image_url',
]

const NEWSLETTER_FIELD_KEYS = [
  'newsletter_from_name',
  'newsletter_from_email',
  'newsletter_footer_text',
]

const APPEARANCE_EXTRA_FIELD_KEYS = [
  'footer_text',
  'footer_credits',
  'maintenance_mode',
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

function normalizeSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
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

function CardSection({ children, className = '', tone = 'default' }) {
  const sectionStyle =
    tone === 'danger'
      ? { borderColor: 'rgba(239, 68, 68, 0.45)', backgroundColor: 'rgba(127, 29, 29, 0.1)' }
      : { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }

  return (
    <div
      className={`rounded-xl border p-4 space-y-4 ${className}`}
      style={sectionStyle}
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

function SectionSaveBar({ onSave, saving, label }) {
  return (
    <div className="pt-2 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
      >
        {saving ? 'Enregistrement...' : label}
      </button>
    </div>
  )
}

export default function AdminSettings() {
  const addToast = useAdminToast()
  const { updateLocalSettings } = useSettings()
  const [settings, setSettings] = useState(() => mergeWithThemeDefaults({}))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [navigationSearch, setNavigationSearch] = useState('')
  const [contentSearch, setContentSearch] = useState('')
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
  const [animationPresetJson, setAnimationPresetJson] = useState('')
  const animationPresetFileInputRef = useRef(null)

  const styleKeys = useMemo(() => Object.keys(DEFAULT_THEME_SETTINGS), [])
  const contentFieldCount = useMemo(
    () => CONTENT_TAB_SECTIONS.reduce((total, section) => total + section.fields.length, 0),
    []
  )
  const appearanceFieldKeys = useMemo(
    () => [...new Set([...APPEARANCE_EXTRA_FIELD_KEYS, ...styleKeys])],
    [styleKeys]
  )
  const animationFieldKeys = useMemo(
    () => Object.keys(extractAnimationSettings(settings || {})),
    [settings]
  )
  const contentSectionKeyMap = useMemo(() => {
    const map = Object.create(null)
    CONTENT_TAB_SECTIONS.forEach((section) => {
      map[section.title] = section.fields.map((field) => field.key)
    })
    return map
  }, [])

  const normalizedNavigationSearch = normalizeSearchValue(navigationSearch)
  const filteredNavigationGroups = useMemo(() => {
    if (!normalizedNavigationSearch) {
      return SETTINGS_NAV_GROUPS
    }

    return SETTINGS_NAV_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = normalizeSearchValue(`${item.label} ${item.description}`)
          return haystack.includes(normalizedNavigationSearch)
        }),
      }))
      .filter((group) => group.items.length > 0)
  }, [normalizedNavigationSearch])

  const activeTabMeta = useMemo(
    () => SETTINGS_NAV_ITEMS.find((item) => item.id === activeTab) || null,
    [activeTab]
  )
  const canSaveActiveTab = activeTab !== 'security' && activeTab !== 'overview'

  const normalizedContentSearch = normalizeSearchValue(contentSearch)
  const filteredContentSections = useMemo(() => {
    if (!normalizedContentSearch) {
      return CONTENT_TAB_SECTIONS
    }

    return CONTENT_TAB_SECTIONS.reduce((acc, section) => {
      const sectionMatch = normalizeSearchValue(section.title).includes(normalizedContentSearch)
      const filteredFields = sectionMatch
        ? section.fields
        : section.fields.filter((field) => {
            const searchable = normalizeSearchValue(`${field.label} ${field.key}`)
            return searchable.includes(normalizedContentSearch)
          })

      if (filteredFields.length > 0) {
        acc.push({
          ...section,
          fields: filteredFields,
        })
      }
      return acc
    }, [])
  }, [normalizedContentSearch])

  const overviewItems = useMemo(() => {
    const hasSeo = Boolean(settings.seo_title && settings.seo_description)
    const hasTheme = Boolean(settings.theme_dark_accent && settings.theme_light_accent)
    const hasNewsletterSender = Boolean(settings.newsletter_from_name && settings.newsletter_from_email)
    const contentConfigured = CONTENT_TAB_SECTIONS.reduce(
      (count, section) =>
        count +
        section.fields.filter((field) => {
          const value = settings[field.key]
          return typeof value === 'string' && value.trim().length > 0
        }).length,
      0
    )

    return [
      {
        id: 'seo',
        title: 'SEO',
        subtitle: hasSeo ? 'Meta principales configurees' : 'Meta principales manquantes',
        statusLabel: hasSeo ? 'Pret' : 'A completer',
        isHealthy: hasSeo,
        metric: hasSeo ? 'Core fields OK' : 'Titre/description a renseigner',
        icon: WrenchScrewdriverIcon,
      },
      {
        id: 'appearance',
        title: 'Theme',
        subtitle: hasTheme ? 'Palette active detectee' : 'Palette incomplete',
        statusLabel: hasTheme ? 'Pret' : 'A verifier',
        isHealthy: hasTheme,
        metric: `Typo: ${settings.ui_font_body || 'defaut'}`,
        icon: PaintBrushIcon,
      },
      {
        id: 'security',
        title: 'Securite',
        subtitle: twoFactorStatus.enabled ? '2FA activee' : '2FA inactive',
        statusLabel: twoFactorStatus.enabled ? 'Protege' : 'Risque',
        isHealthy: twoFactorStatus.enabled,
        metric: `${twoFactorStatus.recoveryCodesCount} recovery code(s)`,
        icon: ShieldExclamationIcon,
      },
      {
        id: 'newsletter',
        title: 'Newsletter',
        subtitle: hasNewsletterSender ? 'Expediteur configure' : 'Expediteur incomplet',
        statusLabel: hasNewsletterSender ? 'Pret' : 'A completer',
        isHealthy: hasNewsletterSender,
        metric: settings.newsletter_from_email || 'Email expediteur absent',
        icon: NewspaperIcon,
      },
      {
        id: 'content',
        title: 'Contenus UI',
        subtitle: `${contentConfigured}/${contentFieldCount} champs personnalises`,
        statusLabel: contentConfigured > 0 ? 'En cours' : 'Vide',
        isHealthy: contentConfigured > 0,
        metric: 'Labels et textes dynamiques',
        icon: DocumentTextIcon,
      },
    ]
  }, [contentFieldCount, settings, twoFactorStatus.enabled, twoFactorStatus.recoveryCodesCount])

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

  const handleResetAnimations = () => {
    const animationDefaults = extractAnimationSettings(mergeWithThemeDefaults({}))
    const nextSettings = mergeWithThemeDefaults({ ...settings, ...animationDefaults })
    setSettings(nextSettings)
    updateLocalSettings(nextSettings)
    addToast('Animations reinitialisees.', 'success')
  }

  const createAnimationPresetPayload = () => ({
    version: 2,
    type: 'portfolio-animation-preset',
    generated_at: new Date().toISOString(),
    settings: extractAnimationSettings(settings),
  })

  const createAnimationAssetMappingPayload = () => {
    const allAnimationSettings = extractAnimationSettings(settings)
    const mappedSettings = {}

    ANIMATION_ASSET_MAPPING_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(allAnimationSettings, key)) {
        mappedSettings[key] = allAnimationSettings[key]
      }
    })

    return {
      version: 1,
      type: 'portfolio-animation-asset-pack',
      generated_at: new Date().toISOString(),
      description: 'Mapping assets section->animation exporte depuis AdminSettings.',
      settings: mappedSettings,
    }
  }

  const applyParsedAnimationPreset = (parsed, successMessage = 'Preset animation importe.') => {
    const rawSettings =
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      parsed.settings &&
      typeof parsed.settings === 'object' &&
      !Array.isArray(parsed.settings)
        ? parsed.settings
        : parsed

    const patch = sanitizeImportedAnimationSettings(rawSettings)
    if (Object.keys(patch).length === 0) {
      addToast('Aucun parametre animation valide detecte.', 'error')
      return false
    }

    const nextSettings = mergeWithThemeDefaults({ ...settings, ...patch })
    setSettings(nextSettings)
    updateLocalSettings(nextSettings)
    addToast(successMessage, 'success')
    return true
  }

  const handleFillAnimationPresetJson = () => {
    const payload = createAnimationPresetPayload()
    setAnimationPresetJson(JSON.stringify(payload, null, 2))
    addToast('JSON du preset charge dans le champ.', 'success')
  }

  const handleExportAnimationPresetFile = () => {
    const payload = createAnimationPresetPayload()
    const serialized = JSON.stringify(payload, null, 2)
    const blob = new Blob([serialized], { type: 'application/json' })
    const downloadUrl = URL.createObjectURL(blob)
    const dateStamp = new Date().toISOString().slice(0, 10)

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `animation-preset-${dateStamp}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)
    addToast('Fichier JSON exporte.', 'success')
  }

  const handleExportAnimationAssetMappingFile = () => {
    const payload = createAnimationAssetMappingPayload()
    const serialized = JSON.stringify(payload, null, 2)
    const blob = new Blob([serialized], { type: 'application/json' })
    const downloadUrl = URL.createObjectURL(blob)
    const dateStamp = new Date().toISOString().slice(0, 10)

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `animation-asset-pack-${dateStamp}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)
    addToast('Pack assets actuel exporte.', 'success')
  }

  const handleOpenAnimationPresetFilePicker = () => {
    animationPresetFileInputRef.current?.click()
  }

  const handleImportAnimationPresetFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    if (file.size > MAX_ANIMATION_PRESET_FILE_BYTES) {
      addToast('Fichier trop volumineux. Maximum 512 KB.', 'error')
      return
    }

    let source = ''
    try {
      source = String(await file.text()).replace(/^\uFEFF/, '').trim()
    } catch {
      addToast('Impossible de lire ce fichier JSON.', 'error')
      return
    }

    if (!source) {
      addToast('Fichier vide.', 'error')
      return
    }

    setAnimationPresetJson(source)

    let parsed = null
    try {
      parsed = JSON.parse(source)
    } catch {
      addToast('JSON invalide dans le fichier.', 'error')
      return
    }

    applyParsedAnimationPreset(parsed, `Preset importe depuis ${file.name}.`)
  }

  const handleImportAnimationPreset = () => {
    const source = String(animationPresetJson || '').trim()
    if (!source) {
      addToast('Aucun JSON detecte. Importe un fichier ou colle un preset.', 'error')
      return
    }

    let parsed = null
    try {
      parsed = JSON.parse(source)
    } catch {
      addToast('JSON invalide.', 'error')
      return
    }

    applyParsedAnimationPreset(parsed)
  }

  const persistSettingsPatch = useCallback(async (payload, successMessage = 'Parametres enregistres.') => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      addToast('Aucun parametre valide a enregistrer.', 'error')
      return false
    }

    if (Object.keys(payload).length === 0) {
      addToast('Aucune modification detectee pour cette section.', 'error')
      return false
    }

    setSaving(true)
    try {
      await updateSettings(payload)
      updateLocalSettings(payload)
      addToast(successMessage, 'success')
      return true
    } catch {
      addToast("Erreur lors de l'enregistrement.", 'error')
      return false
    } finally {
      setSaving(false)
    }
  }, [addToast, updateLocalSettings])

  const handleSave = useCallback(async () => {
    await persistSettingsPatch(settings, 'Parametres enregistres.')
  }, [persistSettingsPatch, settings])

  const handleSaveSectionByKeys = useCallback(async (keys, successMessage = 'Section enregistree.') => {
    const patch = {}
    keys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        patch[key] = settings[key]
      }
    })
    await persistSettingsPatch(patch, successMessage)
  }, [persistSettingsPatch, settings])

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

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6">
        <aside
          className="rounded-xl border p-3 h-fit xl:sticky xl:top-20 space-y-4"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
          aria-label="Navigation des parametres"
        >
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Rechercher une section
            </label>
            <div className="relative">
              <MagnifyingGlassIcon
                className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-hidden="true"
              />
              <input
                type="text"
                value={navigationSearch}
                onChange={(event) => setNavigationSearch(event.target.value)}
                placeholder="Ex: SEO, Securite..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={inputStyle}
              />
            </div>
          </div>

          <nav className="space-y-3">
            {filteredNavigationGroups.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Aucune section ne correspond a cette recherche.
              </p>
            )}

            {filteredNavigationGroups.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = item.id === activeTab
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className="w-full text-left rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                        style={{
                          borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
                          backgroundColor: isActive ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-bg-card)',
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <Icon
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                            style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {item.label}
                            </span>
                            <span className="block text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                              {item.description}
                            </span>
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Parametres
              </h1>
              {activeTabMeta?.description && (
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {activeTabMeta.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(activeTab === 'appearance' || activeTab === 'animations') && (
                <button
                  onClick={activeTab === 'appearance' ? handleResetAppearance : handleResetAnimations}
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
              {canSaveActiveTab && (
                <button
                  type="button"
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

          <div className="space-y-5 max-w-5xl">
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {overviewItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <CardSection key={item.id} className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {item.title}
                            </p>
                          </div>
                          <span
                            className="text-[11px] px-2 py-1 rounded-full font-semibold"
                            style={{
                              backgroundColor: item.isHealthy ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)',
                              color: item.isHealthy ? '#22c55e' : '#f87171',
                            }}
                          >
                            {item.statusLabel}
                          </span>
                        </div>

                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.subtitle}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.metric}
                        </p>

                        <button
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          Ouvrir cette section
                        </button>
                      </CardSection>
                    )
                  })}
                </div>

                <CardSection className="max-w-3xl">
                  <SectionTitle>Bonnes pratiques rapides</SectionTitle>
                  <ul className="space-y-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                      Active le 2FA avant toute publication importante.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                      Complete SEO + OG pour faciliter indexation et partage.
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
                      Teste ton expediteur newsletter avant un envoi global.
                    </li>
                  </ul>
                </CardSection>
              </>
            )}

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

              <SectionSaveBar
                onSave={() => handleSaveSectionByKeys(IDENTITY_FIELD_KEYS, 'Section identite enregistree.')}
                saving={saving}
                label="Enregistrer l identite"
              />
            </CardSection>
          )}

          {activeTab === 'social' && (
            <CardSection className="max-w-2xl">
              <FieldInput label="GitHub" fieldKey="github_url" settings={settings} onChange={handleChange} type="url" />
              <FieldInput label="LinkedIn" fieldKey="linkedin_url" settings={settings} onChange={handleChange} type="url" />
              <FieldInput label="Twitter/X" fieldKey="twitter_url" settings={settings} onChange={handleChange} type="url" />
              <FieldInput label="YouTube" fieldKey="youtube_url" settings={settings} onChange={handleChange} type="url" />
              <FieldInput label="Instagram" fieldKey="instagram_url" settings={settings} onChange={handleChange} type="url" />

              <SectionSaveBar
                onSave={() => handleSaveSectionByKeys(SOCIAL_FIELD_KEYS, 'Section reseaux sociaux enregistree.')}
                saving={saving}
                label="Enregistrer les reseaux"
              />
            </CardSection>
          )}

          {activeTab === 'contact' && (
            <CardSection className="max-w-2xl">
              <FieldInput label="Email de contact" fieldKey="contact_email" settings={settings} onChange={handleChange} type="email" />
              <FieldInput label="Localisation" fieldKey="contact_location" settings={settings} onChange={handleChange} />
              <FieldInput label="Disponibilite" fieldKey="contact_availability" settings={settings} onChange={handleChange} />

              <SectionSaveBar
                onSave={() => handleSaveSectionByKeys(CONTACT_FIELD_KEYS, 'Section contact enregistree.')}
                saving={saving}
                label="Enregistrer le contact"
              />
            </CardSection>
          )}

          {activeTab === 'content' && (
            <>
              <CardSection className="max-w-3xl">
                <SectionTitle>Recherche dans les contenus UI</SectionTitle>
                <div className="relative">
                  <MagnifyingGlassIcon
                    className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-text-secondary)' }}
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={contentSearch}
                    onChange={(event) => setContentSearch(event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={inputStyle}
                    placeholder="Rechercher un libelle ou une cle (ex: ui_article_like...)"
                  />
                </div>
                <InlineTip>
                  {filteredContentSections.length} section(s) affichee(s), {contentFieldCount} champ(s) dynamiques disponibles.
                </InlineTip>
              </CardSection>

              {filteredContentSections.length === 0 && (
                <CardSection className="max-w-3xl">
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Aucun champ ne correspond a cette recherche.
                  </p>
                </CardSection>
              )}

              {filteredContentSections.map((section) => (
                <CardSection key={section.title}>
                  <SectionTitle>{section.title}</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map((field) => (
                      <div key={field.key} className={field.fullWidth ? 'md:col-span-2' : ''}>
                        <FieldInput
                          label={field.label}
                          fieldKey={field.key}
                          settings={settings}
                          onChange={handleChange}
                          textarea={field.textarea === true}
                        />
                      </div>
                    ))}
                  </div>

                  <SectionSaveBar
                    onSave={() =>
                      handleSaveSectionByKeys(
                        contentSectionKeyMap[section.title] || [],
                        `Section ${section.title} enregistree.`
                      )}
                    saving={saving}
                    label="Enregistrer cette section"
                  />
                </CardSection>
              ))}
            </>
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

              <SectionSaveBar
                onSave={() => handleSaveSectionByKeys(SEO_FIELD_KEYS, 'Section SEO enregistree.')}
                saving={saving}
                label="Enregistrer le SEO"
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

              <CardSection className="max-w-2xl">
                <SectionSaveBar
                  onSave={() =>
                    handleSaveSectionByKeys(appearanceFieldKeys, 'Section apparence enregistree.')
                  }
                  saving={saving}
                  label="Enregistrer l apparence"
                />
              </CardSection>
            </>
          )}

          {activeTab === 'animations' && (
            <>
              <CardSection>
                <SectionTitle>Import / Export Lottie-Rive</SectionTitle>
                <InlineTip>
                  Les anciens presets cinematics ont ete retires. Cette section ne gere plus que le pack animations assets-only.
                </InlineTip>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 flex flex-wrap gap-2 items-end">
                    <button
                      type="button"
                      onClick={handleFillAnimationPresetJson}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      Generer JSON (core)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(animationPresetJson, 'Preset JSON copie.')}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      Copier JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAnimationPresetFilePicker}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      Importer fichier .json
                    </button>
                    <button
                      type="button"
                      onClick={handleExportAnimationPresetFile}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      Exporter fichier .json
                    </button>
                    <button
                      type="button"
                      onClick={handleExportAnimationAssetMappingFile}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      Exporter pack assets actuels
                    </button>
                    <button
                      type="button"
                      onClick={handleImportAnimationPreset}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                    >
                      Importer depuis zone
                    </button>
                    <input
                      ref={animationPresetFileInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleImportAnimationPresetFile}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      JSON de preset animation
                    </label>
                    <InlineTip>
                      Seules les cles Lottie/Rive essentielles sont acceptees a l&apos;import.
                    </InlineTip>
                    <textarea
                      value={animationPresetJson}
                      onChange={(e) => setAnimationPresetJson(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-2.5 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-y"
                      style={inputStyle}
                      placeholder='{"type":"portfolio-animation-preset","settings":{"anim_scene_asset_default_url":"https://..."}}'
                    />
                  </div>
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Loaders DotLottie/Rive</SectionTitle>
                <InlineTip>
                  Personnalise ici les animations de chargement globales: spinner classique, transition entre pages et loader de demarrage du site.
                </InlineTip>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Spinner global (petits chargements)"
                      value={settings.anim_loader_spinner_asset_url || ''}
                      onUpload={(url) => handleChange('anim_loader_spinner_asset_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Loader entre pages (navigation)"
                      value={settings.anim_loader_page_asset_url || ''}
                      onUpload={(url) => handleChange('anim_loader_page_asset_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Loader du site (demarrage)"
                      value={settings.anim_loader_site_asset_url || ''}
                      onUpload={(url) => handleChange('anim_loader_site_asset_url', url)}
                    />
                  </div>
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Moteur Global</SectionTitle>
                <InlineTip>
                  Reglages minimaux: activation globale + intensite + vitesse. Le reste est pilote en mode assets-only.
                </InlineTip>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCheckbox label="Activer les animations" fieldKey="anim_enabled" settings={settings} onChange={handleChange} />
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
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Assets DotLottie/Rive Par Section</SectionTitle>
                <InlineTip>
                  Ajoute une grande animation par section (Hero/About/Skills/Projects/Blog/Contact). Ces assets remplacent les anciens effets decoratifs locaux.
                </InlineTip>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCheckbox
                    label="Activer les assets de section"
                    fieldKey="anim_scene_assets_enabled"
                    settings={settings}
                    onChange={handleChange}
                  />
                  <FieldCheckbox
                    label="Afficher aussi dans le Hero"
                    fieldKey="anim_scene_asset_show_hero"
                    settings={settings}
                    onChange={handleChange}
                  />
                  <FieldCheckbox
                    label="Afficher aussi sur mobile"
                    fieldKey="anim_scene_asset_mobile_enabled"
                    settings={settings}
                    onChange={handleChange}
                  />
                  <FieldSelect
                    label="Mode de cadrage asset section"
                    fieldKey="anim_scene_asset_fit"
                    settings={settings}
                    onChange={handleChange}
                    options={[
                      { value: 'contain', label: 'Contain (recommande)' },
                      { value: 'cover', label: 'Cover' },
                    ]}
                  />
                  <FieldRange
                    label="Taille asset section"
                    fieldKey="anim_scene_asset_size"
                    settings={settings}
                    onChange={handleChange}
                    min={220}
                    max={760}
                    step={1}
                    unit="px"
                    defaultValue={360}
                  />
                  <FieldRange
                    label="Opacite asset section"
                    fieldKey="anim_scene_asset_opacity"
                    settings={settings}
                    onChange={handleChange}
                    min={0.2}
                    max={1}
                    step={0.05}
                    defaultValue={0.9}
                  />
                  <FieldRange
                    label="Vitesse flottement asset"
                    fieldKey="anim_scene_asset_speed"
                    settings={settings}
                    onChange={handleChange}
                    min={0.5}
                    max={2.5}
                    step={0.05}
                    unit="x"
                    defaultValue={1}
                  />

                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Asset section global (fallback)"
                      value={settings.anim_scene_asset_default_url || ''}
                      onUpload={(url) => handleChange('anim_scene_asset_default_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Asset section Hero"
                      value={settings.anim_scene_asset_hero_url || ''}
                      onUpload={(url) => handleChange('anim_scene_asset_hero_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Asset section About"
                      value={settings.anim_scene_asset_about_url || ''}
                      onUpload={(url) => handleChange('anim_scene_asset_about_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Asset section Skills"
                      value={settings.anim_scene_asset_skills_url || ''}
                      onUpload={(url) => handleChange('anim_scene_asset_skills_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Asset section Projects"
                      value={settings.anim_scene_asset_projects_url || ''}
                      onUpload={(url) => handleChange('anim_scene_asset_projects_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Asset section Blog"
                      value={settings.anim_scene_asset_blog_url || ''}
                      onUpload={(url) => handleChange('anim_scene_asset_blog_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Asset section Contact"
                      value={settings.anim_scene_asset_contact_url || ''}
                      onUpload={(url) => handleChange('anim_scene_asset_contact_url', url)}
                    />
                  </div>
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Mascottes Animees (Petits Bonhommes)</SectionTitle>
                <InlineTip>
                  Branche ici des assets humains reels (dotLottie/Rive/video/image). Formats supportes: GIF, WebM, MP4, JSON, LOTTIE et RIV.
                </InlineTip>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCheckbox label="Activer les mascottes" fieldKey="anim_mascots_enabled" settings={settings} onChange={handleChange} />
                  <FieldCheckbox label="Afficher aussi dans le Hero" fieldKey="anim_mascot_show_hero" settings={settings} onChange={handleChange} />
                  <FieldRange
                    label="Mascotte par section (0 ou 1)"
                    fieldKey="anim_mascot_count"
                    settings={settings}
                    onChange={handleChange}
                    min={0}
                    max={1}
                    step={1}
                    defaultValue={1}
                  />
                  <FieldRange
                    label="Taille des mascottes"
                    fieldKey="anim_mascot_size"
                    settings={settings}
                    onChange={handleChange}
                    min={180}
                    max={520}
                    step={1}
                    unit="px"
                    defaultValue={340}
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
                  <FieldSelect
                    label="Mode de cadrage asset"
                    fieldKey="anim_mascot_asset_fit"
                    settings={settings}
                    onChange={handleChange}
                    options={[
                      { value: 'contain', label: 'Contain (recommande)' },
                      { value: 'cover', label: 'Cover' },
                    ]}
                  />
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Mascotte par defaut (fallback global)"
                      value={settings.anim_mascot_asset_default_url || ''}
                      onUpload={(url) => handleChange('anim_mascot_asset_default_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Mascotte section About"
                      value={settings.anim_mascot_asset_about_url || ''}
                      onUpload={(url) => handleChange('anim_mascot_asset_about_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Mascotte section Skills"
                      value={settings.anim_mascot_asset_skills_url || ''}
                      onUpload={(url) => handleChange('anim_mascot_asset_skills_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Mascotte section Projects"
                      value={settings.anim_mascot_asset_projects_url || ''}
                      onUpload={(url) => handleChange('anim_mascot_asset_projects_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Mascotte section Blog"
                      value={settings.anim_mascot_asset_blog_url || ''}
                      onUpload={(url) => handleChange('anim_mascot_asset_blog_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Mascotte section Contact"
                      value={settings.anim_mascot_asset_contact_url || ''}
                      onUpload={(url) => handleChange('anim_mascot_asset_contact_url', url)}
                    />
                  </div>
                </div>
              </CardSection>

              <CardSection>
                <SectionTitle>Sprites Assets Dynamiques</SectionTitle>
                <InlineTip>
                  Remplace les anciens sprites locaux par des assets pro: un sprite principal baladeur et des sprites lateraux apparition/disparition.
                </InlineTip>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FieldCheckbox label="Sprite principal baladeur" fieldKey="anim_sprite_wander_enabled" settings={settings} onChange={handleChange} />
                  <FieldCheckbox label="Sprites lateraux apparition/disparition" fieldKey="anim_sprite_side_enabled" settings={settings} onChange={handleChange} />
                  <FieldSelect
                    label="Mode de cadrage asset sprite"
                    fieldKey="anim_sprite_asset_fit"
                    settings={settings}
                    onChange={handleChange}
                    options={[
                      { value: 'contain', label: 'Contain (recommande)' },
                      { value: 'cover', label: 'Cover' },
                    ]}
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
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Sprite asset global (fallback)"
                      value={settings.anim_sprite_asset_default_url || ''}
                      onUpload={(url) => handleChange('anim_sprite_asset_default_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Sprite principal baladeur"
                      value={settings.anim_sprite_asset_wander_url || ''}
                      onUpload={(url) => handleChange('anim_sprite_asset_wander_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Sprite lateral gauche"
                      value={settings.anim_sprite_asset_side_left_url || ''}
                      onUpload={(url) => handleChange('anim_sprite_asset_side_left_url', url)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <MascotAssetUploader
                      label="Sprite lateral droit"
                      value={settings.anim_sprite_asset_side_right_url || ''}
                      onUpload={(url) => handleChange('anim_sprite_asset_side_right_url', url)}
                    />
                  </div>
                </div>
              </CardSection>

              <CardSection className="max-w-2xl">
                <SectionSaveBar
                  onSave={() =>
                    handleSaveSectionByKeys(animationFieldKeys, 'Section animations enregistree.')
                  }
                  saving={saving}
                  label="Enregistrer les animations"
                />
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
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
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

                  <CardSection className="max-w-3xl" tone="danger">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5" style={{ color: '#f87171' }} aria-hidden="true" />
                      <SectionTitle>Danger zone - Desactiver le 2FA</SectionTitle>
                    </div>
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

              <SectionSaveBar
                onSave={() => handleSaveSectionByKeys(NEWSLETTER_FIELD_KEYS, 'Section newsletter enregistree.')}
                saving={saving}
                label="Enregistrer la newsletter"
              />
            </CardSection>
          )}
        </div>
      </div>
      </div>
    </>
  )
}
