import type { FC } from 'react'

interface Props {
  label: string
  sublabel?: string
  className?: string
}

/**
 * PlaceholderBlock – a dashed-border fill region used while real content
 * is not yet implemented. Renders the region label in monospace small-caps.
 */
const PlaceholderBlock: FC<Props> = ({ label, sublabel, className = '' }) => (
  <div className={`placeholder-fill ${className}`}>
    <span className="ph-label">{label}</span>
    {sublabel && (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)', letterSpacing: '0.08em' }}>
        {sublabel}
      </span>
    )}
  </div>
)

export default PlaceholderBlock
