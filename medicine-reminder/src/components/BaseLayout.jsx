import React from "react";
import Navigation from "./Navigation";

const BaseLayout = ({ children, showNavigation = false, setIsAuthenticated }) => {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {showNavigation && <Navigation setIsAuthenticated={setIsAuthenticated} />}
      <main className="animate-fade-in">
        {children}
      </main>
    </div>
  );
};

export default BaseLayout;
