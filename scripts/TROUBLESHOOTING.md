# 🔧 KHQR Generator Troubleshooting Guide

Having issues with the QR code generators? Here are solutions!

---

## ❌ Problem: "QRCode is not defined" in generate-khqr-web.html

### ✅ Solution: Use the Simple Version Instead

The error happens when the QR library can't load from the CDN (internet issues, firewall, etc.).

**Quick Fix:**
```bash
# Use the simple version (works offline!)
open scripts/generate-khqr-simple.html
```

The simple version:
- ✅ Works 100% offline
- ✅ No external dependencies
- ✅ Generates the KHQR payload
- ✅ Copy and use with command line tool

---

## 🎯 Which Generator Should I Use?

### 1. **Command Line** (Most Reliable) ⭐
```bash
node scripts/generate-khqr.js --amount 4.99
```

**Best for:**
- Quick testing
- Automation/scripts
- Saving QR as images
- Seeing ASCII QR in terminal

---

### 2. **Simple Web (Offline)** ⭐
```bash
open scripts/generate-khqr-simple.html
```

**Best for:**
- No internet connection
- CDN blocked/slow
- Just need the payload text
- Guaranteed to work

**How it works:**
1. Generates KHQR payload
2. Copy the text
3. Use command line to generate QR:
   ```bash
   # Generate QR from payload
   node scripts/generate-khqr.js --help
   ```

---

### 3. **Web Interface (Requires Internet)**
```bash
open scripts/generate-khqr-web.html
```

**Best for:**
- Visual interface
- Download QR directly
- Live demos

**Requires:**
- Internet connection (loads QR library)
- Modern browser

---

## 🐛 Common Issues & Solutions

### Issue: Script not found
```bash
Error: Cannot find module './generate-khqr.js'
```

**Solution:**
```bash
# Make sure you're in the project root
cd /path/to/reeltimemedia_web
node scripts/generate-khqr.js
```

---

### Issue: QRCode library not installed
```bash
Error: Cannot find module 'qrcode'
```

**Solution:**
```bash
npm install qrcode
```

---

### Issue: Permission denied
```bash
bash: ./generate-khqr.js: Permission denied
```

**Solution:**
```bash
chmod +x scripts/generate-khqr.js
# Or use node directly
node scripts/generate-khqr.js
```

---

### Issue: Web page shows blank QR
**Solution:**
- Refresh the page
- Check browser console for errors
- Try the simple version instead:
  ```bash
  open scripts/generate-khqr-simple.html
  ```

---

### Issue: Can't download QR image
**Solution:**
Use command line to save:
```bash
node scripts/generate-khqr.js --amount 4.99 --save my-qr.png
```

---

## 💡 Best Practices

### For Development/Testing
```bash
# Use command line - fastest and most reliable
node scripts/generate-khqr.js --amount 4.99
```

### For Demos/Presentations
```bash
# Use simple web version - always works
open scripts/generate-khqr-simple.html
```

### For Production
Use the backend API (not these scripts):
```bash
POST /api/payments/generate-qr
```

---

## 🔄 Workflow: Simple Version + Command Line

Best approach if web version doesn't work:

**Step 1: Generate payload with simple HTML**
```bash
open scripts/generate-khqr-simple.html
# Fill in details, click Generate, copy payload
```

**Step 2: (Optional) Generate QR image from payload**
```javascript
// Add to generate-khqr.js if needed:
// Accept payload as input instead of generating new one
```

Or use any online QR generator:
- qr-code-generator.com
- qr.io
- goqr.me

---

## 📞 Still Having Issues?

### Check These:

1. **Node.js installed?**
   ```bash
   node --version  # Should show v18+
   ```

2. **QRCode package installed?**
   ```bash
   npm list qrcode
   ```

3. **In correct directory?**
   ```bash
   pwd  # Should show: .../reeltimemedia_web
   ls scripts/  # Should show generator files
   ```

4. **Internet connection?**
   - Try simple version (offline)
   - Or command line (offline)

---

## 🎯 Recommended Setup

For the most reliable experience:

```bash
# 1. Install dependencies
npm install qrcode

# 2. Test command line generator
node scripts/generate-khqr.js --amount 4.99

# 3. If command line works, you're all set!
# Use that for everything

# 4. For visual interface, use simple version
open scripts/generate-khqr-simple.html
```

---

## ✅ Success Checklist

- [x] Can run: `node scripts/generate-khqr.js --amount 4.99`
- [x] See ASCII QR in terminal
- [x] Can save QR as PNG with `--save`
- [x] Simple HTML opens and generates payload
- [x] Can copy payload to clipboard

If all above work, you're good to go! 🎉

---

## 📚 Alternative: Use Production API

Once you have KHQR API credentials:

```javascript
// Use the backend API instead
fetch('/api/payments/generate-qr', {
  method: 'POST',
  body: JSON.stringify({
    amount: 4.99,
    currency: 'USD',
    contentType: 'movie',
    contentTitle: 'Test Movie'
  })
})
```

This is the production-ready approach.

---

## 🆘 Emergency Fallback

If nothing works, generate payload manually:

```javascript
// Copy this into browser console
function formatTLV(tag, value) {
  const length = value.length.toString().padStart(2, '0');
  return `${tag}${length}${value}`;
}

// Build basic KHQR payload
let p = '';
p += formatTLV('00', '01');  // Format
p += formatTLV('01', '12');  // Dynamic
p += formatTLV('53', '840'); // USD
p += formatTLV('54', '4.99'); // Amount
p += formatTLV('58', 'KH');  // Country
// ... etc

console.log(p);
```

Then use any QR generator to convert to QR code.

---

**Need more help?** Check the main documentation:
- `KHQR_QUICKSTART.md`
- `KHQR_SETUP.md`
- `scripts/README.md`
