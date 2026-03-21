import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  {
    section: 'Navigate',
    items: [
      { label: 'Graph',       to: '/graph'    },
      { label: 'My Progress', to: '/progress' },
    ]
  },
  {
    section: 'Coach',
    items: [
      { label: 'My Club',   to: '/club'      },
      { label: 'Athletes',  to: '/athletes'  },
      { label: 'Curricula', to: '/curricula' },
    ]
  }
]

export default function Sidebar({ theme, onToggleTheme, user, onSignOut }) {
  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-sidebar)',
      borderRight: '0.5px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>

      {/* Logo */}
      <div style={{
        padding: '22px 20px',
        borderBottom: '0.5px solid var(--border)',
        fontFamily: 'var(--font-display)',
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: '-0.3px',
        color: 'var(--text-primary)',
        flexShrink: 0,
      }}>
        Mat<span style={{ color: 'var(--accent)' }}>board</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {NAV.map(group => (
          <div key={group.section}>
            <div style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              padding: '14px 20px 5px',
            }}>
              {group.section}
            </div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  margin: '1px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  transition: 'all var(--transition)',
                })}
              >
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'currentColor',
                  flexShrink: 0,
                  opacity: 0.6,
                }} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        borderTop: '0.5px solid var(--border)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.user_metadata?.full_name ?? user?.email ?? 'User'}
            </div>
            <button
              onClick={onSignOut}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 10,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          title="Toggle dark mode"
          style={{
            background: 'var(--bg-subtle)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            width: 28,
            height: 28,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            color: 'var(--text-secondary)',
            flexShrink: 0,
          }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </aside>
  )
}