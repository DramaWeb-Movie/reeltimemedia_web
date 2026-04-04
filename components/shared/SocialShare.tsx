'use client';

import { FaFacebook, FaInstagram, FaLink } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useState } from 'react';

interface SocialShareProps {
  url?: string;
  title?: string;
}

export default function SocialShare({ url, title }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || 'Check out this on ReelTime Media!';

  const handleShare = (platform: string) => {
    let shareLink = '';
    
    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
        break;
      case 'instagram':
        handleCopyLink();
        return;
      case 'copy':
        handleCopyLink();
        return;
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-[#B3B3B3] font-medium">Share:</span>
      <button
        onClick={() => handleShare('facebook')}
        className="w-10 h-10 rounded-full bg-[#1877F2] hover:opacity-90 flex items-center justify-center text-white transition-all hover:scale-110"
        aria-label="Share on Facebook"
      >
        <FaFacebook className="text-xl" />
      </button>
      <button
        onClick={() => handleShare('twitter')}
        className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#333333] hover:border-white flex items-center justify-center text-white transition-all hover:scale-110"
        aria-label="Share on Twitter"
      >
        <FaXTwitter className="text-xl" />
      </button>
      <button
        onClick={() => handleShare('instagram')}
        className="w-10 h-10 rounded-full bg-linear-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 flex items-center justify-center text-white transition-all hover:scale-110"
        aria-label="Share on Instagram"
      >
        <FaInstagram className="text-xl" />
      </button>
      <button
        onClick={() => handleShare('copy')}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 ${
          copied 
            ? 'bg-green-500' 
            : 'bg-[#1A1A1A] border border-[#333333] hover:border-brand-red'
        }`}
        aria-label="Copy link"
      >
        <FaLink className="text-lg" />
      </button>
    </div>
  );
}

