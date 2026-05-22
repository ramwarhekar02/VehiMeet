export const SectionCard = ({ title, subtitle, actions, children, className = '' }) => (
  <section className={`section-card animate-rise p-5 sm:p-6 lg:p-7 ${className}`}>
    {(title || subtitle || actions) && (
      <div className='mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='max-w-3xl'>
          {title ? <h2 className='section-card-title text-2xl font-semibold tracking-tight sm:text-3xl'>{title}</h2> : null}
          {subtitle ? <p className='section-card-subtitle mt-2 text-sm leading-6'>{subtitle}</p> : null}
        </div>
        {actions ? <div className='flex flex-wrap gap-3 md:justify-end'>{actions}</div> : null}
      </div>
    )}
    {children}
  </section>
)
