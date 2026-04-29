'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

const authStyles = `
  .auth-page {
    min-height: 100vh;
    background: #0f1419 !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    box-sizing: border-box;
  }
  .auth-card {
    width: 100%;
    max-width: 400px;
    background: #1a1f26;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 32px 24px;
    box-sizing: border-box;
  }
  .auth-input {
    display: block !important;
    width: 100% !important;
    box-sizing: border-box !important;
    font-size: 16px !important;
    padding: 14px !important;
    background: rgba(255,255,255,0.07) !important;
    border: 1px solid rgba(255,255,255,0.12) !important;
    border-radius: 6px !important;
    color: #ffffff !important;
    outline: none !important;
    margin-top: 8px !important;
    font-family: inherit !important;
    box-shadow: none !important;
  }
  .auth-input:focus { border-color: rgba(244,185,66,0.5) !important; }
  .auth-input:-webkit-autofill,
  .auth-input:-webkit-autofill:hover,
  .auth-input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 30px #1a1f26 inset !important;
    -webkit-text-fill-color: #ffffff !important;
  }
  .auth-btn {
    display: block !important;
    width: 100% !important;
    box-sizing: border-box !important;
    padding: 15px !important;
    border: none !important;
    border-radius: 6px !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    letter-spacing: 0.06em !important;
    text-transform: uppercase !important;
    font-family: inherit !important;
    margin-top: 20px !important;
  }
  .auth-btn:not(:disabled) { background: #f4b942 !important; color: #0f1419 !important; cursor: pointer !important; }
  .auth-btn:disabled { background: rgba(244,185,66,0.3) !important; color: rgba(255,255,255,0.3) !important; cursor: not-allowed !important; }
  .auth-label { display: block; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.4); }
  .auth-error { background: rgba(162,45,45,0.2); border: 1px solid rgba(162,45,45,0.4); border-radius: 6px; padding: 12px 14px; margin-top: 16px; text-align: center; font-size: 13px; color: #f09595; }
`

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', password:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSignUp() {
    if (!form.email || !form.password || !form.fullName || loading) return
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data:{ full_name: form.fullName }, emailRedirectTo:`${window.location.origin}/` }
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.session) router.replace('/')
    else { setSuccess(true); setLoading(false) }
  }

  const Logo = () => (
    <Link href="/" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textDecoration:'none', marginBottom:'32px'}}>
      <Image src="/logo.jpg" alt="dalaman.me" width={64} height={64} style={{borderRadius:'50%', objectFit:'cover'}} />
      <span style={{fontSize:'12px', fontWeight:'700', letterSpacing:'0.2em', color:'#ffffff'}}>dalaman.me</span>
    </Link>
  )

  if (success) return (
    <>
      <style>{authStyles}</style>
      <div className="auth-page" style={{textAlign:'center'}}>
        <Logo />
        <div style={{fontSize:'40px', marginBottom:'16px'}}>✉</div>
        <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', marginBottom:'10px'}}>Check your email</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', maxWidth:'320px', marginBottom:'24px'}}>
          We sent a confirmation link to{' '}
          <strong style={{color:'rgba(255,255,255,0.8)'}}>{form.email}</strong>.
          Click it to activate your account.
        </p>
        <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
      </div>
    </>
  )

  const fields = [
    { label:'Full name *', key:'fullName', type:'text', placeholder:'Tom Henriksen' },
    { label:'Email *', key:'email', type:'email', placeholder:'you@email.com' },
    { label:'Phone', key:'phone', type:'tel', placeholder:'+47 900 00000' },
    { label:'Password *', key:'password', type:'password', placeholder:'Min. 8 characters' },
  ]

  const canSubmit = form.email && form.password && form.fullName && !loading

  return (
    <>
      <style>{authStyles}</style>
      <div className="auth-page">
        <Logo />
        <div className="auth-card">
          <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Create account</h1>
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 24px'}}>
            Already have one?{' '}
            <Link href="/auth/signin/" style={{color:'#f4b942', textDecoration:'none', fontWeight:'500'}}>Sign in</Link>
          </p>
          <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
            {fields.map(f => (
              <div key={f.key}>
                <label className="auth-label">{f.label}</label>
                <input
                  className="auth-input"
                  type={f.type}
                  value={(form as any)[f.key]}
                  placeholder={f.placeholder}
                  onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  onKeyDown={e => e.key === 'Enter' && handleSignUp()}
                />
              </div>
            ))}
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" onClick={handleSignUp} disabled={!canSubmit}>
            {loading ? 'Creating...' : 'Create account →'}
          </button>
        </div>
      </div>
    </>
  )
}
