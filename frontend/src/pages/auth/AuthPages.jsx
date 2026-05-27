import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { createEmptyLoginForm, createEmptyRegisterForm } from '../../validations/auth.validation'
import { InlineMessage } from '../../components/common/InlineMessage'
import { SectionCard } from '../../components/common/SectionCard'

const AuthFormShell = ({ title, subtitle, children }) => (
  <div className='mx-auto w-full max-w-5xl px-4 sm:px-6'>
    <div className='grid gap-6 xl:grid-cols-[1.2fr,0.8fr]'>
      <SectionCard title={title} subtitle={subtitle}>
        {children}
      </SectionCard>
      <SectionCard title='Security note' subtitle='Authentication should never expose credentials in the UI.'>
        <div className='panel-muted p-4 text-sm leading-7 text-slate-300'>
          Use real user credentials through secure transport. In production, prefer HTTPS and server-managed secure auth flows.
        </div>
      </SectionCard>
    </div>
  </div>
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

const OAuthButton = ({ href, children }) => (
  <a className='button-secondary inline-flex w-full items-center justify-center gap-2 text-center' href={href}>
    <GoogleIcon />
    <span>{children}</span>
  </a>
)

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

const PasswordField = ({ visible, onToggle, ...inputProps }) => (
  <div className='relative'>
    <input
      {...inputProps}
      className={`${inputProps.className || 'input-shell'} pr-14`}
      type={visible ? 'text' : 'password'}
    />
    <button
      type='button'
      onClick={onToggle}
      className='password-toggle absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition'
      aria-label={visible ? 'Hide password' : 'Show password'}
    >
      <EyeIcon closed={visible} />
    </button>
  </div>
)

export const LoginPage = () => {
  const { login, setAuthError, authError } = useAuth()
  const [form, setForm] = useState(createEmptyLoginForm)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setAuthError('')
    const payload = form
    setForm((current) => ({ ...current, password: '' }))
    setShowPassword(false)
    try {
      await login(payload)
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFormShell title='Login to role-based dashboards' subtitle='JWT-backed login with customer, partner, and admin paths.'>
      <InlineMessage variant='error' text={authError} />
      <OAuthButton href='/api/auth/google/start'>Continue with Google</OAuthButton>
      <div className='flex items-center gap-3 text-xs text-slate-500'>
        <div className='h-px flex-1 bg-slate-800' />
        <span>or continue with email</span>
        <div className='h-px flex-1 bg-slate-800' />
      </div>
      <form className='space-y-4' onSubmit={handleSubmit}>
        <input className='input-shell' autoComplete='email' placeholder='Email address' value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <PasswordField
          className='input-shell'
          visible={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
          autoComplete='current-password'
          placeholder='Password'
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className='button-primary w-full' disabled={submitting} type='submit'>
          {submitting ? 'Signing in...' : 'Login'}
        </button>
      </form>
      <p className='mt-4 text-sm text-slate-400'>
        New customer? <Link className='text-cyan-300' to='/register'>Register here</Link>
      </p>
    </AuthFormShell>
  )
}

export const RegisterPage = () => {
  const { register, setAuthError, authError } = useAuth()
  const [form, setForm] = useState(createEmptyRegisterForm)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setAuthError('')
    const payload = form
    setForm((current) => ({ ...current, password: '' }))
    setShowPassword(false)
    try {
      await register(payload)
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFormShell title='Create an account' subtitle='Customer and partner registration with role-specific profile bootstrap.'>
      <InlineMessage variant='error' text={authError} />
      <OAuthButton href={`/api/auth/google/start?role=${encodeURIComponent(form.role)}`}>Sign up with Google</OAuthButton>
      <div className='flex items-center gap-3 text-xs text-slate-500'>
        <div className='h-px flex-1 bg-slate-800' />
        <span>or sign up with email</span>
        <div className='h-px flex-1 bg-slate-800' />
      </div>
      <form className='space-y-4' onSubmit={handleSubmit}>
        <select className='input-shell' value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value='customer'>Customer account</option>
          <option value='partner'>Partner account</option>
        </select>
        <input className='input-shell' autoComplete='name' placeholder='Full name' value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input className='input-shell' autoComplete='email' placeholder='Email address' value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className='input-shell' autoComplete='tel' placeholder='Phone number' value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <PasswordField
          className='input-shell'
          visible={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
          autoComplete='new-password'
          placeholder='Password'
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className='button-primary w-full' disabled={submitting} type='submit'>
          {submitting ? 'Creating account...' : 'Register'}
        </button>
      </form>
      <p className='mt-4 text-sm text-slate-400'>
        Already onboarded? <Link className='text-cyan-300' to='/login'>Return to login</Link>
      </p>
    </AuthFormShell>
  )
}
