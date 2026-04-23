import { useEffect } from 'react';

/**
 * A custom hook to implement smooth scrolling with offset for anchor links
 * to account for fixed headers
 */
export const useSmoothScroll = () => {
  useEffect(() => {
    // Function to handle anchor link clicks
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if the clicked element is an anchor with a hash
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        const hash = target.getAttribute('href');
        if (!hash) return;
        
        const targetElement = document.querySelector(hash);
        if (targetElement) {
          e.preventDefault();
          
          // Get the navbar height for offset
          const navbar = document.querySelector('nav');
          const navbarHeight = navbar ? navbar.offsetHeight : 0;
          
          // Calculate the target position with offset
          const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight - 20; // 20px extra padding
          
          // Scroll to the target position smoothly
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
          
          // Update the URL hash without causing a page jump
          history.pushState(null, '', hash);
        }
      }
    };

    // Add event listener to the document
    document.addEventListener('click', handleAnchorClick);
    
    // Handle initial hash in URL
    if (window.location.hash) {
      setTimeout(() => {
        const targetElement = document.querySelector(window.location.hash);
        if (targetElement) {
          const navbar = document.querySelector('nav');
          const navbarHeight = navbar ? navbar.offsetHeight : 0;
          const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
    
    // Clean up the event listener
    return () => {
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);
};
