'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', password:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSignUp() {
    if (!form.email || !form.password || !form.fullName) return
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: {
          data: { full_name: form.fullName },
          emailRedirectTo: `${window.location.origin}/`,
        }
      })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.session) {
        if (form.phone) {
          await supabase.from('users').update({ phone: form.phone, full_name: form.fullName }).eq('id', data.user!.id)
        }
        router.push('/?welcome=1')
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const inputStyle = {
    width:'100%', fontSize:'15px', padding:'13px 14px',
    backgroundColor:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.12)',
    borderRadius:'6px', color:'#ffffff',
    outline:'none', boxSizing:'border-box' as const,
    marginTop:'6px',
  }

  const labelStyle = {
    fontSize:'10px', letterSpacing:'0.12em', textTransform:'uppercase' as const,
    color:'rgba(255,255,255,0.4)', display:'block',
  }

  if (success) return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'400px', textAlign:'center'}}>
        <Link href="/" style={{fontSize:'12px', fontWeight:'700', letterSpacing:'0.22em', color:'#ffffff', textDecoration:'none', display:'block', marginBottom:'36px'}}>DALAMAN.ME</Link>
        <div style={{width:'60px', height:'60px', borderRadius:'50%', backgroundColor:'rgba(244,185,66,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'24px'}}>✉</div>
        <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', marginBottom:'10px'}}>Check your email</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', marginBottom:'8px'}}>
          We sent a confirmation link to <strong style={{color:'rgba(255,255,255,0.8)'}}>{form.email}</strong>
        </p>
        <p style={{fontSize:'13px', color:'rgba(255,255,255,0.35)', marginBottom:'28px'}}>Click the link to activate your account.</p>
        <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'400px'}}>
        <div style={{textAlign:'center', marginBottom:'36px'}}>
          <Link href="/" style={{fontSize:'12px', fontWeight:'700', letterSpacing:'0.22em', color:'#ffffff', textDecoration:'none'}}>DALAMAN.ME</Link>
        </div>

        <div style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'32px'}}>
          <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', marginBottom:'6px', textAlign:'center'}}>Create account</h1>
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.45)', textAlign:'center', marginBottom:'28px'}}>
            Already have one?{' '}
            <Link href="/auth/signin/" style={{color:'#f4b942', textDecoration:'none', fontWeight:'500'}}>Sign in</Link>
          </p>

          <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
            {[
              { label:'Full name *', key:'fullName', type:'text', placeholder:'Tom Henriksen' },
              { label:'Email *', key:'email', type:'email', placeholder:'you@email.com' },
              { label:'Phone', key:'phone', type:'tel', placeholder:'+47 900 00000' },
              { label:'Password *', key:'password', type:'password', placeholder:'Min. 8 characters' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type={f.type}
                  value={(form as any)[f.key]}
                  placeholder={f.placeholder}
                  onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  onKeyDown={e => e.key === 'Enter' && handleSignUp()}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          {error && (
            <div style={{backgroundColor:'rgba(162,45,45,0.15)', border:'1px solid rgba(162,45,45,0.3)', borderRadius:'6px', padding:'10px 14px', marginTop:'16px'}}>
              <p style={{fontSize:'13px', color:'#f09595', margin:'0', textAlign:'center'}}>{error}</p>
            </div>
          )}

          <button
            onClick={handleSignUp}
            disabled={loading || !form.email || !form.password || !form.fullName}
            style={{
              width:'100%', padding:'14px', marginTop:'20px',
              backgroundColor:(!loading&&form.email&&form.password&&form.fullName)?'#f4b942':'rgba(244,185,66,0.3)',
              color:(!loading&&form.email&&form.password&&form.fullName)?'#0f1419':'rgba(255,255,255,0.3)',
              fontWeight:'600', fontSize:'13px', letterSpacing:'0.06em',
              textTransform:'uppercase', borderRadius:'6px', border:'none',
              cursor:(!loading&&form.email&&form.password&&form.fullName)?'pointer':'not-allowed',
            }}
          >
            {loading ? 'Creating...' : 'Create account →'}
          </button>
        </div>
      </div>
    </div>
  )
}
