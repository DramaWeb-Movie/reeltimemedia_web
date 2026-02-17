# KHQR Payment Integration Setup Guide

This guide will help you set up Bakong KHQR payment integration for ReelTime Media.

## 🎯 Overview

The integration is complete and includes:
- ✅ KHQR API client for generating QR codes
- ✅ Backend API routes for payment processing
- ✅ Real-time payment verification
- ✅ Webhook support for automatic payment confirmation
- ✅ Database tables for tracking payments, purchases, and subscriptions
- ✅ Updated payment page with QR code generation and status checking

## 📋 Prerequisites

1. **KHQR Merchant Account**
   - Register at https://khqr.link/ or contact the National Bank of Cambodia
   - Complete merchant verification
   - Obtain your API credentials

2. **Supabase Database** (Already configured)
   - Run the payment migration to create necessary tables

## 🚀 Setup Steps

### Step 1: Get Your KHQR API Key

1. Visit https://khqr.link/ and create a merchant account
2. Complete the KYC verification process
3. Once approved, go to your dashboard and generate an API key
4. Copy the API key (it will look like `sk_live_xxxxxxxxxxxxx` or `sk_test_xxxxxxxxxxxxx`)

### Step 2: Configure Environment Variables

Update your `.env` file with your KHQR credentials:

```bash
# KHQR Payment Integration
KHQR_API_KEY=sk_live_your_actual_api_key_here
KHQR_API_URL=https://api.khqr.link/v1
KHQR_MERCHANT_NAME=ReelTime Media
KHQR_MERCHANT_CITY=Phnom Penh
```

**Important:** 
- Use `sk_test_*` keys for development/testing
- Use `sk_live_*` keys for production
- Never commit your actual API keys to version control

### Step 3: Run Database Migration

Execute the payment tables migration in Supabase:

```bash
# Option 1: Via Supabase Dashboard
# Go to SQL Editor and run the contents of: supabase/migrations/002_create_payments.sql

# Option 2: Via Supabase CLI (if installed)
supabase db push
```

This creates the following tables:
- `payments` - Tracks all payment transactions
- `purchases` - Records purchased movies
- `subscriptions` - Manages series subscriptions

### Step 4: Configure Webhook (Production Only)

For production, configure the webhook in your KHQR merchant dashboard:

**Webhook URL:**
```
https://yourdomain.com/api/payments/webhook
```

**Events to subscribe:**
- `payment.completed`
- `payment.failed`
- `payment.expired`

The webhook enables automatic payment confirmation and content access granting.

### Step 5: Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. Navigate to a movie or subscription page
3. Click on "Buy" or "Subscribe"
4. You should see a QR code generated
5. Use a KHQR-supported banking app to test payment

## 🏗️ Architecture

### Frontend (Payment Page)
- **Location:** `app/(main)/payment/page.tsx`
- **Features:**
  - Dynamic QR code generation
  - Real-time payment status checking (polls every 5 seconds)
  - Error handling and retry mechanism
  - Success state with redirect to content

### Backend API Routes

#### 1. Generate QR Code
- **Endpoint:** `POST /api/payments/generate-qr`
- **Purpose:** Creates a new payment and generates KHQR code
- **Authentication:** Required (Supabase Auth)
- **Request Body:**
  ```json
  {
    "amount": 4.99,
    "currency": "USD",
    "contentType": "movie",
    "contentId": "movie-123",
    "contentTitle": "Awesome Movie"
  }
  ```

#### 2. Verify Payment
- **Endpoint:** `POST /api/payments/verify`
- **Purpose:** Checks payment status and grants content access
- **Authentication:** Required (Supabase Auth)
- **Request Body:**
  ```json
  {
    "paymentId": "uuid-here"
  }
  ```

#### 3. Webhook Handler
- **Endpoint:** `POST /api/payments/webhook`
- **Purpose:** Receives payment notifications from KHQR
- **Authentication:** Webhook signature verification (implement as needed)

### KHQR Client Library
- **Location:** `lib/khqr/client.ts`
- **Features:**
  - API communication with KHQR gateway
  - QR code generation
  - Transaction status queries
  - Error handling

## 🔒 Security Considerations

1. **API Keys**
   - Store in environment variables
   - Use `.env.local` for local development
   - Never commit to version control
   - Rotate keys periodically

2. **Webhook Security**
   - Implement signature verification
   - Validate payload structure
   - Use HTTPS in production
   - Log all webhook events

3. **Payment Verification**
   - Always verify on the backend
   - Don't trust client-side status
   - Implement idempotency for access grants
   - Log all payment state changes

## 💰 Supported Features

### Payment Types
- ✅ One-time movie purchases (USD or KHR)
- ✅ Monthly subscriptions
- ✅ Multiple currency support (USD, KHR)

### Payment Banks & E-Wallets
KHQR is supported by all participating institutions:
- ABA Bank
- ACLEDA Bank
- Wing
- PiPay
- TrueMoney
- And 30+ other banks and e-wallets in Cambodia

## 🧪 Testing

### Development Testing
1. Use test API keys (`sk_test_*`)
2. Test QR code generation
3. Verify payment status polling
4. Test error scenarios

### Production Testing
1. Small test transactions first
2. Verify webhook delivery
3. Confirm content access granting
4. Test payment expiration (if implemented)

## 📊 Monitoring

### Payment Flow
1. User initiates payment → QR generated → Record created in DB
2. User scans QR → Pays via app → KHQR processes payment
3. Webhook received → Status updated → Content access granted
4. OR: Frontend polling → Status checked → Content access granted

### Logs to Monitor
- QR generation requests
- Payment verification calls
- Webhook deliveries
- Access grant operations

## 🐛 Troubleshooting

### QR Code Not Generating
- Check KHQR_API_KEY is set correctly
- Verify API endpoint is accessible
- Check browser console for errors
- Verify Supabase authentication

### Payment Not Confirming
- Check webhook is configured correctly
- Verify webhook endpoint is publicly accessible
- Check payment status in KHQR dashboard
- Review server logs for errors

### Database Errors
- Ensure migration ran successfully
- Check RLS policies are correct
- Verify user is authenticated
- Check Supabase logs

## 📱 User Experience

### Payment Flow
1. User selects content to purchase
2. Redirected to payment page with order summary
3. QR code generated and displayed
4. User scans with banking app
5. Completes payment in their app
6. Status automatically updates (or click "Check Status")
7. Redirected to content on success

### Status Indicators
- 🟡 Yellow pulse: Waiting for payment
- 🔄 Spinner: Checking payment status
- ✅ Green check: Payment successful

## 🔄 Future Enhancements

Consider implementing:
- [ ] Payment expiration (30 min timeout)
- [ ] Payment history page for users
- [ ] Admin dashboard for payment management
- [ ] Refund handling
- [ ] Multiple payment methods
- [ ] Email notifications
- [ ] Receipt generation

## 📞 Support

### KHQR Support
- Website: https://khqr.link/
- Documentation: https://docs.khqr.link/
- Email: support@khqr.link

### National Bank of Cambodia
- Bakong Website: https://bakong.nbc.gov.kh/
- Contact: Via NBC official channels

## ✅ Checklist

Before going live:
- [ ] KHQR merchant account approved
- [ ] Production API key configured
- [ ] Database migration completed
- [ ] Webhook URL configured in KHQR dashboard
- [ ] Test transactions successful
- [ ] Error handling tested
- [ ] Security measures implemented
- [ ] Monitoring set up
- [ ] User documentation updated

---

**Need Help?** Contact KHQR support or refer to the official documentation at https://docs.khqr.link/
