import { useMemo } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { getUiThemePrimitives } from '../../utils/themeSettings.js'

export default function SectionTitle({ title, subtitle }) {
  const { settings } = useSettings()
  const uiPrimitives = useMemo(() => getUiThemePrimitives(settings), [settings])
  const wrapperStyle = { marginBottom: 'calc(var(--ui-section-title-gap) * 2.35)' }

  if (uiPrimitives.headingStyle === 'rule') {
    return (
      <div style={wrapperStyle}>
        <div className="mb-5 flex items-center gap-3">
          <span
            className="h-px w-18 max-w-[7rem] flex-1"
            style={{ background: 'linear-gradient(90deg, var(--color-accent), transparent)' }}
          />
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)' }}
            aria-hidden="true"
          />
        </div>
        <h2
          className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
    )
  }

  if (uiPrimitives.headingStyle === 'stacked') {
    return (
      <div className="max-w-3xl" style={wrapperStyle}>
        <h2
          className="text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="mt-5 text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-end"
      style={wrapperStyle}
    >
      <div className="max-w-3xl">
        <div className="mb-5 flex items-center gap-3">
          <span
            className="h-px w-16"
            style={{ background: 'linear-gradient(90deg, var(--color-accent), transparent)' }}
          />
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)' }}
            aria-hidden="true"
          />
        </div>
        <h2
          className="text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h2>
      </div>
      {subtitle ? (
        <p
          className="max-w-xl text-sm leading-relaxed sm:text-base md:justify-self-end"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {subtitle}
        </p>
      ) : (
        <div className="hidden md:block" aria-hidden="true" />
      )}
    </div>
  )
}
