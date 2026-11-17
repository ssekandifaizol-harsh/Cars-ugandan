import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { useApp } from '../hooks/useApp'
import { EnquiryForm } from '../components/EnquiryForm'
import { Seo } from '../components/Seo'
import { whatsappLink } from '../lib/format'
import { WhatsAppIcon } from './CarDetail'

export default function Contact() {
  const { shop } = useApp()
  const rows = [
    { icon: MapPin, label: 'Showroom', value: shop?.address, href: shop?.map_url },
    { icon: Clock, label: 'Opening hours', value: shop?.hours },
    { icon: Phone, label: 'Phone', value: shop?.phone, href: shop?.phone ? `tel:${shop.phone.replace(/\s/g, '')}` : undefined },
    { icon: Mail, label: 'Email', value: shop?.email, href: shop?.email ? `mailto:${shop.email}` : undefined },
  ].filter((r) => r.value)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Seo title="Contact us" />
      <h1 className="font-display text-3xl font-bold">Visit or talk to us</h1>
      <p className="mt-1 text-zinc-500">{shop?.tagline}</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          {shop?.whatsapp && <a className="btn-wa w-full" target="_blank" rel="noopener" href={whatsappLink(shop.whatsapp, `Hello ${shop.name}, I'd like to ask about your cars.`)}><WhatsAppIcon /> Chat on WhatsApp</a>}
          {rows.map((r) => {
            const inner = <><r.icon className="mt-0.5 shrink-0 text-accent" size={20} /><div><p className="text-xs text-zinc-500">{r.label}</p><p className="whitespace-pre-line font-medium">{r.value}</p></div></>
            return r.href
              ? <a key={r.label} href={r.href} target="_blank" rel="noopener" className="card flex gap-3 p-4 hover:border-accent">{inner}</a>
              : <div key={r.label} className="card flex gap-3 p-4">{inner}</div>
          })}
          <div className="flex gap-3 pt-2 text-sm font-semibold">
            {shop?.facebook && <a className="text-accent" href={shop.facebook} target="_blank" rel="noopener">Facebook</a>}
            {shop?.instagram && <a className="text-accent" href={shop.instagram} target="_blank" rel="noopener">Instagram</a>}
            {shop?.tiktok && <a className="text-accent" href={shop.tiktok} target="_blank" rel="noopener">TikTok</a>}
          </div>
        </div>
        <EnquiryForm />
      </div>
    </div>
  )
}
