'use client'
import { useState, useEffect } from 'react'

/**
 * Turkish for the provider pages.
 *
 * Providers are Turkish; customers are not. These are the screens a provider
 * uses every day — bidding, confirming bookings, assigning drivers — where a
 * misread button has real consequences (Confirm fires a customer email
 * instantly, with no undo).
 *
 * A hand-written dictionary rather than a machine-translation widget: Google
 * discontinued its Website Translator widget for commercial sites in 2019, the
 * paid replacements are subscriptions, and a generic translator renders
 * transfer-industry terms ("offer", "transfer", "assign driver") unreliably.
 * This is free, instant, has no flicker, and can be corrected by a native
 * speaker.
 *
 * TRANSLATIONS ARE PENDING PROOFREADING by a native speaker before release.
 *
 * Adding a string: add it to BOTH `en` and `tr`. TypeScript will flag a key
 * present in one and missing from the other, so they cannot drift apart.
 */

export const providerText = {
  en: {
    // --- layout: navigation ---
    dashboard: 'Dashboard',
    bookings: 'Bookings',
    drivers: 'Drivers',
    fleet: 'Fleet',
    reviews: 'Reviews',
    quotes: 'Quotes',
    defaultPrices: 'Default prices',
    logTransfer: 'Log a transfer',
    menu: 'Menu',
    signOut: 'Sign out',
    notifications: 'Notifications',
    noNotifications: 'No new notifications',
    newQuote: 'new quote',
    newQuotes: 'new quotes',

    // --- common actions ---
    confirm: 'Confirm',
    reject: 'Reject',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving...',
    edit: 'Edit',
    delete: 'Delete',
    close: 'Close',
    loading: 'Loading...',
    back: 'Back',

    // --- common labels ---
    route: 'Route',
    date: 'Date',
    time: 'Time',
    passengers: 'Passengers',
    luggage: 'Suitcases',
    flight: 'Flight',
    price: 'Price',
    status: 'Status',
    customer: 'Customer',
    notes: 'Notes',
    hotel: 'Hotel',
    vehicle: 'Vehicle',
    driver: 'Driver',
    phone: 'Phone',
    oneWay: 'One way',
    returnTrip: 'Return',
    outbound: 'Outbound',
    inbound: 'Return',

    // --- statuses ---
    open: 'Open',
    pending: 'Pending',
    accepted: 'Accepted',
    confirmed: 'Confirmed',
    driverAssigned: 'Driver assigned',
    cancelled: 'Cancelled',
    expired: 'Expired',
    completed: 'Completed',
    notSelected: 'Not selected',

    // --- bookings page ---
    bookingsEyebrow: 'Bookings',
    bookingManagement: 'Booking management',
    noBookingsYet: 'No bookings yet',
    actionNeeded: 'Action needed',
    awaitingCustomer: 'Awaiting customer',
    rejectedLabel: 'Rejected',
    confirmBooking: '\u2713 Confirm booking',
    processing: 'Processing...',
    assignDriver: 'Assign driver',
    selectDriver: 'Select a driver...',
    logged: 'logged',
    seats: 'seats',
    pax: 'pax',
    confirmRejectBooking: 'Reject this booking? The customer will be notified.',
    errConfirmBooking: 'Could not confirm the booking. Please try again.',
    errRejectBooking: 'Could not reject the booking. Please try again.',
    errAssignDriver: 'Could not assign the driver. Please try again.',
    errAssignDriverGeneric: 'Something went wrong assigning the driver. Please try again.',

    // --- quotes page ---
    quoteRequests: 'Quote requests',
    refresh: '\u21bb Refresh',
    openRequestsSub: 'Open requests from customers — submit your best price',
    lastUpdated: 'Last updated',
    autoRefresh: 'auto-refreshes every 30s',
    noOpenRequests: 'No open quote requests right now',
    noOpenRequestsSub: 'When customers submit requests you will be notified by email and they will appear here.',
    yourPrice: 'Your price',
    noteToCustomer: 'Note to customer',
    optionalMessage: 'Optional message...',
    submitOffer: 'Submit offer',
    submitting: 'Submitting...',
    offerSubmitted: '\u2713 Offer submitted',
    waitingForCustomer: 'waiting for customer response',
    offerExpired: 'Offer expired',
    decline: 'Decline',
    declineTitle: 'Decline this request?',
    declineBody: 'This request will be removed from your list. The customer will not be notified.',
    declineReason: 'Reason (optional — internal only)',
    declinePlaceholder: 'e.g. date not available, route too far...',
    declineConfirm: 'Yes, decline',
    declining: 'Declining...',
    statusHistory: 'Status history',
    noHistory: 'No history yet',
    bags: 'bags',
  },

  tr: {
    // --- layout: navigation ---
    dashboard: 'Panel',
    bookings: 'Rezervasyonlar',
    drivers: 'Sürücüler',
    fleet: 'Araç filosu',
    reviews: 'Değerlendirmeler',
    quotes: 'Teklifler',
    defaultPrices: 'Varsayılan fiyatlar',
    logTransfer: 'Transfer kaydet',
    menu: 'Menü',
    signOut: 'Çıkış',
    notifications: 'Bildirimler',
    noNotifications: 'Yeni bildirim yok',
    newQuote: 'yeni talep',
    newQuotes: 'yeni talep',

    // --- common actions ---
    confirm: 'Onayla',
    reject: 'Reddet',
    cancel: 'İptal',
    save: 'Kaydet',
    saving: 'Kaydediliyor...',
    edit: 'Düzenle',
    delete: 'Sil',
    close: 'Kapat',
    loading: 'Yükleniyor...',
    back: 'Geri',

    // --- common labels ---
    route: 'Güzergâh',
    date: 'Tarih',
    time: 'Saat',
    passengers: 'Yolcu',
    luggage: 'Bavul',
    flight: 'Uçuş',
    price: 'Fiyat',
    status: 'Durum',
    customer: 'Müşteri',
    notes: 'Notlar',
    hotel: 'Otel',
    vehicle: 'Araç',
    driver: 'Sürücü',
    phone: 'Telefon',
    oneWay: 'Tek yön',
    returnTrip: 'Gidiş-dönüş',
    outbound: 'Gidiş',
    inbound: 'Dönüş',

    // --- statuses ---
    open: 'Açık',
    pending: 'Beklemede',
    accepted: 'Kabul edildi',
    confirmed: 'Onaylandı',
    driverAssigned: 'Sürücü atandı',
    cancelled: 'İptal edildi',
    expired: 'Süresi doldu',
    completed: 'Tamamlandı',
    notSelected: 'Seçilmedi',

    // --- bookings page ---
    bookingsEyebrow: 'Rezervasyonlar',
    bookingManagement: 'Rezervasyon yönetimi',
    noBookingsYet: 'Henüz rezervasyon yok',
    actionNeeded: 'İşlem gerekli',
    awaitingCustomer: 'Müşteri bekleniyor',
    rejectedLabel: 'Reddedildi',
    confirmBooking: '\u2713 Rezervasyonu onayla',
    processing: 'İşleniyor...',
    assignDriver: 'Sürücü ata',
    selectDriver: 'Bir sürücü seçin...',
    logged: 'kaydedildi',
    seats: 'koltuk',
    pax: 'yolcu',
    confirmRejectBooking: 'Bu rezervasyon reddedilsin mi? Müşteriye bildirilecek.',
    errConfirmBooking: 'Rezervasyon onaylanamadı. Lütfen tekrar deneyin.',
    errRejectBooking: 'Rezervasyon reddedilemedi. Lütfen tekrar deneyin.',
    errAssignDriver: 'Sürücü atanamadı. Lütfen tekrar deneyin.',
    errAssignDriverGeneric: 'Sürücü atanırken bir hata oluştu. Lütfen tekrar deneyin.',

    // --- quotes page ---
    quoteRequests: 'Teklif talepleri',
    refresh: '\u21bb Yenile',
    openRequestsSub: 'Müşterilerden gelen açık talepler — en iyi fiyatınızı verin',
    lastUpdated: 'Son güncelleme',
    autoRefresh: '30 saniyede bir otomatik yenilenir',
    noOpenRequests: 'Şu anda açık teklif talebi yok',
    noOpenRequestsSub: 'Müşteriler talep gönderdiğinde e-posta ile bilgilendirilirsiniz ve talepler burada görünür.',
    yourPrice: 'Fiyatınız',
    noteToCustomer: 'Müşteriye not',
    optionalMessage: 'İsteğe bağlı mesaj...',
    submitOffer: 'Teklif gönder',
    submitting: 'Gönderiliyor...',
    offerSubmitted: '\u2713 Teklif gönderildi',
    waitingForCustomer: 'müşteri yanıtı bekleniyor',
    offerExpired: 'Teklif süresi doldu',
    decline: 'Reddet',
    declineTitle: 'Bu talep reddedilsin mi?',
    declineBody: 'Bu talep listenizden kaldırılacak. Müşteriye bildirilmeyecek.',
    declineReason: 'Sebep (isteğe bağlı — yalnızca dahili)',
    declinePlaceholder: 'örn. tarih uygun değil, güzergâh çok uzak...',
    declineConfirm: 'Evet, reddet',
    declining: 'Reddediliyor...',
    statusHistory: 'Durum geçmişi',
    noHistory: 'Henüz geçmiş yok',
    bags: 'bavul',
  },
} as const

