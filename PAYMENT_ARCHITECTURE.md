# 🏗️ KHQR Payment System Architecture

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ReelTime Media Platform                      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Frontend   │  │   Backend    │  │   Database   │          │
│  │   Next.js    │←→│  API Routes  │←→│  Supabase    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↑                  ↑                                      │
└─────────┼──────────────────┼──────────────────────────────────┘
          │                  │
          │                  ↓
          │         ┌──────────────────┐
          │         │   KHQR API       │
          │         │  api.khqr.link   │
          │         └──────────────────┘
          │                  ↑
          │                  │ (webhook)
          │                  │
          ↓                  ↓
    ┌─────────────────────────────────┐
    │    User's Banking App           │
    │  (ABA, ACLEDA, Wing, PiPay...)  │
    └─────────────────────────────────┘
```

---

## 🔄 Payment Flow Diagram

### Flow 1: User Initiates Payment

```
User Action                Frontend                 Backend API              KHQR API
    │                         │                         │                        │
    ├─[1] Click "Buy"]────────>                         │                        │
    │                         │                         │                        │
    │                         ├─[2] Redirect to]────────>                        │
    │                         │   /payment?...          │                        │
    │                         │                         │                        │
    │                         ├─[3] POST]───────────────>                        │
    │                         │   /api/payments/        │                        │
    │                         │   generate-qr           │                        │
    │                         │                         │                        │
    │                         │                         ├─[4] POST]──────────────>
    │                         │                         │   /v1/qr/generate      │
    │                         │                         │                        │
    │                         │                         <─[5] QR Data]───────────┤
    │                         │                         │   {qr_id, qr_data}     │
    │                         │                         │                        │
    │                         │                         ├─[6] Save to DB]────────>
    │                         │                         │   (payments table)     │
    │                         │                         │                        │
    │                         <─[7] Return QR]──────────┤                        │
    │                         │   {qr_id, qr_data}      │                        │
    │                         │                         │                        │
    │                         ├─[8] Display QR]         │                        │
    │                         │   <QRCodeSVG>           │                        │
    │                         │                         │                        │
    <─[9] Show QR Code]───────┤                         │                        │
    │  "Scan to Pay"          │                         │                        │
```

### Flow 2: User Scans and Pays

```
User Action              Banking App              KHQR System           ReelTime Backend
    │                         │                         │                        │
    ├─[1] Open App]──────────>                         │                        │
    │   (ABA/Wing/etc)        │                         │                        │
    │                         │                         │                        │
    ├─[2] Scan QR]───────────>                         │                        │
    │                         │                         │                        │
    │                         ├─[3] Decode QR]──────────>                        │
    │                         │   Parse payment data    │                        │
    │                         │                         │                        │
    │                         <─[4] Show Amount]────────┤                        │
    │                         │   "Pay $4.99 to         │                        │
    │                         │    ReelTime Media"      │                        │
    │                         │                         │                        │
    <─[5] Confirm]────────────┤                         │                        │
    │  "Pay $4.99?"           │                         │                        │
    │                         │                         │                        │
    ├─[6] Approve]───────────>                         │                        │
    │   (PIN/Biometric)       │                         │                        │
    │                         │                         │                        │
    │                         ├─[7] Process Payment]────>                        │
    │                         │                         │                        │
    │                         │                         ├─[8] Webhook]──────────>
    │                         │                         │   POST /webhook        │
    │                         │                         │   {status: completed}  │
    │                         │                         │                        │
    │                         │                         │                        ├─[9] Update DB]
    │                         │                         │                        │   Set status
    │                         │                         │                        │   Grant access
    │                         │                         │                        │
    <─[10] Success]───────────┤                         │                        │
    │  "Payment Successful"   │                         │                        │
```

### Flow 3: Frontend Verification (Polling)

```
Frontend (Payment Page)        Backend API              Database
    │                              │                        │
    ├─[Every 5 seconds]            │                        │
    │                              │                        │
    ├─[1] POST verify]─────────────>                        │
    │   {paymentId: "..."}         │                        │
    │                              │                        │
    │                              ├─[2] Query Status]──────>
    │                              │   SELECT * FROM        │
    │                              │   payments WHERE...    │
    │                              │                        │
    │                              <─[3] Payment Record]────┤
    │                              │   {status: completed}  │
    │                              │                        │
    <─[4] Status Response]─────────┤                        │
    │   {status: "completed"}      │                        │
    │                              │                        │
    ├─[5] Show Success]            │                        │
    │   Redirect to content        │                        │
