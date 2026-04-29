import Image from 'next/image'
import Link from 'next/link'

export default function HowItWorks() {
  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>
      {/* Nav */}
      <div style={{backgroundColor:'#0f1419', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'56px'}}>
        <Link href="/" style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
          <Image src="/logo.jpg" alt="dalaman.me" width={36} height={36} style={{borderRadius:'50%', objectFit:'cover'}} />
          <span style={{fontSize:'13px', fontWeight:'700', letterSpacing:'0.12em', color:'#ffffff'}}>dalaman.me</span>
        </Link>
        <Link href="/auth/signin/" style={{fontSize:'11px', fontWeight:'600', letterSpacing:'0.08em', textTransform:'uppercase', backgroundColor:'#f4b942', color:'#0f1419', padding:'8px 16px', borderRadius:'4px', textDecoration:'none'}}>Sign in</Link>
      </div>

      {/* Hero */}
      <div style={{backgroundColor:'#0f1419', padding:'48px 20px 56px'}}>
        <div style={{maxWidth:'700px', margin:'0 auto', textAlign:'center'}}>
          <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'14px'}}>Simple · Fast · Reliable</p>
          <h1 style={{fontSize:'clamp(28px, 5vw, 48px)', fontWeight:'400', color:'#ffffff', lineHeight:'1.15', marginBottom:'14px'}}>
            How dalaman.me works
          </h1>
          <p style={{fontSize:'15px', color:'rgba(255,255,255,0.6)', lineHeight:'1.7'}}>
            From search to arrival — here is everything you need to know about booking a transfer through dalaman.me.
          </p>
        </div>
      </div>

      <div style={{maxWidth:'800px', margin:'0 auto', padding:'56px 20px'}}>

        {/* For customers */}
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'8px'}}>For customers</p>
        <h2 style={{fontSize:'26px', fontWeight:'500', color:'#0f1419', marginBottom:'32px'}}>Booking a transfer</h2>

        {[
          { num:'01', title:'Search for your route', desc:'Enter your pick-up location (e.g. Dalaman Airport), your destination (e.g. Içmeler), your travel date, time and number of passengers. Click Search transfers.' },
          { num:'02', title:'Compare and choose', desc:'Browse available vehicles from vetted local transfer companies. Compare prices, vehicle types and passenger capacity. All prices are fixed — what you see is what you pay.' },
          { num:'03', title:'Book and confirm', desc:'Select your vehicle, enter your name, email, phone and flight number. Confirm your booking — you\'ll receive a confirmation email immediately.' },
          { num:'04', title:'Your driver meets you', desc:'On the day, your driver will be at arrivals with a name board showing your name. If your flight is delayed, your driver is updated automatically — no extra charge.' },
          { num:'05', title:'Pay on the day', desc:'Payment is made directly to the driver on the day of transfer. No upfront card payment required through dalaman.me.' },
          { num:'06', title:'Leave a review', desc:'After your transfer you\'ll receive a review request by email. Your feedback helps other travellers and rewards the best providers.' },
        ].map(s => (
          <div key={s.num} style={{display:'flex', gap:'24px', marginBottom:'32px', alignItems:'flex-start'}}>
            <div style={{fontSize:'13px', fontWeight:'600', color:'#f4b942', letterSpacing:'0.1em', minWidth:'32px', paddingTop:'2px'}}>{s.num}</div>
            <div style={{flex:1, borderBottom:'1px solid #e5e3dd', paddingBottom:'32px'}}>
              <h3 style={{fontSize:'17px', fontWeight:'500', color:'#0f1419', marginBottom:'8px'}}>{s.title}</h3>
              <p style={{fontSize:'14px', color:'#5a574f', lineHeight:'1.7', margin:0}}>{s.desc}</p>
            </div>
          </div>
        ))}

        {/* Divider */}
        <div style={{height:'1px', backgroundColor:'#e5e3dd', margin:'48px 0'}} />

        {/* Quote requests */}
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'8px'}}>Alternative</p>
        <h2 style={{fontSize:'26px', fontWeight:'500', color:'#0f1419', marginBottom:'16px'}}>Request a custom quote</h2>
        <p style={{fontSize:'14px', color:'#5a574f', lineHeight:'1.7', marginBottom:'28px'}}>
          If you have special requirements — a large group, extra luggage, specific vehicle type, or a non-standard route — you can submit a quote request instead of booking directly.
        </p>
        {[
          { title:'Submit your request', desc:'Fill in your route, date, passenger count and any special requirements. Your request is sent to all approved providers on the platform.' },
          { title:'Receive competitive offers', desc:'Providers submit their best price privately — they cannot see each other\'s offers. You\'ll receive an email notification for each offer that arrives.' },
          { title:'Accept the best offer', desc:'Review the offers on your quotes page and accept the one you prefer. A confirmed booking is created automatically — no payment upfront.' },
        ].map((s, i) => (
          <div key={i} style={{display:'flex', gap:'16px', marginBottom:'20px', alignItems:'flex-start', backgroundColor:'#f5f2ea', border:'1px solid #e5e3dd', borderRadius:'8px', padding:'20px'}}>
            <div style={{width:'28px', height:'28px', borderRadius:'50%', backgroundColor:'#f4b942', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'600', color:'#0f1419', flexShrink:0}}>
              {i+1}
            </div>
            <div>
              <h4 style={{fontSize:'15px', fontWeight:'500', color:'#0f1419', marginBottom:'6px'}}>{s.title}</h4>
              <p style={{fontSize:'13px', color:'#5a574f', lineHeight:'1.6', margin:0}}>{s.desc}</p>
            </div>
          </div>
        ))}

        <div style={{height:'1px', backgroundColor:'#e5e3dd', margin:'48px 0'}} />

        {/* FAQ */}
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'8px'}}>Common questions</p>
        <h2 style={{fontSize:'26px', fontWeight:'500', color:'#0f1419', marginBottom:'28px'}}>Frequently asked questions</h2>

        {[
          { q:'Are the prices really fixed?', a:'Yes. The price shown at booking is the final price. There are no hidden fees, no fuel surcharges and no meter running. What you see is what you pay.' },
          { q:'What if my flight is delayed?', a:'Enter your flight number when booking. Your driver tracks your flight and adjusts pick-up time automatically at no extra cost.' },
          { q:'Can I cancel or change my booking?', a:'Contact the provider directly using the contact details in your confirmation email. Cancellation policies vary by provider.' },
          { q:'Who are the transfer providers?', a:'dalaman.me is an independent booking platform. All transfer companies listed are reviewed and approved by us before they can take bookings. We require valid insurance and TURSAB registration where applicable.' },
          { q:'How do I pay?', a:'Payment is made directly to your driver in cash or by card on the day of transfer. No upfront payment is required through dalaman.me.' },
          { q:'Is dalaman.me the transfer company?', a:'No. dalaman.me is a booking platform that connects travellers with local transfer operators. Your transfer is carried out by the provider you selected at booking.' },
        ].map((faq, i) => (
          <div key={i} style={{borderBottom:'1px solid #e5e3dd', padding:'20px 0'}}>
            <h4 style={{fontSize:'15px', fontWeight:'500', color:'#0f1419', marginBottom:'8px'}}>{faq.q}</h4>
            <p style={{fontSize:'13px', color:'#5a574f', lineHeight:'1.7', margin:0}}>{faq.a}</p>
          </div>
        ))}

        <div style={{marginTop:'48px', backgroundColor:'#0f1419', borderRadius:'10px', padding:'32px', textAlign:'center'}}>
          <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'10px'}}>Ready?</p>
          <h3 style={{fontSize:'22px', fontWeight:'400', color:'#ffffff', marginBottom:'20px'}}>Search transfers now</h3>
          <Link href="/" style={{display:'inline-block', backgroundColor:'#f4b942', color:'#0f1419', padding:'13px 28px', borderRadius:'4px', fontSize:'13px', fontWeight:'600', letterSpacing:'0.06em', textTransform:'uppercase', textDecoration:'none'}}>
            Search transfers →
          </Link>
        </div>

        {/* Disclaimer */}
        <p style={{fontSize:'11px', color:'#8a8680', lineHeight:'1.6', marginTop:'32px', textAlign:'center'}}>
          dalaman.me is an independent booking platform connecting travellers with local transfer providers. Transfers are operated by approved third-party companies.
        </p>
      </div>
    </div>
  )
}
