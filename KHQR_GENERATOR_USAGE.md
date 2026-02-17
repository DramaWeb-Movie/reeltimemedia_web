# 🎯 KHQR QR Code Generator - Quick Usage Guide

Generate KHQR (Bakong) payment QR codes **instantly** without needing API credentials!

---

## ⚡ 3 Ways to Generate QR Codes

### 1️⃣ Command Line (Fastest for Testing)

```bash
# Basic usage
node scripts/generate-khqr.js --amount 4.99

# With description
node scripts/generate-khqr.js --amount 4.99 --description "Awesome Movie"

# Save as image
node scripts/generate-khqr.js --amount 4.99 --save payment.png

# Full example
node scripts/generate-khqr.js \
  --amount 4.99 \
  --currency USD \
  --description "Movie: Avengers" \
  --save avengers-payment.png
```

**✅ Pros:** Fast, scriptable, shows QR in terminal  
**📊 Output:** ASCII QR code + EMVCo payload + PNG image (optional)

---

### 2️⃣ Web Interface (Best for Visual Testing)

```bash
# Open in browser
open scripts/generate-khqr-web.html
```

**✅ Pros:** Visual interface, no command line needed, instant preview  
**📊 Features:**
- Interactive form
- Real-time QR generation
- Download as PNG
- Copy payload text
- Works offline

---

### 3️⃣ Test Suite (Multiple QR Codes)

```bash
# Generate 4 test QR codes at once
node scripts/test-khqr-generation.js
```

**✅ Pros:** Tests multiple scenarios automatically  
**📊 Generates:**
- Movie purchase (USD)
- Movie purchase (KHR)
- Series subscription
- Premium content

---

## 📖 Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--amount` | Payment amount | `--amount 4.99` |
| `--currency` | USD or KHR | `--currency KHR` |
| `--description` | Payment description (max 25 chars) | `--description "Movie"` |
| `--reference` | Custom reference | `--reference "ORDER-123"` |
| `--merchant-id` | Your merchant ID | `--merchant-id "123456789"` |
| `--save` | Save as PNG | `--save payment.png` |
| `--help` | Show help | `--help` |

---

## 🎬 Usage Examples

### Movie Purchase
```bash
node scripts/generate-khqr.js \
  --amount 4.99 \
  --description "Movie: The Avengers" \
  --save avengers-qr.png
```

### Subscription
```bash
node scripts/generate-khqr.js \
  --amount 9.99 \
  --description "Monthly Subscription"
```

### KHR Currency (Cambodian Riel)
```bash
node scripts/generate-khqr.js \
  --amount 20000 \
  --currency KHR \
  --description "ភាពយន្តខ្មែរ"
```

### Multiple Test QR Codes
```bash
# Generate 4 different QR codes
node scripts/test-khqr-generation.js
```

---

## 📱 What You Get

When you run the script, you'll see:

```
┌─────────────────────────────────────────────────┐
│         KHQR QR Code Generator                   │
└─────────────────────────────────────────────────┘

📋 Payment Details:
   Merchant:    ReelTime Media
   City:        Phnom Penh
   Amount:      4.99 USD
   Description: Awesome Movie
   Reference:   RTL-1771321876101-95ABE0EF

🔢 EMVCo QR Payload:
00020101021229370017kh.gov.nbc.bakong...

📱 QR Code:
[ASCII QR code displayed here]

✅ QR code saved as: payment.png
```

---

## 🧪 Testing Your QR Codes

### With Banking Apps

1. Generate a QR code
2. Open ABA, Wing, ACLEDA, or any KHQR app
3. Select "Scan QR" or "Pay with KHQR"
4. Scan the generated QR code
5. Verify merchant name and amount
6. ⚠️ **Don't complete payment** (test merchant ID)

### With QR Scanner Apps

1. Generate a QR code
2. Use any QR scanner
3. Copy the payload text
4. Verify it starts with `00020101`

---

## 🔧 Configuration

Edit `scripts/generate-khqr.js` to customize:

```javascript
const CONFIG = {
  merchantName: 'Your Business Name',
  merchantCity: 'Phnom Penh',
  merchantId: 'YOUR_MERCHANT_ID',  // ← Get from khqr.link
  countryCode: 'KH',
};
```

---

## 📊 Understanding the Output

### EMVCo Payload Format

```
00020101021229...    ← Full payload (QR code content)
                       
Components:
├─ 00 02 01          → Format indicator
├─ 01 02 12          → Dynamic QR
├─ 29 XX ...         → Merchant account (Bakong)
├─ 53 03 840         → Currency (USD=840, KHR=116)
├─ 54 04 4.99        → Amount
├─ 58 02 KH          → Country code
├─ 59 14 ReelTime... → Merchant name
├─ 60 10 Phnom...    → City
├─ 62 XX ...         → Additional data (reference, description)
└─ 63 04 XXXX        → CRC checksum
```

---

## 💡 Pro Tips

### Development
- Use test merchant ID initially: `000123456789`
- Generate QR codes locally without API calls
- Test different amounts and currencies
- Save QR images for documentation

### Testing
- Create multiple QR codes for different scenarios
- Test with real banking apps (don't complete payment)
- Verify merchant information displays correctly
- Check both USD and KHR currencies

### Production
- Get your real merchant ID from https://khqr.link/
- Update the CONFIG in the script
- Use KHQR API for production (not this script)
- Implement webhook for payment verification

---

## 🐛 Troubleshooting

### Script Not Found
```bash
# Make sure you're in the project root
cd /path/to/reeltimemedia_web
node scripts/generate-khqr.js
```

### QRCode Package Missing
```bash
npm install qrcode
```

### Permission Denied
```bash
chmod +x scripts/generate-khqr.js
./scripts/generate-khqr.js --amount 4.99
```

### Web Page Not Opening
```bash
# Use a local server
npx http-server scripts
# Then open: http://localhost:8080/generate-khqr-web.html
```

---

## 🎯 Real-World Use Cases

### 1. Quick Testing
```bash
# Generate a test QR instantly
node scripts/generate-khqr.js --amount 1
```

### 2. Documentation
```bash
# Create QR images for docs
node scripts/generate-khqr.js --amount 4.99 --save docs/movie-payment.png
node scripts/generate-khqr.js --amount 9.99 --save docs/subscription.png
```

### 3. Demo/Presentation
```bash
# Open web interface for live demo
open scripts/generate-khqr-web.html
```

### 4. Integration Testing
```bash
# Generate multiple test scenarios
node scripts/test-khqr-generation.js
```

---

## 📞 Next Steps

### For Testing
1. ✅ Generate QR codes with these scripts
2. ✅ Test with banking apps
3. ✅ Verify merchant information

### For Production
1. Register at https://khqr.link/
2. Get your merchant ID
3. Update `.env` with KHQR API credentials
4. Use the backend API routes (`/api/payments/generate-qr`)
5. Implement webhooks for payment verification

---

## 📚 Related Documentation

- **Quick Start:** `KHQR_QUICKSTART.md`
- **Full Setup:** `KHQR_SETUP.md`
- **Architecture:** `PAYMENT_ARCHITECTURE.md`
- **Scripts README:** `scripts/README.md`

---

## 🎉 You're Ready!

These scripts let you generate KHQR QR codes **instantly** for testing and development without needing API credentials. When you're ready for production, follow the setup guide to integrate with the real KHQR API.

**Happy Testing! 🚀**
