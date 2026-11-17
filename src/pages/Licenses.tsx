import { Code2 } from 'lucide-react'
import { LegalPage } from '../components/LegalPage'
import { SOURCE_REPO } from '../lib/legal'

// Open-source software this app is built with, and its licence.
const LIBS: [string, string, string][] = [
  ['React / React DOM', 'MIT', 'https://github.com/facebook/react'],
  ['React Router', 'MIT', 'https://github.com/remix-run/react-router'],
  ['Supabase JS', 'MIT', 'https://github.com/supabase/supabase-js'],
  ['Motion (framer-motion)', 'MIT', 'https://github.com/motiondivision/motion'],
  ['Lucide icons', 'ISC', 'https://github.com/lucide-icons/lucide'],
  ['Tailwind CSS', 'MIT', 'https://github.com/tailwindlabs/tailwindcss'],
  ['Vite', 'MIT', 'https://github.com/vitejs/vite'],
  ['Vite PWA plugin', 'MIT', 'https://github.com/vite-pwa/vite-plugin-pwa'],
  ['Workbox', 'MIT', 'https://github.com/GoogleChrome/workbox'],
  ['web-push (server)', 'MPL-2.0', 'https://github.com/web-push-libs/web-push'],
  ['Inter font', 'SIL Open Font License 1.1', 'https://github.com/rsms/inter'],
  ['Sora font', 'SIL Open Font License 1.1', 'https://github.com/sora-xor/sora-font'],
]

export default function Licenses() {
  return (
    <LegalPage title="Licenses" intro={<p>This app is built with free and open-source software. We thank their authors. Each is used under the licence shown.</p>}>
      <section>
        <ul className="!ml-0 divide-y divide-zinc-200 dark:divide-zinc-800">
          {LIBS.map(([name, lic, url]) => (
            <li key={name} className="!ml-0 flex list-none items-center justify-between gap-3 py-3">
              <a href={url} target="_blank" rel="noopener" className="font-medium text-accent">{name}</a>
              <span className="text-sm text-zinc-500">{lic}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Built by</h2>
        <p>Designed and developed by <b>centient</b>.</p>
        <a href={SOURCE_REPO} target="_blank" rel="noopener" className="btn-ghost mt-3"><Code2 size={18} /> Project on GitHub</a>
      </section>
    </LegalPage>
  )
}
