import React from 'react';

const Logo = ({ className = "h-10 w-auto" }) => {
  return (
    <img 
      src="/images/saluslogica-logo.png" 
      alt="SalusLogica Logo" 
      className={className}
    />
  );
};

export default Logo;
