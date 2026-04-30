'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/ui/Nav'

function ConfirmationContent() {
  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>
      <Nav />
      <div style={{maxWidth:'480px', margin:'0 auto', padding:'60px 20px', textAlign:'center'}}>
        <div style={{width:'64px', height:'64px', borderRadius:'50%', backgroundColor:'rgba(244,185,66,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:'28px'}}>✓</div>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'10px'}}>Booking confirmed</p>
        <h1 style={{fontSize:'26px', fontWeight:'500', color:'#0f1419', marginBottom:'12px'}}>You're all set!</h1>
        <p style={{fontSize:'14px', color:'#5a574f', lineHeight:'1.7', marginBottom:'8px'}}>
          Your transfer is confirmed. Your driver will meet you at arrivals with a name board.
        </p>
        <p style={{fontSize:'14px', color:'#5a574f', lineHeight:'1.7', marginBottom:'32px'}}>
          💵 Payment is made directly to your driver on the day of transfer — cash or card.
        </p>
        <div style={{display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap'}}>
          <Link href="/bookings/" style={{padding:'12px 24px', backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'6px', fontSize:'13px', fontWeight:'500', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase'}}>
            View my bookings →
          </Link>
          <Link href="/" style={{padding:'12px 24px', border:'1px solid #e5e3dd', color:'#5a574f', borderRadius:'6px', fontSize:'13px', textDecoration:'none'}}>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}} />}>
      <ConfirmationContent />
    </Suspense>
  )
}
