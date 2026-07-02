'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'
import { callFunction } from '@/lib/functions'

// ---- Country dial codes for the Phone / WhatsApp field ----
type DialCode = { iso: string; name: string; dial: string; flag: string }
const COMMON_CODES: DialCode[] = [
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { iso: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { iso: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { iso: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { iso: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { iso: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
]
const ALL_CODES: DialCode[] = [
  { iso: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
  { iso: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { iso: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { iso: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { iso: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬' },
  { iso: 'BA', name: 'Bosnia & Herzegovina', dial: '+387', flag: '🇧🇦' },
  { iso: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { iso: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷' },
  { iso: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾' },
  { iso: 'CZ', name: 'Czechia', dial: '+420', flag: '🇨🇿' },
  { iso: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { iso: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪' },
  { iso: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { iso: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺' },
  { iso: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸' },
  { iso: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { iso: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { iso: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { iso: 'IT', name: 'Italy',
