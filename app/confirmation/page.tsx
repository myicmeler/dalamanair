'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/ui/Nav'

function ConfirmationContent() {
  const params = useSearchParams()
  const ref = params.get('ref') ?? 'DMR-...'
  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>
      <Nav lang="en" />
      <div style={{maxWidth:'480px', margin:'0 auto', padding:'48px 20px', textAlign:'center'}}>
        <div style={{width:'64px', height:'64px', borderRadius:'50%', backgroundColor:'rgba(244,185,66,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:'28px', color:'#e0a528'}}>✓</div>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'10px'}}>Confirmed</p>
        <h1 style={{fontSize:'28px', fontWeight:'500', color:'#0f1419', marginBottom:'8px'}}>Booking confirmed</h1>
        <p style={{fontSize:'14px', color:'#5a574f', marginBottom:'8px'}}>Your transfer is booked. See you in Içmeler!</p>
        <p style={{fontSize:'11px', letterSpacing:'0.12em', color:'#8a8680', marginBottom:'32px', textTransform:'uppercase'}}>Ref: {ref}</p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'32px', textAlign:'left'}}>
          {[
            {label:'What next?', val:'Confirmation email on its way'},
            {label:'Driver details', val:'Sent 24h before pick-up'},
            {label:'After your trip', val:'Review request sent automatically'},
            {label:'Questions?', val:'help@dalaman.me'},
          ].map(c => (
            <div key={c.label} style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'8px', padding:'14px'}}>
              <p style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'#8a8680', marginBottom:'4px'}}>{c.label}</p>
              <p style={{fontSize:'12px', color:'#0f1419'}}>{c.val}</p>
            </div>
          ))}
        </div>
        <Link href="/" style={{fontSize:'13px', color:'#8a8680', textDecoration:'underline'}}>← Book another transfer</Link>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}/>}><ConfirmationContent /></Suspense>
}
