'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BookingPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/quote/')
  }, [])
  return <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}} />
}
