import { useEffect } from 'react'

/** Sets the browser tab title and description so Google and WhatsApp previews look right. */
export function Seo({ title, description }: { title: string; description?: string }) {
  useEffect(() => {
    document.title = title.includes('Cars Uganda') ? title : `${title} · Cars Uganda`
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
  return null
}
