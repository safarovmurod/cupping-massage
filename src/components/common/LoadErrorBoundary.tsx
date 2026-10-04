import { Component, type ReactNode } from 'react'
import { useLang } from '../../contexts/LanguageContext.tsx'

type Props = { children: ReactNode; fallback: ReactNode; resetKey?: string }

// Suspense handles pending imports; rejected imports need an error boundary.
export default class LoadErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidUpdate(previous: Props) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function LoadErrorNotice({ onClose }: { onClose?: () => void }) {
  const { t } = useLang()
  const compact = Boolean(onClose)
  return (
    <section id={compact ? 'mobile-menu' : undefined} role="alert"
      style={compact ? { background: 'var(--bg-card)' } : undefined}
      className={compact
        ? 'fixed bottom-28 left-3 right-3 z-[1300] rounded-2xl border border-glass-soft shadow-card p-5 text-center'
        : 'min-h-screen flex flex-col items-center justify-center text-center px-6 gap-4'}>
      {compact ? <p className="font-bold mb-3">{t('load.error.title')}</p>
        : <h1 className="text-2xl font-bold">{t('load.error.title')}</h1>}
      <p className={compact ? 'mb-4' : ''}>{t('load.error.desc')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {t('load.error.reload')}
        </button>
        {onClose
          ? <button type="button" className="btn btn-secondary" onClick={onClose}>{t('load.error.close')}</button>
          : <a className="btn btn-secondary" href="/">{t('404.btn.home')}</a>}
      </div>
    </section>
  )
}
