import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/useAuth'
import { createEmptyLoginForm, createEmptyRegisterForm } from '../../validations/auth.validation'
import { InlineMessage } from './InlineMessage'

export const AuthModal = ({ mode = 'login', onClose, onSwitch }) => {
  const isLogin = mode === 'login'
  const { login, register, setAuthError, authError } = useAuth()
  const [loginForm, setLoginForm] = useState(createEmptyLoginForm)
  const [registerForm, setRegisterForm] = useState(createEmptyRegisterForm)
  const [submitting, setSubmitting] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)

  useEffect(() => {
    setAuthError('')
  }, [mode, setAuthError])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setAuthError('')
    const payload = isLogin ? loginForm : registerForm
    setLoginForm((current) => ({ ...current, password: '' }))
    setRegisterForm((current) => ({ ...current, password: '' }))
    setShowLoginPassword(false)
    setShowRegisterPassword(false)

    try {
      if (isLogin) {
        await login(payload)
      } else {
        await register(payload)
      }
      setLoginForm(createEmptyLoginForm())
      setRegisterForm(createEmptyRegisterForm())
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const EyeIcon = ({ closed = false }) => (
    <svg
      aria-hidden='true'
      viewBox='0 0 24 24'
      className='h-5 w-5'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {closed ? (
        <>
          <path d='M3 3l18 18' />
          <path d='M10.58 10.58a2 2 0 0 0 2.83 2.83' />
          <path d='M9.88 5.09A10.94 10.94 0 0 1 12 4.91c5.05 0 9.27 3.11 10.5 7.09a11.64 11.64 0 0 1-4.03 5.63' />
          <path d='M6.61 6.61A11.52 11.52 0 0 0 1.5 12c.67 2.17 2.2 4.11 4.24 5.47' />
        </>
      ) : (
        <>
          <path d='M1.5 12S5.5 4.91 12 4.91 22.5 12 22.5 12 18.5 19.09 12 19.09 1.5 12 1.5 12Z' />
          <circle cx='12' cy='12' r='3' />
        </>
      )}
    </svg>
  )

  const PasswordToggle = ({ visible, onToggle }) => (
    <button
      type='button'
      onClick={onToggle}
      className='password-toggle absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition'
      aria-label={visible ? 'Hide password' : 'Show password'}
    >
      <EyeIcon closed={visible} />
    </button>
  )

  const GoogleIcon = () => (
    <svg aria-hidden='true' viewBox='0 0 24 24' className='h-5 w-5'>
      <path
        fill='#EA4335'
        d='M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9a6.3 6.3 0 0 1 0-12.6c1.8 0 3 .7 3.7 1.4l2.5-2.4C15.6 1 13.9.2 12 .2 5.4.2.1 5.5.1 12S5.4 23.8 12 23.8c6.9 0 11.4-4.8 11.4-11.6 0-.8-.1-1.4-.2-2H12Z'
      />
      <path
        fill='#34A853'
        d='M3.5 14.3 0.6 16.6C2.3 20.1 6.8 23.8 12 23.8c3.3 0 6.1-1.1 8.1-3l-3.3-2.6c-.9.6-2.1 1-4.8 1-3.7 0-6.8-2.4-7.9-5.7Z'
      />
      <path
        fill='#4A90E2'
        d='M0.6 7.4A11.8 11.8 0 0 0 0.1 12c0 1.6.3 3.1.6 4.6l2.9-2.3a7 7 0 0 1-.4-2.3c0-.8.1-1.6.4-2.3L0.6 7.4Z'
      />
      <path
        fill='#FBBC05'
        d='M12 4.8c2 0 3.3.9 4.1 1.6l3-2.9C17.9 1.8 15.3.2 12 .2 6.8.2 2.3 3.9.6 7.4l3 2.3C4.6 7.2 7.8 4.8 12 4.8Z'
      />
    </svg>
  )

  return (
    <div
      className='fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6'
      onClick={onClose}
    >
      <div className='flex min-h-full items-center justify-center'>
        <div
          className='grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white text-black shadow-[0_40px_140px_rgba(0,0,0,0.4)] lg:grid-cols-[1.05fr,0.95fr]'
          onClick={(event) => event.stopPropagation()}
          role='dialog'
          aria-modal='true'
          aria-label={isLogin ? 'Login form' : 'Signup form'}
        >
          <div className='relative bg-black px-5 py-7 text-white sm:px-6 sm:py-8 md:px-8 md:py-10'>
            <button
              type='button'
              onClick={onClose}
              className='absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-lg leading-none text-white transition hover:bg-white/10 sm:right-5 sm:top-5'
              aria-label='Close auth modal'
            >
              x
            </button>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-white/55'>
              VehiMeet 
            </p>
            <h2 className='mt-5 max-w-lg text-3xl font-semibold leading-tight sm:text-4xl'>
              {isLogin ? 'Welcome back to the ride desk.' : 'Create your account and join the network.'}
            </h2>
            <p className='mt-4 max-w-md text-sm leading-7 text-white/70'>
              {isLogin
                ? 'Sign in to open your dashboard, manage bookings, and continue your ride workflow.'
                : 'Register as a customer to book rides, or as a partner to submit documents, attach a vehicle, and enter admin review.'}
            </p>

            <div className='mt-7 flex flex-wrap gap-3'>
              <button
                type='button'
                onClick={() => onSwitch('login')}
                className={`min-w-[120px] rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  isLogin ? 'bg-white text-black' : 'border border-white/20 text-white hover:bg-white/8'
                }`}
              >
                Login
              </button>
              <button
                type='button'
                onClick={() => onSwitch('signup')}
                className={`min-w-[120px] rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  !isLogin ? 'bg-white text-black' : 'border border-white/20 text-white hover:bg-white/8'
                }`}
              >
                Sign up
              </button>
            </div>
          </div>

          <div className='px-5 py-7 sm:px-6 sm:py-8 md:px-8 md:py-10'>
            <div className='mx-auto max-w-md'>
              <p className='text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400'>
                {isLogin ? 'Login' : 'Register'}
              </p>
              <h3 className='mt-4 text-2xl font-semibold text-black sm:text-3xl'>
                {isLogin ? 'Continue your trip workflow' : 'Get started in minutes'}
              </h3> 
            </div>

            <form className='mx-auto mt-7 max-w-md space-y-4' onSubmit={handleSubmit}>
              <InlineMessage variant='error' text={authError} />
              <a
                className='inline-flex w-full items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-50'
                href={isLogin ? '/api/auth/google/start' : `/api/auth/google/start?role=${encodeURIComponent(registerForm.role)}`}
              >
                <GoogleIcon />
                <span>{isLogin ? 'Continue with Google' : 'Sign up with Google'}</span>
              </a>
              <div className='flex items-center gap-3 text-xs text-neutral-400'>
                <div className='h-px flex-1 bg-neutral-200' />
                <span>{isLogin ? 'or continue with email' : 'or sign up with email'}</span>
                <div className='h-px flex-1 bg-neutral-200' />
              </div>

              {isLogin ? (
                <>
                  <select
                    className='input-shell !border-neutral-200 !bg-neutral-50 !text-black focus:!border-black'
                    value={registerForm.role}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, role: event.target.value })
                    }
                  >
                    <option value='customer'>Customer account</option>
                    <option value='partner'>Partner account</option>
                  </select>
                  <input
                    className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black'
                    autoComplete='email'
                    placeholder='Email address'
                    value={loginForm.email}
                    onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  />
                  <div className='relative'>
                    <input
                      className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black pr-14'
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete='current-password'
                      placeholder='Password'
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm({ ...loginForm, password: event.target.value })
                      }
                    />
                    <PasswordToggle
                      visible={showLoginPassword}
                      onToggle={() => setShowLoginPassword((current) => !current)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <input
                    className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black'
                    autoComplete='name'
                    placeholder='Full name'
                    value={registerForm.fullName}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, fullName: event.target.value })
                    }
                  />
                  <input
                    className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black'
                    autoComplete='email'
                    placeholder='Email address'
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, email: event.target.value })
                    }
                  />
                  <input
                    className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black'
                    autoComplete='tel'
                    placeholder='Phone number'
                    value={registerForm.phone}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, phone: event.target.value })
                    }
                  />
                  <div className='relative'>
                    <input
                      className='input-shell !border-neutral-200 !bg-neutral-50 !text-black placeholder:!text-neutral-400 focus:!border-black pr-14'
                      type={showRegisterPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      placeholder='Password'
                      value={registerForm.password}
                      onChange={(event) =>
                        setRegisterForm({ ...registerForm, password: event.target.value })
                      }
                    />
                    <PasswordToggle
                      visible={showRegisterPassword}
                      onToggle={() => setShowRegisterPassword((current) => !current)}
                    />
                  </div>
                </>
              )}

              <button
                className='inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60'
                disabled={submitting}
                type='submit'
              >
                {submitting
                  ? isLogin
                    ? 'Signing in...'
                    : 'Creating account...'
                  : isLogin
                    ? 'Login'
                    : 'Create account'}
              </button>
            </form>

            <p className='mx-auto mt-5 max-w-md text-sm text-neutral-500'>
              {isLogin ? 'New here?' : 'Already have an account?'}{' '}
              <button
                type='button'
                onClick={() => onSwitch(isLogin ? 'signup' : 'login')}
                className='font-semibold text-black underline underline-offset-4'
              >
                {isLogin ? 'Create an account' : 'Return to login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
