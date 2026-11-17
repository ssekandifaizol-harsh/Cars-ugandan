import { Star } from 'lucide-react'

/** Shows stars, or lets the user pick 1–5 when onChange is given. */
export function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-1" role={onChange ? 'radiogroup' : undefined} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value
        const icon = <Star size={size} className={on ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'} />
        return onChange
          ? <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="p-1 transition active:scale-125">{icon}</button>
          : <span key={n}>{icon}</span>
      })}
    </div>
  )
}
