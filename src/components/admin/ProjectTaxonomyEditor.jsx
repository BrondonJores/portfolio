/* Editeur dedie aux axes de taxonomie projet. */
import { useState } from 'react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import {
  PROJECT_TAXONOMY_OPTIONS,
  createEmptyProjectTaxonomy,
  normalizeProjectTaxonomy,
} from '../../utils/projectTaxonomy.js'

/**
 * Editeur de taxonomie projet (type, stack, technologies, domaines, labels).
 * @param {object} props Proprietes du composant.
 * @param {{type:string,stack:Array<string>,technologies:Array<string>,domains:Array<string>,labels:Array<string>} | undefined} props.taxonomy Taxonomie courante.
 * @param {(nextTaxonomy: {type:string,stack:Array<string>,technologies:Array<string>,domains:Array<string>,labels:Array<string>}) => void} props.onChange Callback changement.
 * @param {object} props.inputStyle Style inline des inputs.
 * @returns {import('react').JSX.Element} Bloc UI.
 */
export default function ProjectTaxonomyEditor({ taxonomy, onChange, inputStyle }) {
  const [technologyInput, setTechnologyInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const safeTaxonomy = normalizeProjectTaxonomy(taxonomy, [])

  /**
   * Pousse un prochain etat de taxonomie normalise.
   * @param {object} nextPatch Patch taxonomie.
   * @returns {void}
   */
  const pushTaxonomy = (nextPatch) => {
    const nextTaxonomy = normalizeProjectTaxonomy(
      {
        ...(safeTaxonomy || createEmptyProjectTaxonomy()),
        ...(nextPatch || {}),
      },
      []
    )
    onChange(nextTaxonomy)
  }

  /**
   * Ajoute ou retire une valeur dans un axe multi-select.
   * @param {'stack'|'domains'} axis Axe cible.
   * @param {string} value Valeur cible.
   * @returns {void}
   */
  const toggleAxisValue = (axis, value) => {
    const current = Array.isArray(safeTaxonomy[axis]) ? safeTaxonomy[axis] : []
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value]
    pushTaxonomy({ [axis]: next })
  }

  /**
   * Ajoute un texte libre sur technologies/labels.
   * @param {'technologies'|'labels'} axis Axe cible.
   * @param {string} value Valeur saisie.
   * @returns {void}
   */
  const addTextValue = (axis, value) => {
    const cleaned = String(value || '').trim()
    if (!cleaned) return
    const current = Array.isArray(safeTaxonomy[axis]) ? safeTaxonomy[axis] : []
    pushTaxonomy({ [axis]: [...current, cleaned] })
  }

  /**
   * Supprime une valeur d'un axe taxonomy.
   * @param {'technologies'|'labels'} axis Axe cible.
   * @param {string} value Valeur a supprimer.
   * @returns {void}
   */
  const removeTextValue = (axis, value) => {
    const current = Array.isArray(safeTaxonomy[axis]) ? safeTaxonomy[axis] : []
    pushTaxonomy({ [axis]: current.filter((entry) => entry !== value) })
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="pf-type" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Type de projet
        </label>
        <select
          id="pf-type"
          value={safeTaxonomy.type}
          onChange={(event) => pushTaxonomy({ type: event.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
          style={inputStyle}
        >
          <option value="">Selectionner un type</option>
          {PROJECT_TAXONOMY_OPTIONS.type.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Stack
        </p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TAXONOMY_OPTIONS.stack.map((option) => {
            const selected = safeTaxonomy.stack.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleAxisValue('stack', option)}
                className="px-3 py-1.5 text-xs rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{
                  borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
                  color: selected ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
                  backgroundColor: selected
                    ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)'
                    : 'var(--color-bg-primary)',
                }}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="pf-tech" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Technologies
        </label>
        <div className="flex gap-2">
          <input
            id="pf-tech"
            type="text"
            value={technologyInput}
            onChange={(event) => setTechnologyInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              addTextValue('technologies', technologyInput)
              setTechnologyInput('')
            }}
            list="project-taxonomy-tech-options"
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            style={inputStyle}
            placeholder="Ajouter une techno puis Entree"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              addTextValue('technologies', technologyInput)
              setTechnologyInput('')
            }}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <datalist id="project-taxonomy-tech-options">
            {PROJECT_TAXONOMY_OPTIONS.technologies.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        {safeTaxonomy.technologies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {safeTaxonomy.technologies.map((technology) => (
              <span key={technology} className="inline-flex items-center gap-1">
                <Badge>{technology}</Badge>
                <button
                  type="button"
                  onClick={() => removeTextValue('technologies', technology)}
                  className="text-xs focus:outline-none"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label={`Supprimer la technologie ${technology}`}
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Domaines
        </p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TAXONOMY_OPTIONS.domains.map((option) => {
            const selected = safeTaxonomy.domains.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleAxisValue('domains', option)}
                className="px-3 py-1.5 text-xs rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{
                  borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
                  color: selected ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
                  backgroundColor: selected
                    ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)'
                    : 'var(--color-bg-primary)',
                }}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="pf-label" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Labels libres
        </label>
        <div className="flex gap-2">
          <input
            id="pf-label"
            type="text"
            value={labelInput}
            onChange={(event) => setLabelInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              addTextValue('labels', labelInput)
              setLabelInput('')
            }}
            className="flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
            style={inputStyle}
            placeholder="Ex: performance, accessibilite"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              addTextValue('labels', labelInput)
              setLabelInput('')
            }}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
        {safeTaxonomy.labels.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {safeTaxonomy.labels.map((label) => (
              <span key={label} className="inline-flex items-center gap-1">
                <Badge>{label}</Badge>
                <button
                  type="button"
                  onClick={() => removeTextValue('labels', label)}
                  className="text-xs focus:outline-none"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label={`Supprimer le label ${label}`}
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
