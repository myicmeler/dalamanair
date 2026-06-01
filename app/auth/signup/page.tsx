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

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', password:'' })
  const [isProvider, setIsProvider] = useState(false)
  const [providerForm, setProviderForm] = useState({ companyName:'', tursabNumber:'', providerPhone:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSignUp() {
    if (!form.email || !form.password || !form.fullName || loading) return
    if (isProvider && (!providerForm.companyName || !providerForm.tursabNumber)) return
    setLoading(true); setError('')

    try {
      // 1. Create auth user
      const { data, error: authErr } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data:{ full_name: form.fullName }, emailRedirectTo:`${window.location.origin}/` }
      })
      if (authErr) { setError(authErr.message); setLoading(false); return }

      const userId = data.user?.id
      if (!userId) { setError('Could not create account. Please try again.'); setLoading(false); return }

      if (isProvider) {
        // 2. Update public.users role to provider
        await supabase.from('users').upsert({
          id: userId,
          email: form.email,
          full_name: providerForm.companyName,
          phone: providerForm.providerPhone || form.phone || null,
          role: 'provider',
        })

        // 3. Create provider record — approved immediately (TURSAB required)
        await supabase.from('providers').insert({
          user_id: userId,
          company_name: providerForm.companyName,
          contact_name: form.fullName,
          phone: providerForm.providerPhone || form.phone || null,
          tursab_number: providerForm.tursabNumber,
          is_approved: true,
        })
      }

      if (data.session) {
        router.replace(isProvider ? '/provider/' : '/')
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
      <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', maxWidth:'320px', marginBottom:'24px'}}>
        Confirmation link sent to <strong style={{color:'rgba(255,255,255,0.8)'}}>{form.email}</strong>
      </p>
      {isProvider && (
        <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', lineHeight:'1.6', maxWidth:'320px', marginBottom:'16px'}}>
          Once confirmed you can log in and start receiving quote requests from customers.
        </p>
      )}
      <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
    </div>
  )

  const baseValid = !!(form.email && form.password && form.fullName)
  const providerValid = !isProvider || !!(providerForm.companyName && providerForm.tursabNumber)
  const on = baseValid && providerValid && !loading

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
