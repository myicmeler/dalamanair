'use client'
import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'

const faqs = [
  {
    category: 'Bookings',
    items: [
      { q:'How do I book a transfer?', a:'Enter your route, date, time and passengers on the homepage and submit a quote request. Approved local providers send you their best prices; you compare them on your quotes page and accept the one you like. The provider then confirms and you acknowledge to finalise — you\'re notified by email at each step.' },
      { q:'Can I request a return transfer?', a:'Yes — tick "Add return journey" when you request a quote and enter your return date and time. Providers quote a single price covering both legs.' },
      { q:'How do offers work?', a:'Your request goes to all approved providers at once. They submit their best price privately — blind bidding, so they can\'t see each other\'s offers. You pick the offer you prefer; there\'s no obligation to accept any.' },
      { q:'How far in advance should I request a transfer?', a:'We recommend requesting at least a few days before travel so providers have time to respond — quote requests stay open for 48 hours. For peak season (July–August) the earlier the better.' },
    ]
  },
  {
    category: 'Drivers & pick-up',
    items: [
      { q:'Where will my driver meet me?', a:'Your driver will be waiting in the arrivals hall at Dalaman Airport with a name board showing your name. For hotel pick-ups, the driver will meet you at reception.' },
      { q:'What if my flight is delayed?', a:'Enter your flight number when booking. Your driver tracks your flight and adjusts pick-up time automatically — no extra charge.' },
      { q:'What if I cannot find my driver?', a:'Contact the provider directly using the phone number in your confirmation email. You can also contact us at hello@dalaman.me.' },
      { q:'Do drivers speak English?', a:'All approved providers on dalaman.me operate with English-speaking drivers. If you have specific language requirements, add a note when booking.' },
    ]
  },
  {
    category: 'Prices & payment',
    items: [
      { q:'Are prices fixed?', a:'Yes. The price you accept from a provider is the final price. No hidden fees, no fuel surcharges, no meter running.' },
      { q:'How do I pay?', a:'Payment is made directly to your driver in cash or by card on the day of transfer. No upfront payment is required through dalaman.me.' },
      { q:'Why are prices different between providers?', a:'Each transfer company sets their own prices. Differences reflect vehicle type, company size, and included services such as meet & greet or child seats.' },
      { q:'Is there a charge if I cancel?', a:'Cancellation policies are set by individual providers. Check your confirmation email for the provider\'s contact details and cancellation terms.' },
    ]
  },
  {
    category: 'About dalaman.me',
    items: [
      { q:'Who operates the transfers?', a:'dalaman.me is a booking platform, not a transfer operator. All transfers are carried out by approved local transfer companies. We review and verify every provider before they join the platform.' },
      { q:'How do providers get approved?', a:'We require valid insurance documentation and TURSAB registration where applicable. Providers are also monitored through customer reviews.' },
      { q:'What if something goes wrong with my transfer?', a:'Contact us at hello@dalaman.me and we will do our best to help resolve the issue with the provider.' },
      { q:'Can I become a provider on dalaman.me?', a:'Yes — visit dalaman.me/provider to learn more about joining as a transfer provider.' },
    ]
  },
]

