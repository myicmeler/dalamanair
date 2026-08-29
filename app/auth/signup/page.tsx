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
// Still used for the provider phone field (free text). The customer phone below
// now uses a country dropdown, so it doesn't need this.
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
  return v
}

const isValidE164 = (v: string) => /^\+[1-9][0-9]{6,14}$/.test(v)

// Country dial codes for the phone field — same list and pattern as the quote
// form, so the two phone inputs behave identically.
type DialCode = { iso: string; name: string; dial: string; flag: string }
const COMMON_CODES: DialCode[] = [
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { iso: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { iso: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { iso: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { iso: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { iso: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
]
const ALL_CODES: DialCode[] = [
  { iso: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
  { iso: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { iso: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { iso: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { iso: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬' },
  { iso: 'BA', name: 'Bosnia & Herzegovina', dial: '+387', flag: '🇧🇦' },
  { iso: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { iso: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷' },
  { iso: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾' },
  { iso: 'CZ', name: 'Czechia', dial: '+420', flag: '🇨🇿' },
  { iso: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { iso: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪' },
  { iso: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { iso: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺' },
  { iso: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸' },
  { iso: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { iso: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { iso: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { iso: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { iso: 'LV', name: 'Latvia', dial: '+371', flag: '🇱🇻' },
  { iso: 'LT', name: 'Lithuania', dial: '+370', flag: '🇱🇹' },
  { iso: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
  { iso: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹' },
  { iso: 'MD', name: 'Moldova', dial: '+373', flag: '🇲🇩' },
  { iso: 'ME', name: 'Montenegro', dial: '+382', flag: '🇲🇪' },
  { iso: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { iso: 'MK', name: 'North Macedonia', dial: '+389', flag: '🇲🇰' },
  { iso: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { iso: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { iso: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { iso: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴' },
  { iso: 'RS', name: 'Serbia', dial: '+381', flag: '🇷🇸' },
  { iso: 'SK', name: 'Slovakia', dial: '+421', flag: '🇸🇰' },
  { iso: 'SI', name: 'Slovenia', dial: '+386', flag: '🇸🇮' },
  { iso: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { iso: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { iso: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { iso: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { iso: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { iso: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
]
const findDial = (iso: string) =>
  [...COMMON_CODES, ...ALL_CODES].find(c => c.iso === iso)?.dial ?? '+44'

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'' })
  const [phoneCountry, setPhoneCountry] = useState('GB')
  const [phoneNumber, setPhoneNumber] = useState('')
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

  // Customer phone: country dropdown + national number -> E.164, same as the
  // quote form. Now REQUIRED — it is the only channel that reliably reaches a
  // customer (WhatsApp), and 35 of the first 47 customers registered without
  // one, so the field is no longer optional.
  const phoneNational = phoneNumber.replace(/\D/g, '').replace(/^0+/, '')
  const phoneE164 = phoneNational ? `${findDial(phoneCountry)}${phoneNational}` : ''
  const phoneValid = phoneNational.length >= 6 && phoneNational.length <= 14
  const phoneBad = !!phoneNumber.trim() && !phoneValid

  // Provider phone stays free-text + normalise (it is inside the provider block,
  // which was not part of this change) and remains optional.
  const providerPhoneE164 = normalisePhone(providerForm.providerPhone)
  const providerPhoneBad = isProvider && !!providerForm.providerPhone.trim() && !isValidE164(providerPhoneE164)

  async function handleSignUp() {
    if (!form.email || !form.password || !nameValid || loading) return
    if (isProvider && (!providerForm.companyName || !providerForm.tursabNumber)) return
    if (!nameValid) { setError('Please enter both your first and last name.'); return }
    if (!phoneValid) { setError('Please enter your phone number so your driver can reach you.'); return }
    if (providerPhoneBad) {
      setError('Please enter the company phone with its country code, e.g. +90 532 000 0000.')
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

  const baseValid = !!(form.email && form.password && nameValid && phoneValid)
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
          ].map(f => (
            <div key={f.key}>
              <label style={S.label}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} placeholder={f.ph}
                onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && handleSignUp()}
                style={S.input} />
            </div>
          ))}

          {/* Phone — REQUIRED, and the same country-dropdown + national-number
              pattern as the quote form so the two behave identically. Producing
              E.164 from a chosen dial code avoids the trunk-zero / spacing
              breakage that made 21 stored numbers unreachable. */}
          <div>
            <label style={S.label}>Phone / WhatsApp *</label>
            <div style={{display:'flex', gap:'8px'}}>
              <select aria-label="Country code" value={phoneCountry} onChange={e => setPhoneCountry(e.target.value)} style={{...S.input, flex:'0 0 130px'}}>
                <optgroup label="Common">
                  {COMMON_CODES.map(c => <option key={'c-' + c.iso} value={c.iso}>{c.flag} {c.dial}</option>)}
                </optgroup>
                <optgroup label="All countries">
                  {ALL_CODES.map(c => <option key={c.iso} value={c.iso}>{c.flag} {c.dial} {c.name}</option>)}
                </optgroup>
              </select>
              <input type="tel" inputMode="numeric" autoComplete="tel-national" value={phoneNumber} placeholder="7700 900123"
                onChange={e => setPhoneNumber(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleSignUp()}
                style={{...S.input, flex:1, borderColor: phoneBad ? '#e53e3e' : 'rgba(255,255,255,0.15)'}} />
            </div>
            <p style={{fontSize:'11px', color: phoneBad ? '#e53e3e' : 'rgba(255,255,255,0.35)', lineHeight:'1.5', margin:'6px 0 0'}}>
              {phoneBad
                ? 'Please enter a valid phone number.'
                : '🔒 Only used so your transfer driver can reach you on the day. We never use it for marketing or share it with anyone else.'}
            </p>
          </div>

          {[
            {label:'Password *', key:'password', type:'password', ph:'Min. 8 characters'},
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