```

---

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                          auth.users                              │
│  (Supabase Auth - User accounts)                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┼─────────┬─────────────────┐
        │         │         │                 │
        ↓         ↓         ↓                 ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ payments │ │purchases │ │subscript-│ │   profiles   │
│          │ │          │ │  ions    │ │              │
├──────────┤ ├──────────┤ ├──────────┤ ├──────────────┤
│ id       │ │ id       │ │ id       │ │ id           │
│ user_id  │ │ user_id  │ │ user_id  │ │ user_id      │
│ qr_id    │ │ content  │ │ type     │ │ username     │
│ tx_id    │ │ _id      │ │ status   │ │ ...          │
│ amount   │ │ purchase │ │ expires  │ │              │
│ currency │ │ _at      │ │ _at      │ │              │
│ status   │ │          │ │          │ │              │
│ reference│ │          │ │          │ │              │
└──────────┘ └──────────┘ └──────────┘ └──────────────┘
     │            │            │
     │            │            │
     └────────────┴────────────┘
              │
         Used to grant
        content access
```

### Table Relationships

```
payments.user_id ─────> auth.users.id
purchases.user_id ────> auth.users.id
subscriptions.user_id > auth.users.id

When payment completes:
  IF content_type = "movie":
    INSERT INTO purchases (user_id, content_id)
  
  IF content_type = "subscription":
    UPSERT INTO subscriptions (user_id, expires_at = NOW() + 30 days)
```

---

## 📁 File Structure

```
reeltimemedia_web/
│
├── app/
│   ├── (main)/
│   │   └── payment/
│   │       └── page.tsx ................... Payment page with QR display
│   │
│   └── api/
│       └── payments/
│           ├── generate-qr/
│           │   └── route.ts ............... Generate KHQR QR code
│           ├── verify/
│           │   └── route.ts ............... Verify payment status
│           └── webhook/
│               └── route.ts ............... Receive KHQR webhooks
│
├── lib/
│   ├── khqr/
│   │   ├── client.ts ...................... KHQR API client
│   │   └── types.ts ....................... TypeScript types
│   │
│   └── supabase/
│       ├── client.ts ...................... Supabase client
│       └── server.ts ...................... Supabase server client
│
├── components/
│   └── payment/
│       └── PaymentButton.tsx .............. Reusable payment button
│
├── hooks/
│   └── usePaymentAccess.ts ................ Check content access
│
├── supabase/
│   └── migrations/
│       └── 002_create_payments.sql ........ Payment tables
│
├── .env .................................... Environment variables
├── KHQR_SETUP.md ........................... Full setup guide
├── KHQR_QUICKSTART.md ...................... Quick start guide
└── IMPLEMENTATION_SUMMARY.md ............... Implementation details
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Security Layers                           │
└─────────────────────────────────────────────────────────────────┘

1. Authentication Layer (Supabase Auth)
   ┌──────────────────────────────────────┐
   │  User must be logged in              │
   │  JWT token validation                │
   │  Session management                  │
   └──────────────────────────────────────┘
                  ↓
2. Authorization Layer (RLS Policies)
   ┌──────────────────────────────────────┐
   │  Row Level Security enabled          │
   │  Users can only see own records      │
   │  Policy: auth.uid() = user_id        │
   └──────────────────────────────────────┘
                  ↓
3. API Security (Backend Validation)
   ┌──────────────────────────────────────┐
   │  Validate all inputs                 │
   │  Check user ownership                │
   │  Rate limiting (KHQR side)           │
   └──────────────────────────────────────┘
                  ↓
4. Payment Security (KHQR)
   ┌──────────────────────────────────────┐
   │  Secure HTTPS communication          │
   │  API key never exposed to client     │
   │  Webhook signature verification      │
   └──────────────────────────────────────┘
```

---

## 🎬 Payment States

```
┌─────────┐     Generate QR      ┌─────────┐
│ Initial │ ──────────────────────> Pending │
└─────────┘                       └─────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                User Pays         Times Out          Error
                    │                  │                  │
                    ↓                  ↓                  ↓
              ┌───────────┐      ┌─────────┐      ┌─────────┐
              │ Completed │      │ Expired │      │ Failed  │
              └───────────┘      └─────────┘      └─────────┘
                    │
                    ↓
            Grant Content Access
                    │
              ┌─────┴─────┐
              ↓           ↓
        ┌─────────┐  ┌──────────────┐
        │Purchase │  │Subscription  │
        │ (Movie) │  │  (Series)    │
        └─────────┘  └──────────────┘
```