export default function HelpPage() {
  const [open, setOpen] = useState<string|null>(null)

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419'}}>
      {/* Nav */}
      <div style={{backgroundColor:'#0f1419', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'56px'}}>
        <Link href="/" style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
          <Image src="/logo.jpg" alt="dalaman.me" width={36} height={36} style={{borderRadius:'50%', objectFit:'cover'}} />
          <span style={{fontSize:'13px', fontWeight:'700', letterSpacing:'0.12em', color:'#ffffff'}}>dalaman.me</span>
        </Link>
        <Link href="/auth/signin/" style={{fontSize:'11px', fontWeight:'600', letterSpacing:'0.08em', textTransform:'uppercase', backgroundColor:'#f4b942', color:'#ffffff', padding:'8px 16px', borderRadius:'4px', textDecoration:'none'}}>Sign in</Link>
      </div>

      {/* Hero */}
      <div style={{backgroundColor:'#0f1419', padding:'48px 20px 56px', textAlign:'center'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'14px'}}>Help centre</p>
        <h1 style={{fontSize:'clamp(26px, 5vw, 44px)', fontWeight:'400', color:'#ffffff', lineHeight:'1.15', marginBottom:'14px'}}>
          How can we help?
        </h1>
        <p style={{fontSize:'15px', color:'rgba(255,255,255,0.6)', lineHeight:'1.7', maxWidth:'480px', margin:'0 auto'}}>
          Find answers to common questions below, or contact us directly at{' '}
          <a href="mailto:hello@dalaman.me" style={{color:'#f4b942', textDecoration:'none'}}>hello@dalaman.me</a>
        </p>
      </div>

      <div style={{maxWidth:'720px', margin:'0 auto', padding:'48px 20px 64px'}}>

        {/* Quick contact */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'12px', marginBottom:'48px'}}>
          {[
            { icon:'✉', title:'Email us', desc:'hello@dalaman.me', href:'mailto:hello@dalaman.me' },
            { icon:'📋', title:'How it works', desc:'Full booking guide', href:'/how-it-works/' },
            { icon:'🚐', title:'For providers', desc:'Join dalaman.me', href:'/provider/' },
          ].map(c => (
            <a key={c.title} href={c.href} style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'20px', textDecoration:'none', display:'block', transition:'border-color 0.15s'}}>
              <div style={{fontSize:'24px', marginBottom:'8px'}}>{c.icon}</div>
              <div style={{fontSize:'14px', fontWeight:'500', color:'#ffffff', marginBottom:'4px'}}>{c.title}</div>
              <div style={{fontSize:'12px', color:'rgba(255,255,255,0.35)'}}>{c.desc}</div>
            </a>
          ))}
        </div>

        {/* FAQ sections */}
        {faqs.map(section => (
          <div key={section.category} style={{marginBottom:'40px'}}>
            <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'16px'}}>{section.category}</p>
            {section.items.map(faq => (
              <div key={faq.q} style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <button
                  onClick={() => setOpen(open === faq.q ? null : faq.q)}
                  style={{width:'100%', padding:'18px 0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', textAlign:'left', gap:'16px'}}
                >
                  <span style={{fontSize:'14px', fontWeight:'500', color:'#ffffff', lineHeight:'1.4'}}>{faq.q}</span>
                  <span style={{fontSize:'18px', color:'#f4b942', flexShrink:0, transform: open===faq.q ? 'rotate(45deg)' : 'none', transition:'transform 0.2s'}}>+</span>
                </button>
                {open === faq.q && (
                  <div style={{paddingBottom:'18px'}}>
                    <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', margin:0}}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Still need help */}
        <div style={{backgroundColor:'#0f1419', borderRadius:'10px', padding:'32px', textAlign:'center', marginTop:'48px'}}>
          <h3 style={{fontSize:'20px', fontWeight:'400', color:'#ffffff', marginBottom:'10px'}}>Still need help?</h3>
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', marginBottom:'20px', lineHeight:'1.6'}}>
            Can't find what you're looking for? Email us and we'll get back to you as soon as possible.
          </p>
          <a href="mailto:hello@dalaman.me" style={{display:'inline-block', backgroundColor:'#f4b942', color:'#ffffff', padding:'12px 24px', borderRadius:'4px', fontSize:'13px', fontWeight:'600', letterSpacing:'0.06em', textTransform:'uppercase', textDecoration:'none'}}>
            Email hello@dalaman.me →
          </a>
        </div>

        {/* Disclaimer */}
        <p style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', lineHeight:'1.6', marginTop:'32px', textAlign:'center'}}>
          dalaman.me is an independent booking platform connecting travellers with local transfer providers. Transfers are operated by approved third-party companies.
        </p>
      </div>
    </div>
  )
}
