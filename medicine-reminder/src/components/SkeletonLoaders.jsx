import React from 'react';

// Base skeleton component
export const Skeleton = ({ className = '', width = 'w-full', height = 'h-4', rounded = 'rounded' }) => {
  return (
    <div
      className={`animate-pulse bg-gray-300 dark:bg-gray-600 ${width} ${height} ${rounded} ${className}`}
      style={{
        background: 'linear-gradient(90deg, var(--bg-secondary) 25%, var(--border-color) 50%, var(--bg-secondary) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
};

// Medicine Card Skeleton
export const SkeletonMedicineCard = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-3">
          <Skeleton width="w-3/4" height="h-6" />
          <Skeleton width="w-1/2" height="h-4" />
        </div>
        <Skeleton width="w-16" height="h-8" rounded="rounded-full" />
      </div>
      
      <div className="space-y-2">
        <Skeleton width="w-full" height="h-4" />
        <Skeleton width="w-5/6" height="h-4" />
      </div>
      
      <div className="flex gap-2 pt-2">
        <Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
        <Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
        <Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
      </div>
    </div>
  );
};

// Dashboard Stats Skeleton
export const SkeletonStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 space-y-3">
          <Skeleton width="w-12" height="h-12" rounded="rounded-full" />
          <Skeleton width="w-24" height="h-8" />
          <Skeleton width="w-full" height="h-4" />
        </div>
      ))}
    </div>
  );
};

// List Item Skeleton
export const SkeletonListItem = () => {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
      <Skeleton width="w-12" height="h-12" rounded="rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton width="w-1/2" height="h-5" />
        <Skeleton width="w-3/4" height="h-4" />
      </div>
      <Skeleton width="w-8" height="h-8" rounded="rounded-full" />
    </div>
  );
};

// Table Skeleton
export const SkeletonTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} width="w-24" height="h-5" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-gray-100 p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} width="w-full" height="h-4" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Profile Skeleton
export const SkeletonProfile = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-8 text-center space-y-4">
        <Skeleton width="w-32" height="h-32" rounded="rounded-full" className="mx-auto" />
        <Skeleton width="w-48" height="h-6" className="mx-auto" />
        <Skeleton width="w-32" height="h-4" className="mx-auto" />
      </div>
      
      {/* Form Fields */}
      <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton width="w-32" height="h-5" />
            <Skeleton width="w-full" height="h-12" rounded="rounded-lg" />
          </div>
        ))}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton width="w-24" height="h-5" />
            <Skeleton width="w-full" height="h-12" rounded="rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton width="w-24" height="h-5" />
            <Skeleton width="w-full" height="h-12" rounded="rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Skeleton (combines multiple skeletons)
export const SkeletonDashboard = () => {
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton width="w-64" height="h-8" />
        <Skeleton width="w-48" height="h-5" />
      </div>
      
      {/* Stats */}
      <SkeletonStats />
      
      {/* Medicine Cards */}
      <div className="space-y-2">
        <Skeleton width="w-48" height="h-7" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonMedicineCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Medicine List Page Skeleton
export const SkeletonMedicineList = () => {
  return (
    <div className="space-y-6">
      {/* Search and filters */}
      <div className="flex gap-4">
        <Skeleton width="w-full" height="h-12" rounded="rounded-lg" />
        <Skeleton width="w-32" height="h-12" rounded="rounded-lg" />
      </div>
      
      {/* Medicine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonMedicineCard key={i} />
        ))}
      </div>
    </div>
  );
};

// Add CSS animation for shimmer effect
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;
document.head.appendChild(style);

export default Skeleton;
