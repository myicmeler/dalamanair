'use client'
import Link from 'next/link'
import Image from 'next/image'

export default function ProviderWelcome() {
  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 16px'}}>
      <style>{`* { box-sizing: border-box; }`}</style>

      <Link href="/" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textDecoration:'none', marginBottom:'40px'}}>
        <Image src="/logo.jpg" alt="dalaman.me" width={64} height={64} style={{borderRadius:'50%', objectFit:'cover'}} />
        <span style={{fontSize:'12px', fontWeight:700, letterSpacing:'0.2em', color:'#ffffff'}}>dalaman.me</span>
      </Link>

      <div style={{width:'100%', maxWidth:'480px', backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'40px 32px', textAlign:'center'}}>

        {/* Success icon */}
        <div style={{width:'72px', height:'72px', borderRadius:'50%', backgroundColor:'rgba(244,185,66,0.12)', border:'1px solid rgba(244,185,66,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:'32px'}}>
          ✓
        </div>

        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'10px'}}>Email confirmed</p>
        <h1 style={{fontSize:'24px', fontWeight:'500', color:'#ffffff', marginBottom:'12px'}}>You're all set!</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', marginBottom:'32px'}}>
          Welcome to dalaman.me. Your provider account is active and you're ready to start receiving transfer quote requests from customers.
        </p>

        {/* Next steps */}
        <div style={{textAlign:'left', marginBottom:'32px'}}>
          <p style={{fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'14px'}}>Next steps</p>
          {[
            { icon:'🚐', title:'Add your vehicles', desc:'Add the vehicles you use for transfers so customers can see what they\'re getting.', href:'/provider/vehicles/' },
            { icon:'👤', title:'Complete your profile', desc:'Add your phone number and company description to build trust with customers.', href:'/provider/profile/' },
            { icon:'📋', title:'Watch for quote requests', desc:'You\'ll get an email when a customer requests a transfer. Log in to submit your price.', href:'/provider/quotes/' },
          ].map((step, i) => (
            <Link key={i} href={step.href} style={{display:'flex', gap:'14px', padding:'14px', backgroundColor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', marginBottom:'8px', textDecoration:'none', transition:'border-color 0.15s'}}>
              <span style={{fontSize:'20px', flexShrink:0}}>{step.icon}</span>
              <div>
                <div style={{fontSize:'13px', fontWeight:'500', color:'#ffffff', marginBottom:'3px'}}>{step.title}</div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', lineHeight:'1.5'}}>{step.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link href="/provider/" style={{display:'block', width:'100%', padding:'15px', backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'6px', fontSize:'14px', fontWeight:'700', letterSpacing:'0.06em', textTransform:'uppercase', textDecoration:'none'}}>
          Go to my dashboard →
        </Link>

        <p style={{fontSize:'12px', color:'rgba(255,255,255,0.25)', marginTop:'20px', lineHeight:'1.6'}}>
          Questions? Email us at <a href="mailto:post@dalaman.me" style={{color:'rgba(255,255,255,0.4)', textDecoration:'none'}}>post@dalaman.me</a>
        </p>
      </div>
    </div>
  )
}
