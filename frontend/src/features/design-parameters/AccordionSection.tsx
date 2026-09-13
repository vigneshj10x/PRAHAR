import type { FC, ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface SectionHeaderProps {
  id: string
  title: string
  subtitle?: string
  icon: ReactNode
  isOpen: boolean
  onToggle: () => void
  badge?: string
}

export const AccordionSectionHeader: FC<SectionHeaderProps> = ({
  id,
  title,
  subtitle,
  icon,
  isOpen,
  onToggle,
  badge,
}) => (
  <button
    type="button"
    id={id}
    onClick={onToggle}
    aria-expanded={isOpen}
    aria-controls={`${id}-content`}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 10px',
      background: isOpen ? 'var(--bg-surface)' : 'var(--bg-panel)',
      border: 'none',
      borderBottom: '1px solid var(--border-dim)',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background 150ms ease',
      outline: 'none',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span style={{ color: isOpen ? 'var(--solar)' : 'var(--text-muted)', display: 'flex' }}>
        {icon}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span style={{ fontSize: 7.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {badge && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 7.5,
            fontWeight: 600,
            padding: '1px 5px',
            borderRadius: 2,
            background: 'var(--solar-glow)',
            color: 'var(--solar)',
            border: '1px solid rgba(217, 119, 6, 0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          {badge}
        </span>
      )}
      <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </span>
    </div>
  </button>
)

export default AccordionSectionHeader