---

## 🔄 API Request/Response Flow

### Generate QR Endpoint

**Request:**
```typescript
POST /api/payments/generate-qr
Headers: {
  Authorization: Bearer <supabase_jwt>
  Content-Type: application/json
}
Body: {
  amount: 4.99,
  currency: "USD",
  contentType: "movie",
  contentId: "movie-123",
  contentTitle: "Awesome Movie"
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    qr_id: "QR_abc123xyz",
    qr_data: "00020101021226...",  // EMVCo QR payload
    image_url: "https://khqr.link/qr/abc123.png",
    payment_id: "uuid-payment-record",
    reference: "RTL-MOVIE-123-1234567890",
    amount: 4.99,
    currency: "USD",
    expires_at: "2026-02-17T12:30:00Z"
  }
}
```

### Verify Payment Endpoint

**Request:**
```typescript
POST /api/payments/verify
Headers: {
  Authorization: Bearer <supabase_jwt>
  Content-Type: application/json
}
Body: {
  paymentId: "uuid-payment-record"
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    status: "completed",  // or "pending", "failed", "expired"
    payment: {
      id: "uuid",
      user_id: "user-uuid",
      amount: 4.99,
      currency: "USD",
      status: "completed",
      completed_at: "2026-02-17T12:15:00Z",
      ...
    }
  }
}
```

### Webhook Endpoint

**Incoming Webhook:**
```typescript
POST /api/payments/webhook
Headers: {
  X-KHQR-Signature: "signature_hash"
  Content-Type: application/json
}
Body: {
  event: "payment.completed",
  transaction_id: "TXN_abc123",
  qr_id: "QR_abc123xyz",
  amount: 4.99,
  currency: "USD",
  reference: "RTL-MOVIE-123-1234567890",
  status: "completed",
  payer_name: "John Doe",
  timestamp: "2026-02-17T12:15:00Z"
}
```

**Response:**
```typescript
{
  success: true,
  received: true
}
```

---

## 🌐 Integration Points

```
External Services:
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  ┌────────────────┐       ┌─────────────────┐               │
│  │  KHQR API      │       │  Banking Apps   │               │
│  │  khqr.link     │       │  (User side)    │               │
│  └────────────────┘       └─────────────────┘               │
│         ↑                          │                         │
└─────────┼──────────────────────────┼─────────────────────────┘
          │                          │
          │                          │
┌─────────┼──────────────────────────┼─────────────────────────┐
│         ↓                          ↓                         │
│  ┌────────────────┐       ┌─────────────────┐               │
│  │  Backend API   │       │  Payment Page   │               │
│  │  Next.js API   │←──────│  (Frontend)     │               │
│  └────────────────┘       └─────────────────┘               │
│         ↑                                                    │
│         │                                                    │
│         ↓                                                    │
│  ┌────────────────┐                                         │
│  │  Supabase DB   │                                         │
│  │  PostgreSQL    │                                         │
│  └────────────────┘                                         │
│                                                              │
│                    ReelTime Media Platform                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Summary

1. **QR Generation:**
   - User → Frontend → Backend API → KHQR API → QR Code → Display

2. **Payment Execution:**
   - User Scans → Banking App → KHQR System → Webhook → Backend → Database

3. **Verification:**
   - Frontend Poll → Backend API → Database → Status Check → KHQR API

4. **Access Grant:**
   - Payment Complete → Update DB → Insert Purchase/Subscription → Grant Access

---

## 🎯 Key Features

### Real-time Updates
- Frontend polls every 5 seconds
- Webhook for instant updates
- Automatic redirect on success

### Error Handling
- API validation
- User-friendly error messages
- Retry mechanisms
- Fallback flows

### Security
- JWT authentication
- RLS policies
- API key protection
- Webhook verification

### Scalability
- Stateless API design
- Database indexes
- Rate limiting ready
- Caching potential

---

## 📈 Performance Considerations

### Frontend
- Lazy load QR component
- Debounce status checks
- Cache QR images
- Optimize re-renders

### Backend
- Connection pooling
- Query optimization
- Webhook async processing
- Rate limit handling

### Database
- Indexed queries
- RLS optimization
- Partition large tables
- Archive old records

---

This architecture provides a complete, secure, and scalable payment system integrated with Cambodia's national KHQR payment standard.
