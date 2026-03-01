import React from "react";
import Navigation from "./Navigation";

const BaseLayout = ({ children, showNavigation = false, setIsAuthenticated }) => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {showNavigation && <Navigation setIsAuthenticated={setIsAuthenticated} />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
        {children}
      </main>
    </div>
  );
};

export default BaseLayout;
