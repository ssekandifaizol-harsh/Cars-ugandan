// Sends a phone notification about a newly published car to every customer who wants one.
// Called by the owner's app right after he publishes a car. Each car is announced only once.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// The public key is safe to share (it is also in the app). The private key lives only in Supabase secrets.
const VAPID_PUBLIC_KEY = 'BNqbSmRPQzhQ7WjToDq2Rr76l8YYkJc9TVqYu6N1Bk-AgQY8uUWApDSEWbQyFuTADYaip0zrstNz8fPPCt1710k'
const VAPID_SUBJECT = 'https://cars-uganda.pages.dev'
const SITE = 'https://cars-uganda.pages.dev'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  try {
    const { car_id } = await req.json().catch(() => ({}))
    if (typeof car_id !== 'string') return json({ error: 'car_id required' }, 400)

    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    if (!privateKey) return json({ error: 'VAPID_PRIVATE_KEY secret is missing' }, 500)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })

    // 1. Who is calling? Only the shop owner or admin may announce a car.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: { user } } = await admin.auth.getUser(jwt)
    if (!user) return json({ error: 'not signed in' }, 401)

    const { data: car } = await admin.from('cars')
      .select('id, shop_id, slug, make, model, year, price, published, notified_at, cover_path')
      .eq('id', car_id).maybeSingle()
    if (!car) return json({ error: 'car not found' }, 404)

    const [{ data: prof }, { data: shop }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).single(),
      admin.from('shops').select('name, owner_id, hide_prices').eq('id', car.shop_id).single(),
    ])
    const allowed = prof?.role === 'admin' || (prof?.role === 'owner' && shop?.owner_id === user.id)
    if (!allowed) return json({ error: 'not allowed' }, 403)
    if (!car.published) return json({ skipped: 'not published' })

    // 2. Claim the car so it is announced exactly once, even if called twice.
    const { data: claimed } = await admin.from('cars')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', car.id).is('notified_at', null).select('id')
    if (!claimed?.length) return json({ skipped: 'already announced' })

    // 3. Find devices of customers who want this kind of car.
    const { data: subs, error } = await admin.from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, profiles!inner(notify_new_cars, notify_makes, notify_max_price)')
      .eq('profiles.notify_new_cars', true)
    if (error) throw error

    const wanted = (subs ?? []).filter((s: any) => {
      const p = s.profiles
      if (p.notify_makes?.length && !p.notify_makes.includes(car.make)) return false
      if (p.notify_max_price && car.price && car.price > p.notify_max_price) return false
      return true
    })

    const price = shop?.hide_prices || car.price == null ? 'Call for price' : 'UGX ' + Number(car.price).toLocaleString('en-US')
    const payload = JSON.stringify({
      title: `New car: ${car.year} ${car.make} ${car.model}`,
      body: `${price} — tap to see photos`,
      url: `/cars/${car.slug}`,
      image: car.cover_path ? `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/car-photos/${car.cover_path}` : undefined,
      tag: `car-${car.id}`,
    })

    // 4. Send. Phones that uninstalled the app answer 404/410: remove those.
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey)
    const dead: string[] = []
    let sent = 0
    await Promise.allSettled(wanted.map(async (s: any) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 })
        sent++
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.id)
      }
    }))
    if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead)

    return json({ sent, removed: dead.length, site: SITE })
  } catch (e) {
    console.error(e)
    return json({ error: 'failed' }, 500)
  }
})
