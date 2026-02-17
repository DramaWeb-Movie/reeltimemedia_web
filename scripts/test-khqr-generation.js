#!/usr/bin/env node

/**
 * Test KHQR Generation Script
 * 
 * Generates multiple KHQR QR codes for testing different scenarios
 */

const { generateKHQR } = require('./generate-khqr');

console.log('\n┌─────────────────────────────────────────────────────────────────┐');
console.log('│              KHQR Test QR Code Generation                        │');
console.log('└─────────────────────────────────────────────────────────────────┘\n');

// Test scenarios
const testCases = [
  {
    name: 'Movie Purchase (USD)',
    amount: 4.99,
    currency: 'USD',
    description: 'Awesome Movie',
  },
  {
    name: 'Movie Purchase (KHR)',
    amount: 20000,
    currency: 'KHR',
    description: 'Khmer Movie',
  },
  {
    name: 'Series Subscription',
    amount: 9.99,
    currency: 'USD',
    description: 'Monthly Subscription',
  },
  {
    name: 'Premium Movie',
    amount: 7.99,
    currency: 'USD',
    description: 'Premium Content',
  },
];

console.log('Generating test QR codes...\n');

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log('─'.repeat(65));
  
  const qrData = generateKHQR(testCase);
  
  console.log(`   Amount:      ${qrData.amount} ${qrData.currency}`);
  console.log(`   Description: ${qrData.description}`);
  console.log(`   Reference:   ${qrData.reference}`);
  console.log(`   Payload:     ${qrData.payload.substring(0, 50)}...`);
  console.log(`   Length:      ${qrData.payload.length} chars`);
});

console.log('\n\n✅ All test QR codes generated successfully!');
console.log('\n💡 To generate a specific QR code, use:');
console.log('   node scripts/generate-khqr.js --amount 4.99 --description "Test"\n');
