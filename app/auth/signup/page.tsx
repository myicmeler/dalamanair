'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

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

// Mirrors public.normalise_phone_e164() in the database — keep the two in sync.
// This form previously stored whatever was typed, which left 21 stored numbers
// unreachable: WhatsApp links strip non-digits, so spaces, a 00 prefix or a
// national trunk zero all produced a dead link. Providers were the worst hit,
// and their numbers are shown to customers.
function normalisePhone(raw: string): string {
  if (!raw || !raw.trim()) return ''
  const v = (raw.trim().startsWith('+') ? '+' : '') + raw.replace(/[^0-9]/g, '')
  if (/^00/.test(v)) return '+' + v.slice(2)
  const trunk = v.match(/^\+(44|90|353|47|49|31|33|46|45|32)0(.*)$/)
  if (trunk) return `+${trunk[1]}${trunk[2]}`
  if (v.startsWith('+')) return v
  if (/^(353|90|47)[0-9]{7,}$/.test(v)) return '+' + v
  if (/^07[0-9]{9}$/.test(v)) return '+44' + v.slice(1)
  if (/^7[0-9]{9}$/.test(v)) return '+44' + v
  // Anything else (e.g. a bare Spanish or German number) is left alone and
  // fails validation, so the person is asked for the country code rather than
  // having +44 silently assumed for them.
  return v
}

