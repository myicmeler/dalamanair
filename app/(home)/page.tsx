'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

const labels = {
  en: {
    tag:'Içmeler · Marmaris · Dalaman',
    h1a:'The smarter way to get from',
    h1b:'Dalaman airport to Marmaris and Içmeler.',
    sub:'Compare trusted local transfer companies, book in minutes, and arrive at your hotel without the stress.',
    oneway:'One way', return:'Return',
    pickup:'Pick-up', dropoff:'Drop-off',
    date:'Date', time:'Time', passengers:'Passengers',
    returnDate:'Return date', returnTime:'Return time', returnFrom:'Return pick-up',
    search:'Search transfers',
    why:'Why book with us',
    w1t:'Book before you fly', w1d:'Arrange your transfer from home. When you land, everything is already sorted — no queues, no touts, no hassle.',
    w2t:'Fixed prices', w2d:'The price you see is what you pay. No hidden fees, no meter running, no negotiating at the airport.',
    w3t:'Vetted local providers', w3d:'Every transfer company on dalaman.me is reviewed and approved by us. Only trusted, insured operators make the list.',
  },
  tr: {
    tag:'İçmeler · Marmaris · Dalaman',
    h1a:'Dalaman havalimanından',
    h1b:'Marmaris ve İçmeler\'e akıllı transfer.',
    sub:'Güvenilir yerel transfer şirketlerini karşılaştırın, dakikalar içinde rezervasyon yapın ve stressiz otelinize ulaşın.',
    oneway:'Tek yön', return:'Gidiş-dönüş',
    pickup:'Alış', dropoff:'Varış',
    date:'Tarih', time:'Saat', passengers:'Yolcular',
    returnDate:'Dönüş tarihi', returnTime:'Dönüş saati', returnFrom:'Dönüş alış',
    search:'Transfer ara',
    why:'Neden biz',
    w1t:'Uçmadan önce rezervasyon', w1d:'Transferinizi evden ayarlayın. İndiğinizde her şey hazır.',
    w2t:'Sabit fiyatlar', w2d:'Gördüğünüz fiyat ödediğiniz fiyattır. Gizli ücret yok.',
    w3t:'Onaylı yerel
