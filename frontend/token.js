// Design tokens — source of truth for all magic numbers
// CSS variables handle colour/theming. Tokens handle everything else.

export const t = {
  radius: {
    sm: 'var(--radius-sm)',   // 6px
    md: 'var(--radius-md)',   // 8px
    lg: 'var(--radius-lg)',   // 12px
    xl: 'var(--radius-xl)',   // 16px
  },
  font: {
    xs:   10,
    sm:   11,
    base: 13,
    md:   14,
    lg:   16,
    xl:   20,
    h2:   22,
    h1:   28,
  },
  space: {
    xs:   4,
    sm:   8,
    md:   12,
    lg:   16,
    xl:   24,
    xxl:  32,
    page: '1.75rem 2rem',
    card: '0.875rem 1rem',
  },
  size: {
    maxPage:     720,
    maxPageWide: '60rem',
    sidebar:     'var(--sidebar-width)',
  },
  label: {
    // Repeated label pattern used everywhere
    style: {
      fontSize:      10,
      fontWeight:    600,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color:         'var(--text-muted)',
    },
  },
  transition: 'var(--transition)',
}