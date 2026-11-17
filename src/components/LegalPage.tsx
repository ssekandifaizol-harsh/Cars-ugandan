import type { ReactNode } from 'react'
import { Seo } from './Seo'
import { LEGAL_UPDATED } from '../lib/legal'

export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Seo title={title} />
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-6 text-zinc-700 dark:text-zinc-300">{intro}</div>
      <div className="mt-8 space-y-8 leading-relaxed text-zinc-700 dark:text-zinc-300 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-100 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </article>
  )
}
