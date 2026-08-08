'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Cloudflare Turnstile site key. This is Cloudflare's public "always passes,
// visible" TEST key — replaced with the real site key in step 4.
const TURNSTILE_SITE_KEY = '1x00000000000000000000AA'

const S = {
  page: { minHeight:'100vh', background:'#0f1419', display:'flex' as const, flexDirection:'column' as const, alignItems:'center' as const, justifyContent:'center' as const, padding:'24px 16px', boxSizing:'border-box' as const },
  card: { width:'100%', maxWidth:'400px', background:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'32px 24px', boxSizing:'border-box' as const },
  label: { display:'block' as const, fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'rgba(255,255,255,0.4)', marginBottom:'6px' },
  input: { display:'block' as const, width:'100%', boxSizing:'border-box' as const, fontSize:'16px', padding:'14px 12px', background:'#2a2f36', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#ffffff', outline:'none', fontFamily:'inherit' },
  btn: (on: boolean) => ({ display:'block' as const, width:'100%', boxSizing:'border-box' as const, padding:'15px', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' as const, fontFamily:'inherit', marginTop:'20px', background: on ? '#f4b942' : '#3a3520', color: on ? '#0f1419' : '#666340', cursor: on ? 'pointer' as const : 'not-allowed' as const }),
}

const LogoLink = () => (
  <Link href="/" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textDecoration:'none', marginBottom:'32px'}}>
    <Image src="/logo.jpg" alt="dalaman.me" width={64} height={64} style={{borderRadius:'50%', objectFit:'cover'}} />
    <span style={{fontSize:'12px', fontWeight:700, letterSpacing:'0.2em', color:'#ffffff'}}>dalaman.me</span>
  </Link>
)

function friendlyError(code?: string): string {
  switch (code) {
    case 'already_registered': return 'An account with this email already exists — try signing in instead.'
    case 'captcha_required':
    case 'captcha_failed': return 'Captcha check failed. Please try again.'
    case 'valid_email_required': return 'Please enter a valid email address.'
    case 'name_required': return 'Please enter your name.'
    default: return 'Could not create your account. Please try again.'
  }
}

export default function SignUpPage() {
  const [form, setForm] = useState({ fullName:'', email:'', phone:'' })
  const [isProvider, setIsProvider] = useState(false)
  const [providerForm, setProviderForm] = useState({ companyName:'', tursabNumber:'', providerPhone:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Load the Cloudflare Turnstile script and render the widget explicitly.
  useEffect(() => {
    const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    let cancelled = false
    function renderWidget() {
      const ts = (window as any).turnstile
      if (cancelled || !ts || !turnstileRef.current || widgetIdRef.current !== null) return
      widgetIdRef.current = ts.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(''),
        'error-callback': () => setCaptchaToken(''),
      })
    }
    if ((window as any).turnstile) { renderWidget(); return }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', renderWidget)
    return () => { cancelled = true; script?.removeEventListener('load', renderWidget) }
  }, [])

  function resetCaptcha() {
    const ts = (window as any).turnstile
    if (ts && widgetIdRef.current !== null) ts.reset(widgetIdRef.current)
    setCaptchaToken('')
  }

  async function handleSignUp() {
    if (!form.email || !form.fullName || !captchaToken || loading) return
    if (isProvider && (!providerForm.companyName || !providerForm.tursabNumber)) return
    setLoading(true); setError('')

    try {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

      // 1. Create an already-confirmed account server-side and email a
      //    set-password link. Role defaults to customer; providers are elevated
      //    by register-provider below (which requires a customer starting role).
      const res = await fetch(`${base}/functions/v1/register-user`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'apikey': anon, 'Authorization': `Bearer ${anon}` },
        body: JSON.stringify({
          full_name: form.fullName,
          email: form.email,
          phone: form.phone,
          turnstile_token: captchaToken,
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok || result.error) {
        console.error('register-user failed:', result.error, res.status)
        setError(friendlyError(result.error))
        resetCaptcha()
        setLoading(false)
        return
      }

      // 2. Provider: create the provider record (register-provider elevates the
      //    role from customer -> provider and inserts the providers row).
      if (isProvider) {
        const userId = result.id
        if (!userId) {
          setError('Could not create your account. Please try again.')
          resetCaptcha(); setLoading(false); return
        }
        const pres = await fetch(`${base}/functions/v1/register-provider`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'apikey': anon, 'Authorization': `Bearer ${anon}` },
          body: JSON.stringify({
            userId,
            email: form.email,
            fullName: form.fullName,
            companyName: providerForm.companyName,
            tursabNumber: providerForm.tursabNumber,
            phone: providerForm.providerPhone || form.phone || null,
          }),
        })
        const presult = await pres.json().catch(() => ({}))
        if (!pres.ok || presult.error) {
          console.error('register-provider failed:', presult.error, pres.status)
          setError(presult.error ?? 'Provider registration failed. Please try again.')
          setLoading(false)
          return
        }
      }

      setSuccess(true)
    } catch (err: any) {
      console.error('signup error:', err)
      setError(err?.message ?? 'Something went wrong. Please try again.')
      resetCaptcha()
    }
    setLoading(false)
  }

  if (success) return (
    <div style={{...S.page, textAlign:'center'}}>
      <LogoLink />
      <div style={{fontSize:'40px', marginBottom:'16px'}}>✉</div>
      <h1 style={{fontSize:'22px', fontWeight:500, color:'#ffffff', marginBottom:'10px'}}>Check your email</h1>
      <p style={{fontSize:'14px', color:'#f4b942', lineHeight:'1.7', maxWidth:'320px', marginBottom:'24px'}}>
        We&apos;ve sent a link to <strong>{form.email}</strong> to set your password. Click it to finish setting up your account, then you&apos;ll be signed in.
      </p>
      {isProvider && (
        <p style={{fontSize:'13px', color:'#f4b942', lineHeight:'1.6', maxWidth:'320px', marginBottom:'16px'}}>
          Your provider account will be reviewed by our team before you start receiving quote requests.
        </p>
      )}
      <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
    </div>
  )

  const baseValid = !!(form.email && form.fullName)
  const providerValid = !isProvider || !!(providerForm.companyName && providerForm.tursabNumber)
  const on = baseValid && providerValid && !!captchaToken && !loading

  return (
    <div style={S.page}>
      <LogoLink />
      <div style={S.card}>
        <h1 style={{fontSize:'22px', fontWeight:500, color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Create account</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 24px'}}>
          Already have one?{' '}
          <Link href="/auth/signin/" style={{color:'#f4b942', textDecoration:'none', fontWeight:500}}>Sign in</Link>
        </p>

        <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
          {[
            {label:'Full name *', key:'fullName', type:'text', ph:'Tom Henriksen'},
            {label:'Email *', key:'email', type:'email', ph:'you@email.com'},
            {label:'Phone', key:'phone', type:'tel', ph:'+44 7700 000000'},
          ].map(f => (
            <div key={f.key}>
              <label style={S.label}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} placeholder={f.ph}
                onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && handleSignUp()}
                style={S.input} />
            </div>
          ))}
        </div>

        {/* Provider toggle */}
        <div
          onClick={() => setIsProvider(p => !p)}
          style={{display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', padding:'14px', marginTop:'20px',
            backgroundColor: isProvider ? 'rgba(244,185,66,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isProvider ? 'rgba(244,185,66,0.3)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius:'6px', userSelect:'none' as const}}
        >
          <div style={{width:'20px', height:'20px', borderRadius:'4px',
            border:`2px solid ${isProvider ? '#f4b942' : 'rgba(255,255,255,0.3)'}`,
            backgroundColor: isProvider ? '#f4b942' : 'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s'}}>
            {isProvider && <span style={{color:'#0f1419', fontSize:'13px', fontWeight:'700', lineHeight:1}}>✓</span>}
          </div>
          <div>
            <div style={{fontSize:'13px', fontWeight:'500', color:'#ffffff'}}>Register as a transfer provider</div>
            <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'2px'}}>I want to receive quote requests from customers</div>
          </div>
        </div>

        {/* Provider fields */}
        {isProvider && (
          <div style={{display:'flex', flexDirection:'column', gap:'16px', marginTop:'16px', padding:'16px', backgroundColor:'rgba(244,185,66,0.04)', border:'1px solid rgba(244,185,66,0.15)', borderRadius:'8px'}}>
            <p style={{fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'#f4b942', margin:0}}>Provider details</p>
            {[
              {label:'Company name *', key:'companyName', type:'text', ph:'Marmaris Transfer Co.'},
              {label:'TURSAB number *', key:'tursabNumber', type:'text', ph:'e.g. 12345'},
              {label:'Company phone', key:'providerPhone', type:'tel', ph:'+90 555 000 0000'},
            ].map(f => (
              <div key={f.key}>
                <label style={S.label}>{f.label}</label>
                <input type={f.type} value={(providerForm as any)[f.key]} placeholder={f.ph}
                  onChange={e => setProviderForm(p=>({...p,[f.key]:e.target.value}))}
                  onKeyDown={e => e.key==='Enter' && handleSignUp()}
                  style={S.input} />
              </div>
            ))}
            <p style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', lineHeight:'1.5', margin:0}}>
              Your TURSAB number is required for verification. After you set your password, your account will be reviewed before it goes live.
            </p>
          </div>
        )}

        {/* Cloudflare Turnstile captcha */}
        <div ref={turnstileRef} style={{marginTop:'20px', display:'flex', justifyContent:'center', minHeight:'65px'}} />

        {error && <div style={{background:'rgba(162,45,45,0.3)', border:'1px solid #A32D2D', borderRadius:'6px', padding:'12px', marginTop:'16px', textAlign:'center', fontSize:'13px', color:'#f09595'}}>{error}</div>}

        <button onClick={handleSignUp} disabled={!on} style={S.btn(on)}>
          {loading ? 'Creating...' : isProvider ? 'Register as provider →' : 'Create account →'}
        </button>
      </div>
    </div>
  )
}
