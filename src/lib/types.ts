export type Role = 'admin' | 'owner' | 'none'
export type Status = 'available' | 'reserved' | 'sold'

export interface Shop {
  id: string
  owner_id: string | null
  name: string
  tagline: string | null
  logo_path: string | null
  whatsapp: string | null
  phone: string | null
  email: string | null
  address: string | null
  map_url: string | null
  hours: string | null
  accent: string
  show_usd: boolean
  usd_rate: number | null
  hide_prices: boolean
  facebook: string | null
  instagram: string | null
  tiktok: string | null
  show_reviews: boolean
}

export interface Car {
  id: string
  shop_id: string
  slug: string
  make: string
  model: string
  year: number
  price: number | null
  negotiable: boolean
  mileage_km: number | null
  fuel: string | null
  transmission: string | null
  body_type: string | null
  engine_cc: number | null
  colour: string | null
  drive: string | null
  seats: number | null
  condition: string | null
  features: string[]
  description: string | null
  location: string | null
  status: Status
  published: boolean
  featured: boolean
  cover_path: string | null
  created_at: string
  updated_at: string
  car_photos?: CarPhoto[]
}

export interface CarPhoto {
  id: string
  car_id: string
  angle: string
  path: string
  position: number
}

export interface CarPrivate {
  car_id: string
  plate: string | null
  vin: string | null
  buying_price: number | null
  seller_name: string | null
  seller_phone: string | null
  notes: string | null
}

export interface Enquiry {
  id: string
  shop_id: string
  car_id: string | null
  name: string
  phone: string
  message: string | null
  status: 'new' | 'contacted' | 'closed'
  created_at: string
  cars?: Pick<Car, 'make' | 'model' | 'year' | 'slug'> | null
}

export interface Sale {
  id: string
  shop_id: string
  car_id: string | null
  car_label: string
  buyer_name: string
  buyer_phone: string
  sold_price: number | null
  sold_at: string
  survey_token: string
  survey_expires_at: string
  survey_sent_at: string | null
  created_at: string
  reviews?: Pick<Review, 'id'>[]
}

export interface Review {
  id: string
  shop_id: string
  sale_id: string
  car_label: string
  rating_overall: number
  rating_car: number | null
  rating_service: number | null
  rating_value: number | null
  recommend: boolean | null
  comment: string | null
  display_name: string | null
  allow_publish: boolean
  status: 'pending' | 'approved' | 'hidden'
  created_at: string
}
