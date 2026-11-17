import type { Car, Shop } from './types'

export const ugx = (n: number) => 'UGX ' + Math.round(n).toLocaleString('en-UG')

export function priceText(car: Pick<Car, 'price'>, shop?: Shop | null) {
  if (shop?.hide_prices || car.price == null) return 'Call for price'
  return ugx(car.price)
}

export function usdText(car: Pick<Car, 'price'>, shop?: Shop | null) {
  if (!shop?.show_usd || !shop.usd_rate || car.price == null || shop.hide_prices) return ''
  return '≈ $' + Math.round(car.price / shop.usd_rate).toLocaleString('en-US')
}

export const km = (n?: number | null) => (n == null ? '—' : n.toLocaleString('en-UG') + ' km')
export const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')
export const carTitle = (c: Pick<Car, 'year' | 'make' | 'model'>) => `${c.year} ${c.make} ${c.model}`

export function slugify(c: Pick<Car, 'year' | 'make' | 'model'>) {
  const base = `${c.year}-${c.make}-${c.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

/** Ugandan numbers: 0772 123456 / 256772123456 / +256 772 123 456 -> +256772123456 */
export function normaliseUgPhone(input: string): string | null {
  const d = input.replace(/\D/g, '')
  let local = ''
  if (d.startsWith('256') && d.length === 12) local = d.slice(3)
  else if (d.startsWith('0') && d.length === 10) local = d.slice(1)
  else if (d.length === 9) local = d
  else return null
  return '+256' + local
}

export function whatsappLink(number: string, text: string) {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + ' min ago'
  if (s < 86400) return Math.floor(s / 3600) + ' h ago'
  return Math.floor(s / 86400) + ' d ago'
}

/** Shrink a photo on the phone before upload: max 1600px wide, WebP ~80%. Saves data. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality))
  if (blob && blob.type === 'image/webp') return blob
  // Old Safari cannot make WebP — fall back to JPEG
  return (await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality)))!
}
