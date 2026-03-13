/* Page de gestion des competences admin */
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckIcon,
  PencilSquareIcon,
  PlusIcon,
  RocketLaunchIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useAdminToast } from '../../components/admin/AdminLayout.jsx'
import ConfirmModal from '../../components/admin/ConfirmModal.jsx'
import AdminPagination from '../../components/admin/AdminPagination.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Button from '../../components/ui/Button.jsx'
import { getAdminSkills, createSkill, updateSkill, deleteSkill } from '../../services/skillService.js'
import { normalizeAdminPagePayload, toOffsetFromPage } from '../../utils/adminPagination.js'
import {
  isAdminEditorPopup,
  notifyAdminEditorSaved,
  openAdminEditorWindow,
  subscribeAdminEditorRefresh,
} from '../../utils/adminEditorWindow.js'

const PAGE_LIMIT = 20

const panelStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 78%, transparent)',
}

const metricCardStyle = {
  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 56%, transparent)',
}

const inputStyle = {
  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 88%, transparent)',
  borderColor: 'color-mix(in srgb, var(--color-border) 74%, transparent)',
  color: 'var(--color-text-primary)',
}

const EMPTY_SKILL = { name: '', category: 'Frontend', level: 80, sort_order: 0 }

/**
 * Panneau d'edition pour une competence.
 * @param {object} props Proprietes composant.
 * @param {object} [props.initial] Valeurs initiales.
 * @param {(form: object) => void} props.onSave Callback de sauvegarde.
 * @param {() => void} props.onCancel Callback annulation.
 * @param {boolean} props.isNew Indique un ajout.
 * @returns {JSX.Element} Panneau d'edition.
 */
function SkillEditorPanel({ initial, onSave, onCancel, isNew }) {
  const [form, setForm] = useState(initial || EMPTY_SKILL)

  useEffect(() => {
    setForm(initial || EMPTY_SKILL)
  }, [initial])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'level' || name === 'sort_order' ? Number(value) : value,
    }))
  }

  return (
    <section className="rounded-[28px] border p-5 sm:p-6" style={panelStyle}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-secondary)' }}>
            Skill editor
          </p>
          <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {isNew ? 'Ajouter une competence' : 'Mettre a jour une competence'}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Regle le niveau, la categorie et l ordre d apparition depuis un panneau plus lisible.
          </p>
        </div>
        <span
          className="inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium"
          style={metricCardStyle}
        >
          {form.level}% de maitrise
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Nom
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
            placeholder="Nom"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Categorie
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
          >
            <option>Frontend</option>
            <option>Backend</option>
            <option>Outils</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Ordre
          </label>
          <input
            name="sort_order"
            type="number"
            value={form.sort_order}
            onChange={handleChange}
            className="w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border p-4" style={metricCardStyle}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Niveau de maitrise
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Ajuste le curseur pour representer le niveau visible sur le site.
            </p>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {form.level}%
          </span>
        </div>

        <input
          name="level"
          type="range"
          min="0"
          max="100"
          value={form.level}
          onChange={handleChange}
          className="mt-4 w-full"
          style={{ accentColor: 'var(--color-accent)' }}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" variant="primary" onClick={() => onSave(form)}>
          <CheckIcon className="h-4 w-4" aria-hidden="true" />
          Enregistrer
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
          Annuler
        </Button>
      </div>
    </section>
  )
}

