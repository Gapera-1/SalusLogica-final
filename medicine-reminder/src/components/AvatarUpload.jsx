import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

/**
 * AvatarUpload Component
 * ----------------------
 * Allows users to upload and preview their profile avatar
 * 
 * Props:
 * - currentAvatar: URL of the current avatar image
 * - onUpload: Callback function called with the uploaded file
 * - size: Size of the avatar (default: 'lg')
 * - editable: Whether the avatar can be edited (default: true)
 */
const AvatarUpload = ({ 
  currentAvatar, 
  onUpload, 
  size = 'lg',
  editable = true,
  className = ''
}) => {
  const [preview, setPreview] = useState(currentAvatar);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Size configurations
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
  };

  const iconSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Call upload callback
    if (onUpload) {
      setUploading(true);
      onUpload(file)
        .then(() => {
          toast.success('Avatar uploaded successfully');
        })
        .catch((error) => {
          console.error('Upload error:', error);
          toast.error('Failed to upload avatar');
          setPreview(currentAvatar); // Revert to previous avatar
        })
        .finally(() => {
          setUploading(false);
        });
    }
  };

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    if (onUpload) {
      setUploading(true);
      onUpload(null)
        .then(() => {
          toast.success('Avatar removed');
        })
        .catch((error) => {
          console.error('Remove error:', error);
          toast.error('Failed to remove avatar');
          setPreview(currentAvatar);
        })
        .finally(() => {
          setUploading(false);
        });
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Avatar Container */}
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full
          overflow-hidden
          border-4 border-white shadow-lg
          ${editable ? 'cursor-pointer hover:opacity-80' : ''}
          transition-opacity
          ${uploading ? 'opacity-50' : ''}
          bg-gradient-to-br from-teal-400 to-teal-600
        `}
        onClick={handleClick}
        role={editable ? 'button' : 'img'}
        aria-label={editable ? 'Upload profile picture' : 'Profile picture'}
      >
        {preview ? (
          <img
            src={preview}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <i className={`fas fa-user ${iconSizes[size]}`}></i>
          </div>
        )}
      </div>

      {/* Upload Indicator */}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Edit Button Overlay */}
      {editable && !uploading && (
        <div className="absolute bottom-0 right-0 bg-teal-600 rounded-full p-2 shadow-lg hover:bg-teal-700 transition-colors">
          <i className="fas fa-camera text-white text-sm"></i>
        </div>
      )}

      {/* Remove Button */}
      {editable && preview && !uploading && (
        <button
          onClick={handleRemove}
          className="absolute top-0 right-0 bg-red-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors"
          aria-label="Remove avatar"
        >
          <i className="fas fa-times text-white text-xs"></i>
        </button>
      )}

      {/* Hidden File Input */}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default AvatarUpload;
