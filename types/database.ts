export type UserRole = 'customer' | 'provider' | 'driver' | 'admin'
export type Language = 'en' | 'tr'
export type BookingStatus = 'pending' | 'confirmed' | 'driver_assigned' | 'in_progress' | 'completed' | 'cancelled'
export type VehicleType = 'sedan' | 'minivan' | 'minibus' | 'luxury' | 'suv'
export type TripDirection = 'outbound' | 'inbound'
export type DriverStatus = 'available' | 'on_trip' | 'off_duty'

export interface User {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: UserRole
  preferred_language: Language
  avatar_url: string | null
  created_at: string
}

export interface Provider {
  id: string
  user_id: string
  parent_provider_id: string | null
  company_name: string
  contact_name: string | null
  phone: string | null
  description: string | null
  logo_url: string | null
  avg_rating: number
  total_reviews: number
  commission_pct: number
  is_approved: boolean
  is_subcontractor: boolean
  created_at: string
}

export interface Vehicle {
  id: string
  provider_id: string
  type: VehicleType
  make: string
  model: string
  year: number | null
  plate_number: string | null
  seats: number
  luggage_capacity: number
  features: string[]
  image_url: string | null
  is_active: boolean
}

export interface Driver {
  id: string
  user_id: string | null
  provider_id: string
  full_name: string
  phone: string
  licence_number: string | null
  photo_url: string | null
  preferred_language: Language
  status: DriverStatus
  is_active: boolean
}

export interface Location {
  id: string
  name: string
  name_tr: string | null
  type: 'airport' | 'hotel' | 'area' | 'port'
  address: string | null
  lat: number | null
  lng: number | null
  iata_code: string | null
  is_active: boolean
  sort_order: number
}

export interface Booking {
  id: string
  group_id: string
  customer_id: string
  provider_id: string | null
  vehicle_id: string | null
  driver_id: string | null
  pickup_location_id: string
  dropoff_location_id: string
  direction: TripDirection
  pickup_time: string
  passengers: number
  luggage: number
  status: BookingStatus
  price: number
  discount_pct: number
  final_price: number
  customer_notes: string | null
  flight_number: string | null
  completed_at: string | null
  created_at: string
  pickup?: Location
  dropoff?: Location
  vehicle?: Vehicle
  driver?: Driver
  provider?: Provider
}

export interface Payment {
  id: string
  booking_id: string
  stripe_payment_id: string | null
  amount: number
  currency: string
  status: string
  paid_at: string | null
}

export interface Review {
  id: string
  booking_id: string
  customer_id: string
  provider_id: string
  driver_id: string | null
  rating: number
  aspects: string[]
  comment: string | null
  is_published: boolean
  created_at: string
}

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Partial<User> & { id: string; email: string }
        Update: Partial<User>
      }
      providers: {
        Row: Provider
        Insert: Partial<Provider> & { user_id: string; company_name: string }
        Update: Partial<Provider>
      }
      vehicles: {
        Row: Vehicle
        Insert: Partial<Vehicle> & { provider_id: string; type: VehicleType; make: string; model: string; seats: number; luggage_capacity: number }
        Update: Partial<Vehicle>
      }
      drivers: {
        Row: Driver
        Insert: Partial<Driver> & { provider_id: string; full_name: string; phone: string }
        Update: Partial<Driver>
      }
      locations: {
        Row: Location
        Insert: Partial<Location> & { name: string; type: string }
        Update: Partial<Location>
      }
      bookings: {
        Row: Booking
        Insert: Partial<Booking> & { customer_id: string; pickup_location_id: string; dropoff_location_id: string; direction: TripDirection; pickup_time: string; price: number; final_price: number }
        Update: Partial<Booking>
      }
      payments: {
        Row: Payment
        Insert: Partial<Payment> & { booking_id: string; amount: number; currency: string }
        Update: Partial<Payment>
      }
      reviews: {
        Row: Review
        Insert: Partial<Review> & { booking_id: string; customer_id: string; provider_id: string; rating: number }
        Update: Partial<Review>
      }
      notifications: {
        Row: any
        Insert: any
        Update: any
      }
    }
  }
}