export default function AdminSkills() {
  const addToast = useAdminToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [skills, setSkills] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: PAGE_LIMIT,
    offset: 0,
  })
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const editorParam = searchParams.get('editor')

  const loadSkills = (targetPage = page) => {
    const offset = toOffsetFromPage(targetPage, PAGE_LIMIT)
    setLoading(true)
    getAdminSkills({ limit: PAGE_LIMIT, offset })
      .then((res) => {
        const normalized = normalizeAdminPagePayload(res?.data, {
          defaultLimit: PAGE_LIMIT,
          requestedOffset: offset,
        })
        setSkills(normalized.items)
        setPagination({
          total: normalized.total,
          limit: normalized.limit,
          offset: normalized.offset,
        })

        const pages = Math.max(1, Math.ceil(normalized.total / normalized.limit))
        if (targetPage > pages && normalized.total > 0) {
          setPage(pages)
        }
      })
      .catch(() => addToast('Erreur lors du chargement.', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSkills(page)
  }, [page])

  useEffect(() => {
    return subscribeAdminEditorRefresh((payload) => {
      if (payload?.entity === 'skills' || payload?.entity === 'global') {
        loadSkills(page)
      }
    })
  }, [page])

  /**
   * Ferme l'editeur popup ou revient a l'etat liste.
   * @returns {void}
   */
  const closeEditorOrBack = () => {
    if (isAdminEditorPopup()) {
      window.close()
      if (!window.closed) {
        navigate('/admin/competences')
      }
      return
    }

    if (editorParam) {
      navigate('/admin/competences', { replace: true })
    }
    setShowAdd(false)
    setEditingId(null)
  }

  /**
   * Ouvre l'editeur de competences dans une popup dediee.
   * @param {'new' | number} target Cible a editer.
   * @param {() => void} fallback Action locale si popup bloquee.
   * @returns {void}
   */
  const openSkillEditor = (target, fallback) => {
    if (isAdminEditorPopup()) {
      fallback()
      return
    }

    const path = target === 'new' ? '/admin/competences?editor=new' : `/admin/competences?editor=${target}`

    const popup = openAdminEditorWindow(path, {
      windowName: 'portfolio-admin-skill-editor',
      width: 1200,
      height: 880,
    })

    if (!popup) {
      fallback()
    }
  }

  useEffect(() => {
    if (!editorParam) return

    if (editorParam === 'new') {
      setEditingId(null)
      setShowAdd(true)
      return
    }

    const parsedId = Number.parseInt(editorParam, 10)
    if (Number.isInteger(parsedId) && parsedId > 0) {
      setShowAdd(false)
      setEditingId(parsedId)
    }
  }, [editorParam])

  const handleAdd = async (form) => {
    try {
      await createSkill(form)
      addToast('Competence ajoutee.', 'success')
      notifyAdminEditorSaved('skills')
      if (isAdminEditorPopup()) {
        closeEditorOrBack()
        return
      }
      closeEditorOrBack()
      loadSkills(page)
    } catch (err) {
      addToast(err.message || 'Erreur.', 'error')
    }
  }

  const handleUpdate = async (id, form) => {
    try {
      await updateSkill(id, form)
      addToast('Competence mise a jour.', 'success')
      notifyAdminEditorSaved('skills')
      if (isAdminEditorPopup()) {
        closeEditorOrBack()
        return
      }
      closeEditorOrBack()
      loadSkills(page)
    } catch (err) {
      addToast(err.message || 'Erreur.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirmId) return
    try {
      await deleteSkill(confirmId)
      addToast('Competence supprimee.', 'success')
      notifyAdminEditorSaved('skills')
      loadSkills(page)
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
    } finally {
      setConfirmId(null)
    }
  }

  const editingSkill = useMemo(
    () => skills.find((skill) => Number(skill.id) === Number(editingId)) || null,
    [skills, editingId]
  )
  const uniqueCategories = useMemo(
    () => new Set(skills.map((skill) => skill.category).filter(Boolean)).size,
    [skills]
  )
  const averageLevel = useMemo(() => {
    if (skills.length === 0) return 0
    const total = skills.reduce((sum, skill) => sum + Number(skill.level || 0), 0)
    return Math.round(total / skills.length)
  }, [skills])

  return (
    <>
      <Helmet>
        <title>Competences - Administration</title>
      </Helmet>

      <div className="space-y-6">
        <section
          className="overflow-hidden rounded-[32px] border px-5 py-5 sm:px-6 sm:py-6"
          style={panelStyle}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <span
                className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 54%, transparent)',
                }}
              >
                <RocketLaunchIcon className="h-4 w-4" aria-hidden="true" />
                Skills matrix
              </span>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl" style={{ color: 'var(--color-text-primary)' }}>
                  Une grille de competences plus claire a piloter.
                </h1>
                <p className="max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--color-text-secondary)' }}>
                  Gere la progression, les categories et l ordre d affichage depuis un ecran moins
                  utilitaire et plus adapte aux ajustements frequents.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() =>
                openSkillEditor('new', () => {
                  setEditingId(null)
                  setShowAdd(true)
                })
              }
              className="w-full sm:w-auto"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Ajouter
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Competences', value: pagination.total },
              { label: 'Categories actives', value: uniqueCategories },
              { label: 'Niveau moyen', value: `${averageLevel}%` },
            ].map((metric) => (
              <article key={metric.label} className="rounded-[24px] border px-4 py-4" style={metricCardStyle}>
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {metric.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        {(showAdd || editingSkill) && (
          <SkillEditorPanel
            initial={editingSkill || EMPTY_SKILL}
            isNew={showAdd}
            onSave={(form) => {
              if (showAdd) {
                void handleAdd(form)
                return
              }
              if (editingSkill) {
                void handleUpdate(editingSkill.id, form)
              }
            }}
            onCancel={closeEditorOrBack}
          />
        )}

        {loading ? (
          <div className="flex justify-center rounded-[28px] border py-20" style={panelStyle}>
            <Spinner size="lg" />
          </div>
        ) : skills.length === 0 ? (
          <section className="rounded-[28px] border px-6 py-14 text-center" style={panelStyle}>
            <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Aucune competence pour le moment.
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Ajoute tes premiers items pour construire la grille visible sur le site.
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                variant="primary"
                onClick={() =>
                  openSkillEditor('new', () => {
                    setEditingId(null)
                    setShowAdd(true)
                  })
                }
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Ajouter une competence
              </Button>
            </div>
          </section>
        ) : (
          <>
            <div className="grid gap-4 lg:hidden">
              {skills.map((skill) => (
                <article key={skill.id} className="rounded-[26px] border p-4" style={panelStyle}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {skill.name}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {skill.category}
                      </p>
                    </div>
                    <span
                      className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={metricCardStyle}
                    >
                      {skill.level}%
                    </span>
                  </div>

                  <div className="mt-4 rounded-[20px] border px-3 py-3" style={metricCardStyle}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
                        Niveau
                      </p>
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Ordre {skill.sort_order ?? 0}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--color-border) 80%, transparent)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${skill.level}%`,
                          background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-light))',
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        openSkillEditor(skill.id, () => {
                          setShowAdd(false)
                          setEditingId(skill.id)
                        })
                      }
                      className="flex-1"
                    >
                      <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                      Modifier
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setConfirmId(skill.id)} className="w-full sm:w-auto">
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      Supprimer
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <section className="hidden overflow-hidden rounded-[30px] border lg:block" style={panelStyle}>
              <div
                className="grid grid-cols-[minmax(0,1.15fr)_160px_minmax(180px,1fr)_180px] gap-4 border-b px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{
                  color: 'var(--color-text-secondary)',
                  borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 52%, transparent)',
                }}
              >
                <span>Nom</span>
                <span>Categorie</span>
                <span>Niveau</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)' }}>
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="grid grid-cols-[minmax(0,1.15fr)_160px_minmax(180px,1fr)_180px] items-center gap-4 px-6 py-5 transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 72%, transparent)' }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {skill.name}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        Ordre d affichage: {skill.sort_order ?? 0}
                      </p>
                    </div>

                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {skill.category}
                    </p>

                    <div className="flex items-center gap-3">
                      <div
                        className="h-2 flex-1 overflow-hidden rounded-full"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-border) 80%, transparent)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${skill.level}%`,
                            background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-light))',
                          }}
                        />
                      </div>
                      <span className="w-10 text-right text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {skill.level}%
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          openSkillEditor(skill.id, () => {
                            setShowAdd(false)
                            setEditingId(skill.id)
                          })
                        }
                      >
                        <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                        Modifier
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setConfirmId(skill.id)}>
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <div className="pt-1">
          <AdminPagination
            total={pagination.total}
            limit={pagination.limit}
            offset={pagination.offset}
            disabled={loading}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
        title="Supprimer la competence"
        message="Cette competence sera definitivement supprimee."
      />
    </>
  )
}
