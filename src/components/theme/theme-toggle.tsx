'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="h-10 w-10 rounded-xl border border-border bg-card"
      />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={
        isDark ? 'Switch to light mode' : 'Switch to dark mode'
      }
      className="
        flex h-10 w-10 items-center justify-center
        rounded-xl border border-border
        bg-card text-foreground
        shadow-sm
        transition-all duration-200
        hover:bg-secondary
        focus:outline-none
        focus:ring-2
        focus:ring-ring
        focus:ring-offset-2
        focus:ring-offset-background
      "
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}