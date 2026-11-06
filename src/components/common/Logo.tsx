import React from 'react';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showTagline = false,
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 26 : size === 'lg' ? 44 : 32;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Brand Icon: Metallic Headphones + Green Visualizer Bars */}
      <div className="relative flex items-center justify-center">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_12px_rgba(29,185,84,0.4)]"
        >
          {/* Headphone Arch */}
          <path
            d="M8 26V20C8 11.1634 15.1634 4 24 4C32.8366 4 40 11.1634 40 20V26"
            stroke="#E5E7EB"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Left Earcup */}
          <rect
            x="5"
            y="23"
            width="6"
            height="14"
            rx="3"
            fill="#F3F4F6"
            stroke="#9CA3AF"
            strokeWidth="1.5"
          />

          {/* Right Earcup */}
          <rect
            x="37"
            y="23"
            width="6"
            height="14"
            rx="3"
            fill="#F3F4F6"
            stroke="#9CA3AF"
            strokeWidth="1.5"
          />

          {/* Vibrant Green Audio Visualizer Equalizer Bars inside */}
          <rect x="15" y="24" width="2.5" height="10" rx="1.25" fill="#1DB954" />
          <rect x="19.5" y="19" width="2.5" height="19" rx="1.25" fill="#1DB954" />
          <rect x="24" y="15" width="2.5" height="25" rx="1.25" fill="#1DB954" />
          <rect x="28.5" y="18" width="2.5" height="20" rx="1.25" fill="#1DB954" />
          <rect x="33" y="23" width="2.5" height="11" rx="1.25" fill="#1DB954" />
        </svg>
      </div>

      {/* Brand Name */}
      <div className="flex flex-col">
        <div className={`font-bold tracking-tight ${textSize} leading-tight flex items-center gap-1.5 text-white`}>
          <span>AI</span>
          <span className="text-[#1DB954] font-extrabold tracking-wide">DJ</span>
          <span>Studio</span>
        </div>
        {showTagline && (
          <span className="text-[10px] text-[#B3B3B3] font-medium tracking-normal mt-0.5">
            Listen Together. Mix Smarter.
          </span>
        )}
      </div>
    </div>
  );
};
