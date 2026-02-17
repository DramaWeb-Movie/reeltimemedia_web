# KHQR QR Code Generator Scripts

This folder contains standalone scripts to generate KHQR (Bakong) payment QR codes for testing and development.

---

## 📁 Files

### 1. `generate-khqr.js` - Node.js CLI Generator

Command-line tool to generate KHQR QR codes.

**Installation:**
```bash
# Install qrcode package for QR generation
npm install qrcode
```

**Basic Usage:**
```bash
# Generate with defaults
node scripts/generate-khqr.js

# Generate with custom amount
node scripts/generate-khqr.js --amount 4.99

# Full example
node scripts/generate-khqr.js \
  --amount 4.99 \
  --currency USD \
  --description "Awesome Movie" \
  --save payment-qr.png
```

**Options:**
- `--amount <number>` - Payment amount (default: 4.99)
- `--currency <USD|KHR>` - Currency code (default: USD)
- `--description <text>` - Payment description
- `--reference <text>` - Payment reference (auto-generated)
- `--merchant-id <id>` - Your merchant ID
- `--save <filename>` - Save QR as PNG image
- `--help` - Show help

**Examples:**
```bash
# Movie purchase
node scripts/generate-khqr.js --amount 4.99 --description "Movie: Avengers"

# Subscription
node scripts/generate-khqr.js --amount 9.99 --description "Monthly Subscription"

# KHR currency
node scripts/generate-khqr.js --amount 20000 --currency KHR

# Save as image
node scripts/generate-khqr.js --amount 4.99 --save movie-payment.png
```

---

### 2. `test-khqr-generation.js` - Test Script

Generates multiple test QR codes for different scenarios.

**Usage:**
```bash
node scripts/test-khqr-generation.js
```

This will generate QR codes for:
- Movie purchase (USD)
- Movie purchase (KHR)
- Series subscription
- Premium content

---

### 3. `generate-khqr-web.html` - Web-Based Generator

Interactive web interface to generate KHQR QR codes in your browser.

**Usage:**
```bash
# Open in browser
open scripts/generate-khqr-web.html

# Or use a local server
npx http-server scripts
```

**Features:**
- ✅ Visual form interface
- ✅ Real-time QR generation
- ✅ Download QR as PNG
- ✅ Copy payload text
- ✅ Requires internet (uses CDN)

### 4. `generate-khqr-simple.html` - Simple Generator (100% Offline) ⭐

**RECOMMENDED if you have internet issues** - Works completely offline!

**Usage:**
```bash
# Open in browser
open scripts/generate-khqr-simple.html
```

**Features:**
- ✅ No external dependencies
- ✅ Works 100% offline
- ✅ Generates EMVCo payload
- ✅ Copy to clipboard
- ✅ Use payload with any QR generator

**How it works:**
1. Fill in amount and details
2. Click "Generate KHQR Code"
3. Copy the payload text
4. Use the command line script to generate QR from payload

---

## 🎯 Use Cases

### 1. Testing Locally
Generate QR codes without API credentials:
```bash
node scripts/generate-khqr.js --amount 4.99
```

### 2. Understanding KHQR Format
See the EMVCo payload structure:
```bash
node scripts/generate-khqr.js --amount 4.99
# Check the output payload
```

### 3. Creating Test QR Codes
Generate multiple QR codes for testing:
```bash
node scripts/test-khqr-generation.js
```

### 4. Visual Testing
Use the web interface for quick visual testing:
```bash
open scripts/generate-khqr-web.html
```

---

## 📋 KHQR Payload Format

The generated QR codes follow the EMVCo standard used by Bakong:

```
00 02 01           - Payload Format Indicator
01 02 12           - Point of Initiation (Dynamic)
29 XX ...          - Merchant Account (Bakong)
53 03 840/116      - Currency (USD/KHR)
54 XX ...          - Transaction Amount
58 02 KH           - Country Code
59 XX ...          - Merchant Name
60 XX ...          - Merchant City
62 XX ...          - Additional Data (Reference, Description)
63 04 XXXX         - CRC16 Checksum
```

---

## 🔧 Configuration

Edit the CONFIG section in `generate-khqr.js`:

```javascript
const CONFIG = {
  merchantName: 'ReelTime Media',
  merchantCity: 'Phnom Penh',
  merchantId: '000123456789',  // ← Replace with your actual ID
  countryCode: 'KH',
};
```

**Get Your Merchant ID:**
1. Register at https://khqr.link/
2. Complete verification
3. Get your merchant ID from dashboard
4. Update the config

---

## 🧪 Testing Generated QR Codes

### With Banking Apps
1. Generate a QR code
2. Open ABA, Wing, or any KHQR-compatible app
3. Scan the QR code
4. Verify the amount and merchant details
5. (Don't complete payment in test mode)

### With QR Scanners
1. Generate a QR code
2. Use any QR scanner app
3. Copy the payload text
4. Verify the format

---

## 💡 Tips

### For Development
- Use test merchant IDs initially
- Generate QR codes with small amounts
- Verify payload format before testing with real apps

### For Testing
- Create QR codes for different scenarios
- Test both USD and KHR currencies
- Verify merchant information displays correctly

### For Production
- Get your real merchant ID from KHQR
- Use the KHQR API for dynamic generation
- Implement webhook for payment verification

---

## 🐛 Troubleshooting

### QRCode Package Not Found
```bash
npm install qrcode
```

### QR Not Displaying in Terminal
Install qrcode package or use the web interface instead.

### Invalid QR Code
- Check merchant ID format
- Verify amount is positive
- Ensure currency is USD or KHR
- Check description length (max 25 chars)

### Banking App Rejects QR
- Ensure using a valid merchant ID
- Check amount format (2 decimals for USD)
- Verify CRC checksum is correct

---

## 📚 Resources

- **KHQR Portal:** https://khqr.link/
- **KHQR API Docs:** https://docs.khqr.link/
- **Bakong Website:** https://bakong.nbc.gov.kh/
- **EMVCo Standard:** https://www.emvco.com/

---

## 🎉 Quick Start

**Fastest way to generate a QR:**

```bash
# 1. Open the web interface
open scripts/generate-khqr-web.html

# 2. Enter your amount
# 3. Click "Generate QR Code"
# 4. Scan with banking app
```

**For command line:**

```bash
# 1. Install qrcode
npm install qrcode

# 2. Generate QR
node scripts/generate-khqr.js --amount 4.99

# 3. Scan the QR in terminal or save as image
```

---

**Need Help?** Check the main documentation:
- `KHQR_QUICKSTART.md` - Quick setup guide
- `KHQR_SETUP.md` - Full setup instructions
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
