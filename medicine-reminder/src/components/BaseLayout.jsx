import React from "react";
import Navigation from "./Navigation";

const BaseLayout = ({ children, showNavigation = false, setIsAuthenticated }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {showNavigation && <Navigation setIsAuthenticated={setIsAuthenticated} />}
      {children}
    </div>
  );
};

export default BaseLayout;
