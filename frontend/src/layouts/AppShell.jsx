import { Outlet, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { roleNavigation } from '../store/navigation.store'
import { AuthModal } from '../components/common/AuthModal'
import { NavPill } from '../components/common/NavPill'
import { ToastNotice } from '../components/common/ToastNotice'
import { useTheme } from '../contexts/useTheme'
import { useState } from 'react'

export const AppShell = () => {
  const { user, isAuthenticated, logout, toast, clearToast } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navItems = roleNavigation[user?.role || 'guest']
  const authMode = searchParams.get('auth')
  const isAuthModalOpen = authMode === 'login' || authMode === 'signup'

  const closeAuthModal = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('auth')
    nextParams.delete('redirect')
    setSearchParams(nextParams, { replace: true })
  }

  const openAuthModal = (mode) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('auth', mode)
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <div className='app-shell min-h-screen'>
      <div className='flex w-full flex-col gap-0'>
        <header className='app-header sticky top-0 z-40 flex flex-col gap-4 px-4 py-3 md:px-8'>
          <div className='mx-auto flex w-full max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center justify-between gap-3'>
              <Link to='/' className='brand-mark group inline-flex items-center gap-3 text-2xl font-semibold'>
                <span className='flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,0,0,0.16)] transition group-hover:-translate-y-0.5'>
                  VM
                </span>
                <span>VehiMeet</span>
              </Link>
              <button
                type='button'
                onClick={() => setMobileMenuOpen((current) => !current)}
                className={`menu-orb md:hidden ${mobileMenuOpen ? 'menu-orb-open' : ''}`}
                aria-label='Toggle navigation menu'
                aria-expanded={mobileMenuOpen}
              >
                <span className='menu-orb-line' />
                <span className='menu-orb-line' />
                <span className='menu-orb-line' />
              </button>
            </div>
            <div className='hidden flex-wrap items-center gap-2 md:flex'>
              <div className='flex flex-wrap items-center gap-2'>
                {navItems.map((item) => (
                  <NavPill key={item.to} to={item.to} label={item.label} />
                ))}
              </div>
              <button type='button' onClick={toggleTheme} className='theme-toggle' aria-label='Toggle color theme'>
                {isDark ? 'Light' : 'Dark'}
              </button>
              {isAuthenticated ? (
                <button type='button' onClick={logout} className='button-secondary'>
                  Logout {user?.fullName?.split(' ')[0]}
                </button>
              ) : (
                <button
                  type='button'
                  onClick={() => openAuthModal('signup')}
                  className='button-primary'
                >
                  Get started
                </button>
              )}
            </div>
          </div>
          {mobileMenuOpen ? (
            <div className='mobile-menu-shell mobile-menu-shell-open mx-auto w-full max-w-7xl md:hidden'>
              <div className='mobile-menu-grid'>
                {navItems.map((item) => (
                  <NavPill key={item.to} to={item.to} label={item.label} />
                ))}
              </div>
              <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                <button type='button' onClick={toggleTheme} className='theme-toggle w-full sm:w-auto'>
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </button>
                {isAuthenticated ? (
                  <button type='button' onClick={logout} className='button-secondary w-full sm:w-auto'>
                    Logout {user?.fullName?.split(' ')[0]}
                  </button>
                ) : (
                  <button
                    type='button'
                    onClick={() => openAuthModal('signup')}
                    className='button-primary w-full sm:w-auto'
                  >
                  Get started
                </button>
                )}
              </div>
            </div>
          ) : null}
        </header>
        <main className='w-full overflow-x-hidden'>
          <Outlet />
        </main>
        {isAuthModalOpen ? (
          <AuthModal
            mode={authMode}
            onClose={closeAuthModal}
            onSwitch={openAuthModal}
          />
        ) : null}
        <ToastNotice toast={toast} onClose={clearToast} />
      </div>
    </div>
  )
}