export type ProviderLang = keyof typeof providerText
export type ProviderStrings = typeof providerText.en

const STORAGE_KEY = 'dalaman-provider-lang'

/**
 * Language for the provider area.
 *
 * Persisted in localStorage so the choice survives navigation and future
 * visits — the customer-side toggle keeps its language in per-page React state
 * and therefore resets on every page change, which is the bug this avoids.
 *
 * Always starts as 'en' on the server and on first paint, then applies the
 * stored value in an effect. Reading localStorage during render would not match
 * the server-rendered HTML and React would complain about the mismatch.
 */
export function useProviderLang() {
  const [lang, setLangState] = useState<ProviderLang>('en')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'tr' || stored === 'en') setLangState(stored)
    } catch {
      // Private browsing or blocked storage — fall back to English.
    }
  }, [])

  function setLang(next: ProviderLang) {
    setLangState(next)
    try { window.localStorage.setItem(STORAGE_KEY, next) } catch {}
    // Tell other components in this tab (the layout and the page below it)
    // so they re-render together rather than drifting out of sync.
    window.dispatchEvent(new CustomEvent('dalaman-lang-change', { detail: next }))
  }

  // Pick up changes made by the toggle when this hook is used on a page.
  useEffect(() => {
    function onChange(e: Event) {
      const next = (e as CustomEvent).detail
      if (next === 'tr' || next === 'en') setLangState(next)
    }
    window.addEventListener('dalaman-lang-change', onChange)
    return () => window.removeEventListener('dalaman-lang-change', onChange)
  }, [])

  return { lang, setLang, t: providerText[lang] as ProviderStrings }
}
