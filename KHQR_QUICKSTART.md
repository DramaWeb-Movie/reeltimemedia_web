# 🚀 KHQR Payment - Quick Start Guide

Get your Bakong KHQR payment integration running in 5 minutes!

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Get Your KHQR API Key (5 minutes)

1. Go to https://khqr.link/
2. Register as a merchant
3. Complete verification
4. Get your API key from the dashboard

> **For Testing:** Use test keys (`sk_test_*`) initially  
> **For Production:** Switch to live keys (`sk_live_*`) after testing

---

### Step 2: Configure Environment Variables (1 minute)

Open your `.env` file and update:

```bash
# Replace with your actual API key from KHQR dashboard
KHQR_API_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
KHQR_API_URL=https://api.khqr.link/v1
KHQR_MERCHANT_NAME=ReelTime Media
KHQR_MERCHANT_CITY=Phnom Penh
```

---

### Step 3: Run Database Migration (1 minute)

**Option A - Via Supabase Dashboard:**
1. Go to your Supabase project → SQL Editor
2. Copy contents of `supabase/migrations/002_create_payments.sql`
3. Paste and run

**Option B - Via Supabase CLI:**
```bash
supabase db push
```

---

## ✅ You're Done! Test It Out

### Start Your Dev Server
```bash
npm run dev
```

### Test the Payment Flow

1. Visit your pricing page: http://localhost:3000/pricing
2. Click "Subscribe now" or "Browse movies"
3. Select a movie/subscription
4. You should see the payment page with a QR code!

### Test Payment Page Directly
```
http://localhost:3000/payment?type=movie&id=test-123&title=Test%20Movie&amount=4.99&currency=USD
```

---

## 🎯 Integration in Your App

### Add Payment Button to Any Page

```tsx
import PaymentButton from '@/components/payment/PaymentButton';

// For a movie
<PaymentButton
  contentType="movie"
  contentId="movie-123"
  contentTitle="Awesome Movie"
  amount={4.99}
>
  Buy $4.99
</PaymentButton>

// For subscription
<PaymentButton
  contentType="subscription"
  contentTitle="Series Subscription"
  amount={9.99}
>
  Subscribe $9.99/mo
</PaymentButton>
```

### Check If User Has Access

```tsx
import { usePaymentAccess } from '@/hooks/usePaymentAccess';

function WatchMovie({ movieId }) {
  const { hasAccess, loading } = usePaymentAccess('movie', movieId);
  
  if (loading) return <div>Loading...</div>;
  
  if (!hasAccess) {
    return <div>Please purchase to watch</div>;
  }
  
  return <VideoPlayer />;
}
```

---

## 🔧 What Was Installed

✅ KHQR API client (`lib/khqr/client.ts`)  
✅ Payment API routes (`/api/payments/*`)  
✅ Database tables (payments, purchases, subscriptions)  
✅ Updated payment page with QR generation  
✅ Payment button component  
✅ Access control hook  
✅ Complete documentation

---

## 🏦 Supported Payment Apps

Users can pay with any of these apps:
- 🏦 ABA Mobile
- 🏦 ACLEDA Mobile
- 💸 Wing
- 💳 PiPay
- 💰 TrueMoney
- 📱 Bakong App
- ... and 30+ other banks/e-wallets in Cambodia

---

## 📱 How Users Pay

1. Click "Buy" button → Redirected to payment page
2. See QR code with amount
3. Open banking app → Scan QR
4. Confirm payment in app
5. Automatically redirected to content ✅

**Payment verification runs every 5 seconds automatically!**

---

## 🐛 Troubleshooting

### QR Code Not Showing?
- ✓ Check `KHQR_API_KEY` is set in `.env`
- ✓ Restart dev server after changing `.env`
- ✓ Check browser console for errors

### Payment Not Confirming?
- ✓ Ensure you're using a valid KHQR test account
- ✓ Check webhook is configured (production only)
- ✓ Verify database migration ran successfully

### Database Errors?
- ✓ Run the migration: `supabase/migrations/002_create_payments.sql`
- ✓ Check Supabase connection in `.env`
- ✓ Verify user is logged in

---

## 🎓 Learn More

- **Full Setup Guide:** `KHQR_SETUP.md`
- **Implementation Details:** `IMPLEMENTATION_SUMMARY.md`
- **KHQR API Docs:** https://docs.khqr.link/
- **Bakong Info:** https://bakong.nbc.gov.kh/

---

## 🚀 Going to Production

### Pre-Launch Checklist

1. **API Key**
   - [ ] Switch from test to live key: `sk_live_*`
   - [ ] Update `KHQR_API_KEY` in production `.env`

2. **Webhook**
   - [ ] Configure in KHQR dashboard
   - [ ] URL: `https://yourdomain.com/api/payments/webhook`
   - [ ] Subscribe to: `payment.completed`, `payment.failed`, `payment.expired`

3. **Database**
   - [ ] Run migration on production Supabase
   - [ ] Verify tables created
   - [ ] Test RLS policies

4. **Testing**
   - [ ] Complete a real test payment
   - [ ] Verify access is granted
   - [ ] Test both USD and KHR
   - [ ] Test movies and subscriptions

5. **Deploy**
   ```bash
   npm run build
   npm start
   ```

---

## 💡 Pro Tips

### Development
- Use test API keys for development
- Test with small amounts first
- Check server logs for debugging

### Production
- Monitor webhook deliveries
- Set up error alerting
- Track successful payment rates
- Keep API keys secure

### User Experience
- Show clear payment instructions
- Display supported payment apps
- Auto-redirect on success
- Handle errors gracefully

---

## 🎉 You're All Set!

Your KHQR payment integration is ready to go. Start testing and accepting payments from users across Cambodia!

**Need Help?**
- Check the full setup guide: `KHQR_SETUP.md`
- Contact KHQR support: https://khqr.link/
- Review implementation details: `IMPLEMENTATION_SUMMARY.md`

---

**Happy Selling! 💰**
