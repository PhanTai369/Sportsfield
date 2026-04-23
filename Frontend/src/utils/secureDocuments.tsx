// Document security utility functions for the admin dashboard
import React, { useState, useEffect, useRef } from 'react';
import secureImageService from '@/services/secureImage.service';

// Debug function for logging - set to noop in production
const debug = (message, data = null) => {
  // Uncomment for debugging
  // if (data) {
  //   console.log(`${message}`, data);
  // } else {
  //   console.log(`${message}`);
  // }
};

// Token validation utility
const validateToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    debug('No authentication token found in localStorage');
    return false;
  }
  
  try {
    // Simple structure check (not full JWT validation)
    const parts = token.split('.');
    if (parts.length !== 3) {
      debug('Token does not have valid JWT format (3 parts)');
      return false;
    }
    
    // Check if payload can be parsed
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration if available
    if (payload.exp) {
      const expiryDate = new Date(payload.exp * 1000);
      const now = new Date();
      if (expiryDate < now) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Custom hook for handling secure document URLs
 * @param {number|string} ownerId - The ID of the document owner (user)
 * @returns {object} - Object containing secure URL state and handler functions
 */
export const useSecureDocuments = (ownerId) => {
  const [secureUrls, setSecureUrls] = useState({});
  const [loadingSecureUrls, setLoadingSecureUrls] = useState(false);
  const [secureUrlsError, setSecureUrlsError] = useState(null);

  /**
   * Load secure URLs for the specified document types
   * @param {Array<string>} documentTypes - Array of document types to load
   * @param {string} idParam - Optional specific ID to use (like field_123), defaults to ownerId
   */
  const loadSecureUrls = async (
    documentTypes = ['business_license', 'identity_card', 'identity_card_back'], 
    idParam = null
  ) => {
    const id = idParam || ownerId;
    
    if (!id) {
      setSecureUrlsError('No ID provided for document access');
      return;
    }
    
    // Validate token before attempting API calls
    if (!validateToken()) {
      setSecureUrlsError('Authentication invalid or expired. Please log in again.');
      return;
    }
    
    try {
      setLoadingSecureUrls(true);
      setSecureUrlsError(null);
      
      const urls = {};
      const fetchPromises = documentTypes.map(async (docType) => {
        try {
          const url = await secureImageService.getSecureImageUrl(docType, id);
          urls[docType] = url;
        } catch (error) {
          console.error(`Failed to load secure URL for ${docType}:`, error);
        }
      });
      
      await Promise.all(fetchPromises);
      setSecureUrls(urls);
    } catch (error) {
      console.error('Error loading secure URLs:', error);
      setSecureUrlsError(error.message || 'Failed to load secure document URLs');
    } finally {
      setLoadingSecureUrls(false);
    }
  };

  /**
   * Clear all loaded secure URLs
   */
  const clearSecureUrls = () => {
    setSecureUrls({});
    setSecureUrlsError(null);
  };
  
  return {
    secureUrls,
    loadingSecureUrls,
    secureUrlsError,
    loadSecureUrls,
    clearSecureUrls
  };
};

/**
 * Component for displaying a secure document image with enhanced protection
 * against direct URL extraction and unauthorized downloading
 */
export const SecureDocumentImage = ({ 
  url, 
  alt, 
  onClick, 
  className = "w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  // Generate a random ID for each instance of the component
  const secureId = React.useMemo(() => Math.random().toString(36).substring(2, 15), [url]);
  // Use a reference to store the actual image element
  const imgRef = React.useRef(null);
  // Create a canvas reference for advanced protection (optional renderer)
  const canvasRef = React.useRef(null);
  // Add state for secure URL handling
  const [secureRendering, setSecureRendering] = useState(false);
  
  // Reset error state when URL changes
  useEffect(() => {
    if (url) {
      setImgError(false);
      setImgLoaded(false);
      setSecureRendering(false);
    }
  }, [url, alt]);
  
  const handleImageError = (e) => {
    setImgError(true);
    setImgLoaded(false);
    setSecureRendering(false);
  };
  
  const handleImageLoad = () => {
    setImgLoaded(true);
    setImgError(false);
    
    // Optional: Advanced protection - render image to canvas
    // Uncomment if you want to use canvas rendering instead of direct img
    // if (imgRef.current && canvasRef.current && !secureRendering) {
    //   const canvas = canvasRef.current;
    //   const ctx = canvas.getContext('2d');
    //   canvas.width = imgRef.current.naturalWidth;
    //   canvas.height = imgRef.current.naturalHeight;
    //   ctx.drawImage(imgRef.current, 0, 0);
    //   setSecureRendering(true);
    // }
  };



  // Prevent drag operations
  const preventDragHandler = (e) => {
    e.stopPropagation();
    e.preventDefault();
    return false;
  };

  // Block context menu (right-click)
  const preventContextMenu = (e) => {
    e.stopPropagation();
    e.preventDefault();
    return false;
  };




  // Set up simpler event listeners that don't interfere with normal operation
  useEffect(() => {
    // Only add basic keyboard protection to the component itself, not document-wide
    const handleKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && 
          (e.key === 's' || e.key === 'p' || e.key === 'c')) {
        e.preventDefault();
        return false;
      }
    };

    // Clean up listeners when component unmounts
    return () => {
      // No global handlers to clean up
    };
  }, [url]);

  if (!url) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
        <div className="flex justify-center mb-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-12 h-12 text-gray-400"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Không thể tải hình ảnh bảo mật</p>
      </div>
    );
  }
  
  if (imgError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
        <div className="flex justify-center mb-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-12 h-12 text-red-400"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500">Lỗi tải hình ảnh</p>
        <button 
          onClick={onClick}
          className="text-xs text-blue-600 hover:underline mt-1"
        >
          Xem ảnh
        </button>
      </div>
    );
  }
  
  // Modified security wrapper around the image - less restrictive to ensure it works
  return (
    <div 
      className="relative w-full h-full select-none" 
      onContextMenu={preventContextMenu}
      onDragStart={preventDragHandler}
      data-secure-id={secureId}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none' as any,
        MozUserSelect: 'none' as any,
        msUserSelect: 'none' as any
      }}
    >
      {/* Loading indicator */}
      {!imgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Primary image with basic protection */}
      <img 
        ref={imgRef}
        src={url} 
        alt={alt || 'Tài liệu bảo mật'}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        draggable="false"
        className={`${className} ${imgLoaded ? 'opacity-100' : 'opacity-0'} select-none transition-opacity duration-300`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        onContextMenu={preventContextMenu}
        onDragStart={preventDragHandler}
        onClick={onClick}
        style={{ 
          // WebkitUserDrag: 'none' as any,
          WebkitUserSelect: 'none' as any,
          MozUserSelect: 'none' as any,
          msUserSelect: 'none' as any,
        }}
      />
      
      {/* Simplified overlay for protection without breaking functionality */}
      <div 
        className="absolute inset-0 bg-transparent pointer-events-none"
        style={{
          background: 'linear-gradient(45deg, rgba(255,255,255,0.02) 25%, rgba(0,0,0,0.02) 25%, rgba(0,0,0,0.02) 50%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.02) 75%, rgba(0,0,0,0.02) 75%, rgba(0,0,0,0.02))',
          backgroundSize: '4px 4px',
        }}
      />
      
      {/* Single watermark overlay for document protection */}
      <div className="absolute inset-0 pointer-events-none select-none opacity-5">
        <div 
          className="absolute w-full text-center text-gray-800 opacity-70 whitespace-nowrap transform -rotate-30"
          style={{ 
            top: '50%', 
            left: '0',
            right: '0', 
            fontSize: '12px', 
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          Tài liệu bảo mật • {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

export default {
  useSecureDocuments,
  SecureDocumentImage
};
