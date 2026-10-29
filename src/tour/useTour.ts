import { createContext, useContext } from 'react'

export type TourControls = {
  active: boolean
  completed: boolean
  index: number
  start: () => void
  stop: (reason?: 'skip' | 'done') => void
}

export const TourCtx = createContext<TourControls | null>(null)

export function useTour(): TourControls {
  const v = useContext(TourCtx)
  if (!v) throw new Error('useTour outside TourProvider')
  return v
}