const isValidE164 = (v: string) => /^\+[1-9][0-9]{6,14}$/.test(v)

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', password:'' })
  const [isProvider, setIsProvider] = useState(false)
  const [providerForm, setProviderForm] = useState({ companyName:'', tursabNumber:'', providerPhone:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Title-case each word but keep letters after an apostrophe or hyphen capital
  // (O'Reilly, Anne-Marie). A plain toUpperCase-first-letter would give O'reilly.
  const titleCase = (s: string) =>
    s.trim().replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/(^|[\s'’-])([a-zà-ÿ])/g, (_m, sep, ch) => sep + ch.toUpperCase())
  const firstName = titleCase(form.firstName)
  const lastName = titleCase(form.lastName)
  const fullName = `${firstName} ${lastName}`.trim()
  const nameValid = firstName.length > 0 && lastName.length > 0

  // Phones are normalised to E.164 before saving. A number that cannot be
  // normalised confidently blocks submission rather than being stored broken.
  const phoneE164 = normalisePhone(form.phone)
  const providerPhoneE164 = normalisePhone(providerForm.providerPhone)
  const phoneBad = !!form.phone.trim() && !isValidE164(phoneE164)
  const providerPhoneBad = isProvider && !!providerForm.providerPhone.trim() && !isValidE164(providerPhoneE164)

  async function handleSignUp() {
    if (!form.email || !form.password || !nameValid || loading) return
    if (isProvider && (!providerForm.companyName || !providerForm.tursabNumber)) return
    if (!nameValid) { setError('Please enter both your first and last name.'); return }
    if (phoneBad || providerPhoneBad) {
      setError('Please enter phone numbers with the country code, e.g. +44 7700 900123 or +90 532 000 0000.')
      return
    }
    setLoading(true); setError('')

    try {
      // 1. Create auth user
      const { data, error: authErr } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: {
          data:{ full_name: fullName, phone: phoneE164 || null },
          emailRedirectTo: `${window.location.origin}${isProvider ? '/provider/welcome/' : '/'}`,
        }
      })
      if (authErr) { setError(authErr.message); setLoading(false); return }

      const userId = data.user?.id
      if (!userId) { setError('Could not create account. Please try again.'); setLoading(false); return }

      if (isProvider) {
        // 2. Call edge function to create provider record server-side
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-provider`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            userId,
            email: form.email,
            fullName: fullName,
            companyName: providerForm.companyName,
            tursabNumber: providerForm.tursabNumber,
            phone: providerPhoneE164 || phoneE164 || null,
          })
        })

        const result = await res.json()
        if (!res.ok || result.error) {
          setError(result.error ?? 'Provider registration failed. Please try again.')
          setLoading(false)
          return
        }
      }

      if (data.session) {
        router.replace(isProvider ? '/provider/welcome/' : '/')
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (success) return (
    <div style={{...S.page, textAlign:'center'}}>
      <LogoLink />
      <div style={{fontSize:'40px', marginBottom:'16px'}}>✉</div>
      <h1 style={{fontSize:'22px', fontWeight:500, color:'#ffffff', marginBottom:'10px'}}>Check your email</h1>
      <p style={{fontSize:'14px', color:'#f4b942', lineHeight:'1.7', maxWidth:'320px', marginBottom:'24px'}}>
        Confirmation link sent to <strong>{form.email}</strong>. Click the link in the email and you'll be logged in automatically.
      </p>
      {isProvider && (
        <p style={{fontSize:'13px', color:'#f4b942', lineHeight:'1.6', maxWidth:'320px', marginBottom:'16px'}}>
          Once you're logged in, you can start receiving quote requests from customers.
        </p>
      )}
      <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
    </div>
  )

  const baseValid = !!(form.email && form.password && nameValid)
  const providerValid = !isProvider || !!(providerForm.companyName && providerForm.tursabNumber)
  const on = baseValid && providerValid && !phoneBad && !providerPhoneBad && !loading

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
          {/* First and last name are separate and both required. A single
              free-text "Full name" field left us with first-name-only records
              (a driver with just "Michael" to go on) and casual capitalisation
              ("paul hilton"). Both are title-cased on save. */}
          <div style={{display:'flex', gap:'12px'}}>
            <div style={{flex:1}}>
              <label style={S.label}>First name *</label>
              <input type="text" value={form.firstName} placeholder="Tom"
                onChange={e => setForm(p=>({...p, firstName:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && handleSignUp()}
                style={S.input} />
            </div>
            <div style={{flex:1}}>
              <label style={S.label}>Last name *</label>
              <input type="text" value={form.lastName} placeholder="Henriksen"
                onChange={e => setForm(p=>({...p, lastName:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && handleSignUp()}
                style={S.input} />
            </div>
          </div>

          {[
            {label:'Email *', key:'email', type:'email', ph:'you@email.com'},
            {label:'Phone', key:'phone', type:'tel', ph:'+44 7700 900123'},
            {label:'Password *', key:'password', type:'password', ph:'Min. 8 characters'},
          ].map(f => (
            <div key={f.key}>
              <label style={S.label}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} placeholder={f.ph}
                onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && handleSignUp()}
                style={{...S.input, borderColor: (f.key==='phone' && phoneBad) ? '#e53e3e' : 'rgba(255,255,255,0.15)'}} />
              {f.key==='phone' && (
                <p style={{fontSize:'11px', color: phoneBad ? '#e53e3e' : 'rgba(255,255,255,0.3)', lineHeight:'1.5', margin:'6px 0 0'}}>
                  {phoneBad
                    ? 'Please include the country code, e.g. +44 7700 900123.'
                    : 'Optional. Include the country code so your driver can reach you on WhatsApp.'}
                </p>
              )}
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
              {label:'Company phone', key:'providerPhone', type:'tel', ph:'+90 532 000 0000'},
            ].map(f => (
              <div key={f.key}>
                <label style={S.label}>{f.label}</label>
                <input type={f.type} value={(providerForm as any)[f.key]} placeholder={f.ph}
                  onChange={e => setProviderForm(p=>({...p,[f.key]:e.target.value}))}
                  onKeyDown={e => e.key==='Enter' && handleSignUp()}
                  style={{...S.input, borderColor: (f.key==='providerPhone' && providerPhoneBad) ? '#e53e3e' : 'rgba(255,255,255,0.15)'}} />
                {f.key==='providerPhone' && (
                  <p style={{fontSize:'11px', color: providerPhoneBad ? '#e53e3e' : 'rgba(255,255,255,0.3)', lineHeight:'1.5', margin:'6px 0 0'}}>
                    {providerPhoneBad
                      ? 'Please include the country code, e.g. +90 532 000 0000.'
                      : 'Shown to customers with a WhatsApp link — include the country code.'}
                  </p>
                )}
              </div>
            ))}
            <p style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', lineHeight:'1.5', margin:0}}>
              Your TURSAB number is required for verification. You will have immediate access to the provider dashboard after confirming your email.
            </p>
          </div>
        )}

        {error && <div style={{background:'rgba(162,45,45,0.3)', border:'1px solid #A32D2D', borderRadius:'6px', padding:'12px', marginTop:'16px', textAlign:'center', fontSize:'13px', color:'#f09595'}}>{error}</div>}

        <button onClick={handleSignUp} disabled={!on} style={S.btn(on)}>
          {loading ? 'Creating...' : isProvider ? 'Register as provider →' : 'Create account →'}
        </button>
      </div>
    </div>
  )
}
