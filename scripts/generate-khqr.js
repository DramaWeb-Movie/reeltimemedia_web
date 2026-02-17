#!/usr/bin/env node

/**
 * KHQR QR Code Generator Script
 * 
 * Generates KHQR-compliant QR codes following the EMVCo standard
 * used by Cambodia's Bakong payment system.
 * 
 * Usage:
 *   node scripts/generate-khqr.js
 *   node scripts/generate-khqr.js --amount 4.99 --currency USD --description "Movie Purchase"
 */

const crypto = require('crypto');

// Configuration
const CONFIG = {
  merchantName: 'ReelTime Media',
  merchantCity: 'Phnom Penh',
  merchantId: '000123456789', // Replace with your actual merchant ID
  countryCode: 'KH',
};

/**
 * Calculate CRC16-CCITT checksum for KHQR validation
 */
function calculateCRC16(data) {
  let crc = 0xFFFF;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  
  crc = crc & 0xFFFF;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Format a field with Tag-Length-Value (TLV) format
 */
function formatTLV(tag, value) {
  const length = value.length.toString().padStart(2, '0');
  return `${tag}${length}${value}`;
}

/**
 * Generate KHQR EMVCo QR code payload
 */
function generateKHQR(options = {}) {
  const {
    amount = 4.99,
    currency = 'USD',
    description = 'Payment',
    reference = null,
    merchantName = CONFIG.merchantName,
    merchantCity = CONFIG.merchantCity,
    merchantId = CONFIG.merchantId,
  } = options;

  // Generate unique reference if not provided
  const paymentReference = reference || `RTL-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // Build EMVCo QR payload
  let payload = '';

  // Payload Format Indicator (00)
  payload += formatTLV('00', '01');

  // Point of Initiation Method (01) - Static: 11, Dynamic: 12
  payload += formatTLV('01', '12'); // Dynamic QR

  // Merchant Account Information (26-51)
  // For KHQR, we use tag 29 for Bakong
  let merchantInfo = '';
  merchantInfo += formatTLV('00', 'kh.gov.nbc.bakong'); // Globally Unique Identifier
  merchantInfo += formatTLV('01', merchantId); // Merchant ID
  payload += formatTLV('29', merchantInfo);

  // Transaction Currency (53)
  const currencyCode = currency === 'USD' ? '840' : '116'; // USD: 840, KHR: 116
  payload += formatTLV('53', currencyCode);

  // Transaction Amount (54) - Only if specified
  if (amount) {
    const amountStr = amount.toFixed(2);
    payload += formatTLV('54', amountStr);
  }

  // Country Code (58)
  payload += formatTLV('58', CONFIG.countryCode);

  // Merchant Name (59)
  payload += formatTLV('59', merchantName);

  // Merchant City (60)
  payload += formatTLV('60', merchantCity);

  // Additional Data Field Template (62)
  let additionalData = '';
  
  // Bill Number / Reference (01)
  if (paymentReference) {
    additionalData += formatTLV('01', paymentReference.slice(0, 25));
  }
  
  // Purpose of Transaction (08)
  if (description) {
    additionalData += formatTLV('08', description.slice(0, 25));
  }

  if (additionalData) {
    payload += formatTLV('62', additionalData);
  }

  // CRC (63) - Must be last, calculated over entire payload + '6304'
  payload += '6304';
  const crc = calculateCRC16(payload);
  payload = payload.slice(0, -4) + formatTLV('63', crc);

  return {
    payload,
    reference: paymentReference,
    amount,
    currency,
    description,
    merchantName,
    merchantCity,
  };
}

/**
 * Display QR code in terminal using ASCII art
 */
function displayASCIIQR(payload) {
  try {
    const QRCode = require('qrcode');
    
    QRCode.toString(payload, { type: 'terminal', small: true }, (err, url) => {
      if (err) {
        console.error('Error generating QR code:', err);
        return;
      }
      console.log('\n' + url);
    });
  } catch (error) {
    console.log('\nℹ️  Install qrcode package to display QR in terminal:');
    console.log('   npm install qrcode\n');
  }
}

/**
 * Save QR code as PNG image
 */
async function saveQRImage(payload, filename = 'khqr-payment.png') {
  try {
    const QRCode = require('qrcode');
    await QRCode.toFile(filename, payload, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    console.log(`✅ QR code saved as: ${filename}`);
  } catch (error) {
    console.log('ℹ️  Install qrcode package to save QR images:');
    console.log('   npm install qrcode');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--amount' && args[i + 1]) {
      options.amount = parseFloat(args[i + 1]);
      i++;
    } else if (arg === '--currency' && args[i + 1]) {
      options.currency = args[i + 1].toUpperCase();
      i++;
    } else if (arg === '--description' && args[i + 1]) {
      options.description = args[i + 1];
      i++;
    } else if (arg === '--reference' && args[i + 1]) {
      options.reference = args[i + 1];
      i++;
    } else if (arg === '--merchant-id' && args[i + 1]) {
      options.merchantId = args[i + 1];
      i++;
    } else if (arg === '--save' && args[i + 1]) {
      options.saveAs = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
┌─────────────────────────────────────────────────────────────────┐
│                    KHQR QR Code Generator                        │
│                  Generate Bakong Payment QR Codes                │
└─────────────────────────────────────────────────────────────────┘

USAGE:
  node scripts/generate-khqr.js [options]

OPTIONS:
  --amount <number>        Payment amount (default: 4.99)
  --currency <USD|KHR>     Currency code (default: USD)
  --description <text>     Payment description (default: "Payment")
  --reference <text>       Payment reference (auto-generated if not provided)
  --merchant-id <id>       Merchant ID (default: 000123456789)
  --save <filename>        Save QR code as PNG image
  --help, -h               Show this help message

EXAMPLES:
  # Generate QR for $4.99 movie purchase
  node scripts/generate-khqr.js --amount 4.99 --description "Movie Purchase"

  # Generate QR in KHR currency
  node scripts/generate-khqr.js --amount 20000 --currency KHR

  # Generate and save QR image
  node scripts/generate-khqr.js --amount 9.99 --save subscription-qr.png

  # Full example
  node scripts/generate-khqr.js \\
    --amount 4.99 \\
    --currency USD \\
    --description "Awesome Movie" \\
    --reference "RTL-MOVIE-123" \\
    --save payment-qr.png

NOTES:
  - Install 'qrcode' package to display/save QR codes: npm install qrcode
  - Default merchant ID is for testing only
  - Get your real merchant ID from KHQR portal: https://khqr.link/
  `);
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();

  console.log('\n┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                    KHQR QR Code Generator                        │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  // Generate KHQR payload
  const qrData = generateKHQR(options);

  // Display information
  console.log('📋 Payment Details:');
  console.log('─'.repeat(65));
  console.log(`   Merchant:    ${qrData.merchantName}`);
  console.log(`   City:        ${qrData.merchantCity}`);
  console.log(`   Amount:      ${qrData.amount.toFixed(2)} ${qrData.currency}`);
  console.log(`   Description: ${qrData.description}`);
  console.log(`   Reference:   ${qrData.reference}`);
  console.log('─'.repeat(65));

  console.log('\n🔢 EMVCo QR Payload:');
  console.log('─'.repeat(65));
  console.log(qrData.payload);
  console.log('─'.repeat(65));

  console.log(`\n📏 Payload Length: ${qrData.payload.length} characters`);

  // Display QR code in terminal
  console.log('\n📱 QR Code:');
  displayASCIIQR(qrData.payload);

  // Save QR image if requested
  if (options.saveAs) {
    console.log('');
    await saveQRImage(qrData.payload, options.saveAs);
  }

  console.log('\n💡 Tips:');
  console.log('   - Test this QR with a KHQR-compatible banking app');
  console.log('   - Get your real merchant ID from: https://khqr.link/');
  console.log('   - For production, use the KHQR API for dynamic QR generation');
  console.log('   - Install qrcode package: npm install qrcode\n');

  // Return data for programmatic use
  return qrData;
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use as module
module.exports = {
  generateKHQR,
  calculateCRC16,
  formatTLV,
};
