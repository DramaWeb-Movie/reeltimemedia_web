'use client';

import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

interface KHQRCardProps {
  qrData: string;
  amount: number;
  currency: 'USD' | 'KHR';
  merchantName?: string;
  merchantCity?: string;
  reference?: string;
  imageUrl?: string; // From KHQR API
}

/**
 * KHQRCard Component
 * 
 * Displays a KHQR payment card styled like the official Bakong/KHQR design
 * Matches the visual style shown in official KHQR screenshots
 */
export default function KHQRCard({
  qrData,
  amount,
  currency,
  merchantName = 'ReelTime Media',
  merchantCity = 'Phnom Penh',
  reference,
  imageUrl,
}: KHQRCardProps) {
  const displayAmount = currency === 'KHR' 
    ? `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${amount.toFixed(2)}`;

  // If KHQR API provided a styled image, use that
  if (imageUrl) {
    return (
      <div className="flex flex-col items-center">
        <img 
          src={imageUrl} 
          alt="KHQR Payment QR Code"
          className="max-w-full h-auto rounded-xl shadow-lg"
          style={{ maxWidth: '400px' }}
        />
        {reference && (
          <p className="text-[#808080] text-xs mt-4 text-center">
            Ref: {reference}
          </p>
        )}
      </div>
    );
  }

  // Otherwise, create our own styled card matching KHQR design
  return (
    <div 
      className="bg-white rounded-2xl shadow-2xl overflow-hidden"
      style={{ maxWidth: '400px', width: '100%' }}
    >
      {/* KHQR Header - Red background like official design */}
      <div 
        className="py-6 px-6 flex items-center justify-center"
        style={{ backgroundColor: '#E31837' }}
      >
        <div className="text-white text-4xl font-bold tracking-wider">
          KHQR
        </div>
      </div>

      {/* White body section */}
      <div className="bg-white px-8 py-6">
        {/* Merchant Name in Khmer style */}
        <div className="text-center mb-2">
          <p className="text-gray-700 text-lg font-medium">
            {merchantName}
          </p>
          {merchantCity && (
            <p className="text-gray-500 text-sm">
              {merchantCity}
            </p>
          )}
        </div>

        {/* Amount Display */}
        <div className="text-center mb-6">
          <p className="text-gray-900 text-3xl font-bold">
            {displayAmount} <span className="text-2xl">{currency}</span>
          </p>
        </div>

        {/* QR Code with logo overlay */}
        <div className="flex justify-center mb-4 relative">
          <div className="relative">
            {/* QR Code */}
            <QRCodeSVG
              value={qrData}
              size={280}
              level="M"
              includeMargin={true}
              style={{
                border: '2px solid #f0f0f0',
                borderRadius: '12px',
                padding: '8px',
              }}
            />
            
            {/* Center logo overlay (Bakong style) */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2"
              style={{ 
                width: '60px', 
                height: '60px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#E31837' }}
              >
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                >
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="12" r="4" fill="white"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Reference number */}
        {reference && (
          <div className="text-center">
            <p className="text-gray-400 text-xs">
              Ref: {reference}
            </p>
          </div>
        )}
      </div>

      {/* Footer with instructions */}
      <div 
        className="px-6 py-4 text-center"
        style={{ backgroundColor: '#f8f9fa' }}
      >
        <p className="text-gray-600 text-xs">
          Scan with KHQR-compatible banking app
        </p>
        <p className="text-gray-500 text-xs mt-1">
          ABA • ACLEDA • Wing • PiPay • TrueMoney
        </p>
      </div>
    </div>
  );
}
