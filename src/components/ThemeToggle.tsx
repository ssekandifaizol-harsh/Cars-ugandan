import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const flip = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }
  return (
    <button onClick={flip} aria-label="Switch dark mode" className="grid size-10 place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  )
}
