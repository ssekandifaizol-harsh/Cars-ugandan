import { CheckCircle2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Stars } from '../components/Stars'
import { Seo } from '../components/Seo'

interface Survey { state: 'open' | 'done' | 'expired' | 'invalid'; shop_name?: string; car_label?: string; first_name?: string }

// The private satisfaction survey a buyer opens from the WhatsApp link.
export default function Review() {
  const { token } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [overall, setOverall] = useState(0)
  const [car, setCar] = useState(0)
  const [service, setService] = useState(0)
  const [value, setValue] = useState(0)
  const [recommend, setRecommend] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [name, setName] = useState('')
  const [publish, setPublish] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) { setSurvey({ state: 'invalid' }); return }
    supabase.rpc('get_survey', { p_token: token }).then(({ data, error }) => setSurvey(error ? { state: 'invalid' } : (data as Survey)))
  }, [token])

  useEffect(() => { if (survey?.first_name && !name) setName(survey.first_name) }, [survey]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    if (!overall) return setErr('Please tap a star rating for your overall experience.')
    setBusy(true)
    const { error } = await supabase.rpc('submit_review', {
      p_token: token, p_overall: overall, p_car: car || null, p_service: service || null, p_value: value || null,
      p_recommend: recommend, p_comment: comment, p_display_name: name, p_allow_publish: publish,
    })
    setBusy(false)
    if (error) return setErr(error.message || 'Could not send. Please try again.')
    setDone(true)
  }

  if (!survey) return <Box><div className="shimmer h-80 rounded-2xl" /></Box>
  if (done || survey.state === 'done') return (
    <Box><div className="card flex flex-col items-center p-10 text-center">
      <CheckCircle2 size={48} className="text-green-600" />
      <h1 className="mt-4 font-display text-2xl font-bold">Thank you!</h1>
      <p className="mt-2 text-zinc-500">Your feedback helps {survey.shop_name ?? 'us'} serve every customer better.</p>
    </div></Box>
  )
  if (survey.state !== 'open') return (
    <Box><div className="card p-10 text-center">
      <h1 className="font-display text-xl font-bold">{survey.state === 'expired' ? 'This survey link has expired' : 'Survey link not found'}</h1>
      <p className="mt-2 text-zinc-500">Please ask the showroom to send you a new link.</p>
    </div></Box>
  )

  return (
    <Box>
      <Seo title="How was your experience?" />
      <form onSubmit={submit} className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-accent">{survey.shop_name}</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Hi {survey.first_name}, how did it go?</h1>
          <p className="mt-2 text-zinc-500">About your <b>{survey.car_label}</b>. Takes 1 minute.</p>
        </div>

        <div className="card space-y-1 p-5">
          <p className="font-semibold">Overall experience *</p>
          <Stars value={overall} onChange={setOverall} size={36} />
        </div>

        <div className="card space-y-3 p-5">
          <Row label="The car itself" v={car} set={setCar} />
          <Row label="Our service" v={service} set={setService} />
          <Row label="Value for money" v={value} set={setValue} />
        </div>

        <div className="card p-5">
          <p className="mb-3 text-sm">Would you recommend us to a friend?</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRecommend(true)} className={`chip justify-center !py-3 ${recommend === true ? 'chip-on' : ''}`}><ThumbsUp size={16} />Yes</button>
            <button type="button" onClick={() => setRecommend(false)} className={`chip justify-center !py-3 ${recommend === false ? 'chip-on' : ''}`}><ThumbsDown size={16} />No</button>
          </div>
        </div>

        <div className="card space-y-3 p-5">
          <label className="label !mb-0">Anything you'd like to tell us?</label>
          <textarea className="input min-h-28" maxLength={1500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went well, what could be better…" />
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
            <span>You may show my comment and rating on the website.</span>
          </label>
          {publish && <input className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name to show, e.g. John O." />}
          <p className="text-xs text-zinc-500">Your phone number is never shown.</p>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
      </form>
    </Box>
  )
}

// Defined outside the page so typing in the form never resets it.
function Box({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-lg px-4 py-10">{children}</div>
}

function Row({ label, v, set }: { label: string; v: number; set: (n: number) => void }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-sm">{label}</span><Stars value={v} onChange={set} size={24} /></div>
}
