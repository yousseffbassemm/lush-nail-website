import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CategoryId } from '../content/services'

interface MenuTabValue {
  active: CategoryId
  setActive: (id: CategoryId) => void
  /** Switch the menu to a category and bring the menu into view. */
  showCategory: (id: CategoryId) => void
}

const MenuTabContext = createContext<MenuTabValue | null>(null)

export function MenuTabProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<CategoryId>('nails')
  const showCategory = useCallback((id: CategoryId) => {
    setActive(id)
    window.requestAnimationFrame(() => {
      const heading = document.getElementById('services-title')
      heading?.scrollIntoView({ block: 'start' })
      document.getElementById(`tab-${id}`)?.focus({ preventScroll: true })
    })
  }, [])
  const value = useMemo(() => ({ active, setActive, showCategory }), [active, showCategory])
  return <MenuTabContext.Provider value={value}>{children}</MenuTabContext.Provider>
}

export function useMenuTab() {
  const ctx = useContext(MenuTabContext)
  if (!ctx) throw new Error('useMenuTab must be used inside MenuTabProvider')
  return ctx
}
