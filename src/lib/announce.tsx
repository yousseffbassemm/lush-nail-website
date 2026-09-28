import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const AnnounceContext = createContext<(message: string) => void>(() => {})

/** A single polite live region for status messages such as "Gel X added to your request". */
export function AnnounceProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const announce = useCallback((next: string) => {
    // Clearing first makes screen readers repeat an identical message.
    setMessage('')
    window.setTimeout(() => setMessage(next), 60)
  }, [])
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
    </AnnounceContext.Provider>
  )
}

export const useAnnounce = () => useContext(AnnounceContext)
