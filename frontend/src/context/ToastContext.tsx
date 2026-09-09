import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const TOAST_DURATION_MS = 6000

interface ToastState {
  message: ReactNode
  undo?: () => void
}

interface ToastContextValue {
  showToast: (message: ReactNode, undo?: () => void) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)

  const hideToast = useCallback(() => {
    setVisible(false)
  }, [])

  const showToast = useCallback((message: ReactNode, undo?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, undo })
    setVisible(true)

    // reinicia a animacao da barra de progresso
    const el = progressRef.current
    if (el) {
      el.style.animation = 'none'
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetWidth
      el.style.animation = `toastShrink ${TOAST_DURATION_MS}ms linear forwards`
    }

    timerRef.current = setTimeout(hideToast, TOAST_DURATION_MS)
  }, [hideToast])

  const handleUndo = () => {
    toast?.undo?.()
    if (timerRef.current) clearTimeout(timerRef.current)
    hideToast()
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`toast ${visible ? 'toast-show' : ''}`}>
        <span
          className="h-[7px] w-[7px] flex-none rounded-full"
          style={{ background: 'var(--green)', boxShadow: '0 0 8px var(--green-glow)' }}
        />
        <span className="flex-1">{toast?.message}</span>
        {toast?.undo && (
          <button
            onClick={handleUndo}
            className="flex-none rounded-lg border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--amber)', borderColor: 'var(--amber-dim)' }}
          >
            Desfazer
          </button>
        )}
        <div ref={progressRef} className="toast-progress" />
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}
