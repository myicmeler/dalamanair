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
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({
      email:form.email, password:form.password,
      options:{ data:{ full_name:form.fullName }, emailRedirectTo:`${window.location.origin}/` }
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.session) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && form.phone) {
        await (supabase as any).from('users').update({ phone:form.phone, full_name:form.fullName }).eq('id', user.id)
      }
      router.push('/?welcome=1')
    } else { setSuccess(true); setLoading(false) }
  }

  const inputStyle = { width:'100%', fontSize:'16px', padding:'14px 12px', marginTop:'4px', borderRadius:'6px' }

  if (success) return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{maxWidth:'380px', textAlign:'center'}}>
        <Link href="/" style={{fontSize:'11px', letterSpacing:'0.22em', color:'#0f1419', display:'block', marginBottom:'32px', textDecoration:'none', fontWeight:'500'}}>DALAMANAIR</Link>
        <div style={{width:'56px', height:'56px', borderRadius:'50%', backgroundColor:'rgba(244,185,66,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'24px'}}>✓</div>
        <h1 style={{fontSize:'24px', fontWeight:'500', color:'#0f1419', marginBottom:'10px'}}>Check your email</h1>
        <p style={{fontSize:'14px', color:'#5a574f', marginBottom:'20px'}}>We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your account.</p>
        <Link href="/auth/signin" style={{fontSize:'13px', color:'#8a8680', textDecoration:'underline'}}>← Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'380px'}}>
        <Link href="/" style={{fontSize:'11px', letterSpacing:'0.22em', color:'#0f1419', display:'block', textAlign:'center', marginBottom:'32px', textDecoration:'none', fontWeight:'500'}}>DALAMANAIR</Link>
        <h1 style={{fontSize:'28px', fontWeight:'500', color:'#0f1419', textAlign:'center', marginBottom:'8px'}}>Create account</h1>
        <p style={{fontSize:'14px', color:'#8a8680', textAlign:'center', marginBottom:'28px'}}>
          Already have one? <Link href="/auth/signin" style={{color:'#0f1419', textDecoration:'underline'}}>Sign in</Link>
        </p>
        <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'12px', padding:'24px', display:'flex', flexDirection:'column', gap:'16px'}}>
          {[
            {label:'Full name', key:'fullName' as const, type:'text', placeholder:'Tom Henriksen'},
            {label:'Email', key:'email' as const, type:'email', placeholder:'you@email.com'},
            {label:'Phone', key:'phone' as const, type:'tel', placeholder:'+44 7700...'},
            {label:'Password', key:'password' as const, type:'password', placeholder:'••••••••'},
          ].map(f => (
            <div key={f.key}>
              <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'#8a8680'}}>{f.label}</label>
              <input type={f.type} value={form[f.key]} placeholder={f.placeholder}
                onChange={e => setForm(p => ({...p, [f.key]:e.target.value}))} style={inputStyle} />
            </div>
          ))}
          {error && <p style={{fontSize:'13px', color:'#A32D2D', textAlign:'center'}}>{error}</p>}
          <button onClick={handleSignUp} disabled={loading||!form.email||!form.password||!form.fullName} style={{
            width:'100%', backgroundColor:(loading||!form.email||!form.password||!form.fullName)?'#fad98a':'#f4b942',
            color:'#0f1419', fontWeight:'600', fontSize:'14px', letterSpacing:'0.05em',
            textTransform:'uppercase', padding:'15px', borderRadius:'6px',
            border:'none', cursor:(loading||!form.email||!form.password||!form.fullName)?'not-allowed':'pointer'
          }}>
            {loading ? 'Creating...' : 'Create account →'}
          </button>
        </div>
      </div>
    </div>
  )
}
