import { NavLink, useLocation } from 'react-router-dom'
import {
  Compass,
  TrendingUp,
  Home,
  Users,
  BookOpen,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { useState, useEffect } from 'react'

// ── Nav config ────────────────────────────────────────────────────────────────
const BASE_TABS = [
  { label: 'Explore',  to: '/explore',  icon: Compass     },
  { label: 'Progress', to: '/progress', icon: TrendingUp   },
  { label: 'Home',     to: '/home',     icon: Home         },
]

const COACH_TABS = [
  { label: 'Club',     to: '/club',     icon: Users        },
]

// ── Bottom tab bar (mobile) ───────────────────────────────────────────────────
function BottomTabBar({ tabs }) {
  const location = useLocation()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 100,
      background: 'var(--bg-surface)',
      borderTop: '0.5px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
    }}>
      {tabs.map(({ label, to, icon: Icon }) => {
        const isActive = location.pathname === to ||
          (to === '/explore' && location.pathname === '/')
        return (
          <NavLink
            key={to}
            to={to}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '10px 4px',
              textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative',
            }}
          >
            {/* Active indicator dot */}
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 6,
                width: 4, height: 4,
                borderRadius: '50%',
                background: 'var(--accent)',
              }} />
            )}
            <Icon
              size={22}
              strokeWidth={isActive ? 2.5 : 1.8}
              style={{ marginTop: isActive ? 4 : 0, transition: 'margin 0.15s' }}
            />
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 600 : 500,
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.02em',
            }}>
              {label}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}

// ── Sidebar (desktop) ─────────────────────────────────────────────────────────
function DesktopSidebar({ theme, onToggleTheme, user, profile, onSignOut }) {
  const isCoach = profile?.role === 'coach' || profile?.role === 'admin'
  const tabs    = [...BASE_TABS, ...(isCoach ? COACH_TABS : [])]

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
        fontSize: 18, fontWeight: 700,
        letterSpacing: '-0.3px',
        color: 'var(--text-primary)',
        flexShrink: 0,
      }}>
        Mat<span style={{ color: 'var(--accent)' }}>board</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        <SidebarSection label="Navigate">
          {tabs.map(({ label, to, icon: Icon }) => (
            <SidebarNavItem key={to} to={to} label={label} Icon={Icon} />
          ))}
        </SidebarSection>

        {isCoach && (
          <SidebarSection label="Coach">
            <SidebarNavItem to="/dashboard"  label="Athletes"  Icon={Users}     />
            <SidebarNavItem to="/curricula" label="Curricula" Icon={BookOpen}   />
          </SidebarSection>
        )}
      </nav>

      {/* Footer */}
      <div style={{
        borderTop: '0.5px solid var(--border)',
        padding: '14px 18px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0, gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600, color: 'var(--accent)', flexShrink: 0,
          }}>
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {profile?.display_name ?? user?.user_metadata?.full_name ?? user?.email ?? 'User'}
            </div>
            <button
              onClick={onSignOut}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: 10, color: 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        <button
          onClick={onToggleTheme}
          title="Toggle dark mode"
          style={{
            background: 'var(--bg-subtle)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', width: 28, height: 28,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0,
          }}
        >
          {theme === 'dark'
            ? <Sun size={13} strokeWidth={1.8} />
            : <Moon size={13} strokeWidth={1.8} />
          }
        </button>
      </div>
    </aside>
  )
}

function SidebarSection({ label, children }) {
  return (
    <>
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)',
        padding: '14px 20px 5px',
      }}>
        {label}
      </div>
      {children}
    </>
  )
}

function SidebarNavItem({ to, label, Icon }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 14px', margin: '1px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 13, fontWeight: 500,
        textDecoration: 'none',
        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
        background: isActive ? 'var(--accent-soft)' : 'transparent',
        transition: 'all var(--transition)',
      })}
    >
      {({ isActive }) => (
        <>
          <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
          {label}
        </>
      )}
    </NavLink>
  )
}

// ── Mobile header (shows on mobile only) ──────────────────────────────────────
function MobileHeader({ theme, onToggleTheme, onSignOut, profile, user }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg-surface)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17, fontWeight: 700,
          letterSpacing: '-0.3px',
          color: 'var(--text-primary)',
        }}>
          Mat<span style={{ color: 'var(--accent)' }}>board</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onToggleTheme}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            }}
          >
            {theme === 'dark'
              ? <Sun size={17} strokeWidth={1.8} />
              : <Moon size={17} strokeWidth={1.8} />
            }
          </button>

          <button
            onClick={() => setMenuOpen(true)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            }}
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Slide-out account menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(2px)',
            }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 260, zIndex: 201,
            background: 'var(--bg-surface)',
            borderLeft: '0.5px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            padding: '20px 0',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
          }}>
            {/* Close */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px 20px',
              borderBottom: '0.5px solid var(--border)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {profile?.display_name ?? user?.email ?? 'Account'}
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', padding: 4,
                }}
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            <div style={{ flex: 1 }} />

            {/* Sign out */}
            <button
              onClick={() => { onSignOut(); setMenuOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                margin: '0 12px',
                padding: '10px 12px',
                background: 'none',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13, fontWeight: 500,
                color: 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              <LogOut size={15} strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        </>
      )}
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Navigation({ theme, onToggleTheme, user, profile, onSignOut, children }) {
  const isCoach  = profile?.role === 'coach' || profile?.role === 'admin'
  const mobileTabs = [...BASE_TABS, ...(isCoach ? COACH_TABS : [])]

  // Track viewport width
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <MobileHeader
          theme={theme}
          onToggleTheme={onToggleTheme}
          onSignOut={onSignOut}
          profile={profile}
          user={user}
        />
        <main style={{
          flex: 1,
          height: 0,
          overflow: 'auto',
          background: 'var(--bg-page)',
          // Pad bottom so content clears the tab bar
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
        }}>
          {children}
        </main>
        <BottomTabBar tabs={mobileTabs} />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <DesktopSidebar
        theme={theme}
        onToggleTheme={onToggleTheme}
        user={user}
        profile={profile}
        onSignOut={onSignOut}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}