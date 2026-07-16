import React from 'react';
import { useTheme } from '@/hooks/useTheme';

// The source image is a single 1387x1134 PNG: the left half is the silver-on-black
// mark (for dark backgrounds), the right half is the black-on-white mark (for light
// backgrounds). We crop to one half with a background-position trick instead of
// shipping two separate files.
const HALF_ASPECT_RATIO = '693.5 / 1134';

const Logo = ({ size = 40, rounded = true, className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      role="img"
      aria-label="Crow Educ"
      className={`shrink-0 ${rounded ? 'rounded-md' : ''} ${className}`}
      style={{
        width: size,
        aspectRatio: HALF_ASPECT_RATIO,
        backgroundImage: 'url(/crow-logo.png)',
        backgroundSize: '200% 100%',
        backgroundPosition: isDark ? 'left center' : 'right center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
};

export default Logo;
