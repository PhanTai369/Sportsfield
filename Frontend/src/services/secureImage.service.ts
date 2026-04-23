import axios from 'axios';
import { API_BASE_URL } from '../config/api';

/**
 * Service for handling secure image operations
 */
const secureImageService = {
  /**
   * Get a signed URL for a secure image
   * 
   * @param {string} imageType - Type of image ('business_license', 'identity_card', 'identity_card_back')
   * @param {number|string} id - ID of the user or field
   * @returns {Promise<string>} - Promise that resolves to the secure URL
   */
  getSecureImageUrl: async (imageType, id) => {
    try {
      // Get token from localStorage and check if it exists
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Ensure token is not malformed
      if (token.split('.').length !== 3) {
        throw new Error('Invalid token format');
      }

      const apiUrl = `${API_BASE_URL}/secure-images/${imageType}/${id}`;
      
      // Make the API request with proper headers
      const response = await axios.get(
        apiUrl,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      if (!response.data.success || !response.data.data.secure_url) {
        throw new Error(`Failed to get secure image URL`);
      }
      
      return response.data.data.secure_url;
    } catch (error) {
      console.error('Error getting secure image URL:', error.message);
      
      throw error;
    }
  }
};

export default secureImageService;
