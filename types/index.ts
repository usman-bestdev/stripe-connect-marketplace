export interface ApiError {
  error: string
}

export interface CartItem {
  productId: string
  quantity: number
}

export interface CheckoutRequest {
  items: CartItem[]
  buyerEmail: string
}

export interface CheckoutResponse {
  clientSecret: string
  orderId: string
}

export interface ConnectAccountResponse {
  accountId: string
  onboardingUrl: string
}

export interface TransferRequest {
  orderId: string
}

export interface TransferResponse {
  transferred: number
}

export interface SellerWithProducts {
  id: string
  stripeAccountId: string
  accountName: string
  email: string
  onboardingComplete: boolean
  createdAt: string
  products: ProductItem[]
}

export interface ProductItem {
  id: string
  name: string
  price: number
  imageUrl: string
  sellerId: string
  createdAt: string
}

export interface OrderWithItems {
  id: string
  buyerEmail: string
  totalAmount: number
  platformFee: number
  status: string
  createdAt: string
  items: OrderItemDetail[]
}

export interface OrderItemDetail {
  id: string
  quantity: number
  amount: number
  transferStatus: string
  product: ProductItem
}
