const NodeGeocoder = require('node-geocoder');
const geolib = require('geolib');
const logger = require('../utils/logger');
const axios = require('axios');

// Primary geocoder with Google Maps (requires API key)
const googleGeocoderOptions = {
  provider: 'google',
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  formatter: null
};

// Secondary geocoder with OpenStreetMap/Nominatim as geoAPI backup
const geoApiOptions = {
  provider: 'openstreetmap',
  httpAdapter: 'https',
  formatter: null,
  headers: {
    'User-Agent': 'Football-Field-Booking-App/1.0 (contact@sportfields.com)'
  }
};

// Alternative geoAPI options (you can switch between different services)
const alternativeGeoApiOptions = {
  // Option 1: LocationIQ (requires API key)
  locationiq: {
    provider: 'locationiq',
    apiKey: process.env.LOCATIONIQ_API_KEY,
    formatter: null
  },
  // Option 2: MapBox (requires API key)
  mapbox: {
    provider: 'mapbox',
    apiKey: process.env.MAPBOX_API_KEY,
    formatter: null
  },
  // Option 3: HERE (requires API key)
  here: {
    provider: 'here',
    apiKey: process.env.HERE_API_KEY,
    formatter: null
  }
};

const googleGeocoder = process.env.GOOGLE_MAPS_API_KEY ? NodeGeocoder(googleGeocoderOptions) : null;
const geoApiGeocoder = NodeGeocoder(geoApiOptions);

// Optional: You can enable alternative geoAPI by setting the appropriate API key
const alternativeGeocoder = (() => {
  if (process.env.LOCATIONIQ_API_KEY) return NodeGeocoder(alternativeGeoApiOptions.locationiq);
  if (process.env.MAPBOX_API_KEY) return NodeGeocoder(alternativeGeoApiOptions.mapbox);
  if (process.env.HERE_API_KEY) return NodeGeocoder(alternativeGeoApiOptions.here);
  return null;
})();

/**
 * Enhanced geocoding with Google Maps API and fallback coordinates
 * @param {string} address - Address text to geocode
 * @returns {Promise<Object>} - Object containing latitude, longitude, and formatted address
 */
const geocodeAddress = async (address) => {
  try {
    // === INPUT VALIDATION ===
    if (!address || typeof address !== 'string') {
      throw new Error('INVALID_INPUT: Address must be a non-empty string');
    }
    
    const trimmedAddress = address.trim();
    if (trimmedAddress.length === 0) {
      throw new Error('EMPTY_ADDRESS: Address cannot be empty or whitespace only');
    }
    
    if (trimmedAddress.length > 500) {
      throw new Error('ADDRESS_TOO_LONG: Address exceeds maximum length of 500 characters');
    }

    // Check for potentially problematic characters
    const hasSpecialChars = /[^\w\s\u00C0-\u024F\u1E00-\u1EFF,.-]/g.test(trimmedAddress);
    if (hasSpecialChars) {
      logger.warn(`Address contains special characters: ${trimmedAddress}`);
    }

    const normalizedAddress = trimmedAddress.toLowerCase().trim();
    
    // === STEP 1: TRY GOOGLE MAPS API FIRST ===
    if (googleGeocoder) {
      try {
        logger.info(`🌍 Attempting Google Maps geocoding for: "${address}" (timeout: 60s)`);
        
        // Rate limiting for Google API
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create timeout promise with 30 seconds timeout to prioritize Google API
        const googlePromise = googleGeocoder.geocode(trimmedAddress);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GOOGLE_TIMEOUT')), 60000)
        );
        
        const results = await Promise.race([googlePromise, timeoutPromise]);
        
        if (results && results.length > 0) {
          const result = results[0];
          const lat = parseFloat(result.latitude);
          const lon = parseFloat(result.longitude);
          
          if (validateCoordinates(lat, lon)) {
            logger.info(`✅ Google Maps geocoding successful for: "${address}"`);
            return {
              latitude: lat,
              longitude: lon,
              formattedAddress: result.formattedAddress || trimmedAddress,
              city: result.city || '',
              district: result.administrativeLevels?.level2long || '',
              ward: result.administrativeLevels?.level3long || '',
              country: result.country || '',
              countryCode: result.countryCode || '',
              source: 'google_maps',
              confidence: 'high'
            };
          } else {
            logger.warn(`❌ Google Maps returned invalid coordinates: lat=${lat}, lon=${lon}`);
          }
        } else {
          logger.warn(`❌ Google Maps returned no results for: "${address}"`);
        }
      } catch (error) {
        logger.warn(`❌ Google Maps failed for: "${address}" - ${error.message}`);
      }
    } else {
      logger.warn('🔑 Google Maps API key not configured, trying geoAPI...');
    }

    // === STEP 2: TRY GEOAPI (OpenStreetMap/Nominatim or Alternative APIs) ===
    let geoApiResult = null;
    let geoApiError = null;
    
    // Try alternative geocoder first (LocationIQ, MapBox, HERE) if available
    if (alternativeGeocoder) {
      try {
        logger.info(`🗺️ Attempting alternative geoAPI geocoding for: "${address}" (timeout: 15s)`);
        
        // Rate limiting for alternative API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const altPromise = alternativeGeocoder.geocode(trimmedAddress);
        const altTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('ALT_GEOAPI_TIMEOUT')), 15000)
        );
        
        const altResults = await Promise.race([altPromise, altTimeoutPromise]);
        
        if (altResults && altResults.length > 0) {
          const result = altResults[0];
          const lat = parseFloat(result.latitude);
          const lon = parseFloat(result.longitude);
          
          if (validateCoordinates(lat, lon)) {
            logger.info(`✅ Alternative geoAPI geocoding successful for: "${address}"`);
            return {
              latitude: lat,
              longitude: lon,
              formattedAddress: result.formattedAddress || trimmedAddress,
              city: result.city || '',
              district: result.administrativeLevels?.level2long || '',
              ward: result.administrativeLevels?.level3long || '',
              country: result.country || '',
              countryCode: result.countryCode || '',
              source: 'alternative_geoapi',
              confidence: 'high'
            };
          } else {
            geoApiError = new Error(`ALT_GEOAPI_INVALID_COORDS: lat=${lat}, lon=${lon}`);
          }
        } else {
          geoApiError = new Error('ALT_GEOAPI_NO_RESULTS');
        }
      } catch (error) {
        geoApiError = error;
        logger.warn(`❌ Alternative geoAPI failed for: "${address}" - ${error.message}`);
      }
    }
    
    // Try OpenStreetMap/Nominatim as secondary geoAPI
    if (!geoApiResult) {
      try {
        logger.info(`🌐 Attempting OpenStreetMap geoAPI geocoding for: "${address}" (timeout: 15s)`);
        
        // Rate limiting for OSM
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const osmPromise = geoApiGeocoder.geocode(trimmedAddress);
        const osmTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OSM_GEOAPI_TIMEOUT')), 15000)
        );
        
        const osmResults = await Promise.race([osmPromise, osmTimeoutPromise]);
        
        if (osmResults && osmResults.length > 0) {
          const result = osmResults[0];
          const lat = parseFloat(result.latitude);
          const lon = parseFloat(result.longitude);
          
          if (validateCoordinates(lat, lon)) {
            geoApiResult = {
              latitude: lat,
              longitude: lon,
              formattedAddress: result.formattedAddress || trimmedAddress,
              city: result.city || '',
              district: result.administrativeLevels?.level2long || '',
              ward: result.administrativeLevels?.level3long || '',
              country: result.country || '',
              countryCode: result.countryCode || '',
              source: 'openstreetmap_geoapi',
              confidence: 'medium'
            };
            logger.info(`✅ OpenStreetMap geoAPI geocoding successful for: "${address}"`);
          } else {
            geoApiError = new Error(`OSM_GEOAPI_INVALID_COORDS: lat=${lat}, lon=${lon}`);
          }
        } else {
          geoApiError = new Error('OSM_GEOAPI_NO_RESULTS');
        }
      } catch (error) {
        geoApiError = error;
        logger.warn(`❌ OpenStreetMap geoAPI failed for: "${address}" - ${error.message}`);
      }
    }
    
    // Return geoAPI result if successful
    if (geoApiResult) {
      return geoApiResult;
    }

    // === STEP 3: EXACT FALLBACK COORDINATES ===
    const fallbackCoordinates = {
      'quận 1, hồ chí minh': { latitude: 10.7769, longitude: 106.7009, city: 'Hồ Chí Minh', district: 'Quận 1' },
      'quận 8, hồ chí minh': { latitude: 10.7378, longitude: 106.6765, city: 'Hồ Chí Minh', district: 'Quận 8' },
      'thủ đức, hồ chí minh': { latitude: 10.8700, longitude: 106.8000, city: 'Hồ Chí Minh', district: 'Thủ Đức' },
      'gò vấp, hồ chí minh': { latitude: 10.8370, longitude: 106.6420, city: 'Hồ Chí Minh', district: 'Gò Vấp' },
      'cần thơ': { latitude: 10.0340, longitude: 105.7800, city: 'Cần Thơ', district: 'Ninh Kiều' },
      'hà nội': { latitude: 21.0285, longitude: 105.8542, city: 'Hà Nội', district: 'Hoàn Kiếm' },
      'ngũ hành sơn, đà nẵng': { latitude: 16.0040, longitude: 108.2628, city: 'Đà Nẵng', district: 'Ngũ Hành Sơn' },
      'đà nẵng': { latitude: 16.0471, longitude: 108.2068, city: 'Đà Nẵng', district: 'Hải Châu' },
      'cẩm lệ, đà nẵng': { latitude: 16.0471, longitude: 108.2068, city: 'Đà Nẵng', district: 'Cẩm Lệ' },
      'vũng tàu': { latitude: 10.3532, longitude: 107.0714, city: 'Bà Rịa - Vũng Tàu', district: 'Vũng Tàu' },
      'phú quốc': { latitude: 10.1353, longitude: 104.0331, city: 'Kiên Giang', district: 'Phú Quốc' },
      'sa pa': { latitude: 22.3154, longitude: 103.8400, city: 'Lào Cai', district: 'Sa Pa' },
      'hội an': { latitude: 15.8792, longitude: 108.3238, city: 'Quảng Nam', district: 'Hội An' }
    };

    logger.info(`🔍 Checking exact fallback matches for: "${address}"`);
    
    for (const [key, coords] of Object.entries(fallbackCoordinates)) {
      if (normalizedAddress.includes(key)) {
        logger.info(`✅ Using exact fallback for: "${address}" (matched: "${key}")`);
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          formattedAddress: trimmedAddress,
          city: coords.city,
          district: coords.district,
          ward: '',
          country: 'Việt Nam',
          countryCode: 'VN',
          source: 'exact_fallback',
          confidence: 'high'
        };
      }
    }

    // === STEP 4: PARTIAL FALLBACK MATCHING ===
    const partialMatches = {
      'hồ chí minh': { latitude: 10.7769, longitude: 106.7009, city: 'Hồ Chí Minh', district: 'Quận 1' },
      'hcm': { latitude: 10.7769, longitude: 106.7009, city: 'Hồ Chí Minh', district: 'Quận 1' },
      'sài gòn': { latitude: 10.7769, longitude: 106.7009, city: 'Hồ Chí Minh', district: 'Quận 1' },
      'saigon': { latitude: 10.7769, longitude: 106.7009, city: 'Hồ Chí Minh', district: 'Quận 1' },
      'đà nẵng': { latitude: 16.0471, longitude: 108.2068, city: 'Đà Nẵng', district: 'Hải Châu' },
      'da nang': { latitude: 16.0471, longitude: 108.2068, city: 'Đà Nẵng', district: 'Hải Châu' },
      'danang': { latitude: 16.0471, longitude: 108.2068, city: 'Đà Nẵng', district: 'Hải Châu' },
      'hà nội': { latitude: 21.0285, longitude: 105.8542, city: 'Hà Nội', district: 'Hoàn Kiếm' },
      'ha noi': { latitude: 21.0285, longitude: 105.8542, city: 'Hà Nội', district: 'Hoàn Kiếm' },
      'hanoi': { latitude: 21.0285, longitude: 105.8542, city: 'Hà Nội', district: 'Hoàn Kiếm' },
      'cần thơ': { latitude: 10.0340, longitude: 105.7800, city: 'Cần Thơ', district: 'Ninh Kiều' },
      'can tho': { latitude: 10.0340, longitude: 105.7800, city: 'Cần Thơ', district: 'Ninh Kiều' },
      'vũng tàu': { latitude: 10.3532, longitude: 107.0714, city: 'Bà Rịa - Vũng Tàu', district: 'Vũng Tàu' },
      'vung tau': { latitude: 10.3532, longitude: 107.0714, city: 'Bà Rịa - Vũng Tàu', district: 'Vũng Tàu' },
      'phú quốc': { latitude: 10.1353, longitude: 104.0331, city: 'Kiên Giang', district: 'Phú Quốc' },
      'phu quoc': { latitude: 10.1353, longitude: 104.0331, city: 'Kiên Giang', district: 'Phú Quốc' }
    };

    logger.info(`🔍 Checking partial fallback matches for: "${address}"`);

    for (const [key, coords] of Object.entries(partialMatches)) {
      if (normalizedAddress.includes(key)) {
        logger.info(`🔄 Using partial fallback for: "${address}" (matched: "${key}")`);
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          formattedAddress: trimmedAddress,
          city: coords.city,
          district: coords.district,
          ward: '',
          country: 'Việt Nam',
          countryCode: 'VN',
          source: 'partial_fallback',
          confidence: 'medium'
        };
      }
    }

    // === STEP 5: ALL METHODS FAILED ===
    const errorDetails = [];
    if (googleGeocoder) {
      errorDetails.push('Google Maps: Failed or no results');
    } else {
      errorDetails.push('Google Maps: No API key configured');
    }
    
    if (geoApiError) {
      errorDetails.push(`GeoAPI: ${geoApiError.message}`);
    } else {
      errorDetails.push('GeoAPI: No alternative APIs configured');
    }
    
    errorDetails.push('Fallback: No matching coordinates found');
    
    const errorMessage = `GEOCODING_FAILED: All geocoding methods failed for address: "${address}" - ${errorDetails.join(', ')}`;
    
    throw new Error(errorMessage);

  } catch (error) {
    logger.error(`Geocoding error for "${address}":`, error);
    
    // Re-throw with proper error categorization
    if (error.message.startsWith('INVALID_INPUT') || 
        error.message.startsWith('EMPTY_ADDRESS') || 
        error.message.startsWith('ADDRESS_TOO_LONG')) {
      throw error; // Validation errors
    }
    
    if (error.message.includes('TIMEOUT')) {
      throw new Error(`TIMEOUT_ERROR: Google Maps API timed out for address: "${address}"`);
    }
    
    if (error.message.startsWith('GEOCODING_FAILED')) {
      throw error; // Already categorized
    }
    
    // Unknown/unexpected error
    throw new Error(`UNKNOWN_ERROR: Unexpected error during geocoding: ${error.message}`);
  }
};

/**
 * Validate coordinates
 * @param {number} latitude - Latitude to validate
 * @param {number} longitude - Longitude to validate
 * @returns {boolean} - True if coordinates are valid
 */
const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  
  return !isNaN(lat) && !isNaN(lon) && 
         lat >= -90 && lat <= 90 && 
         lon >= -180 && lon <= 180;
};

/**
 * Calculate distance between two points in kilometers
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  try {
    const distance = geolib.getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    ) / 1000; // Convert meters to kilometers
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    logger.error('Distance calculation error:', error);
    throw new Error(`DISTANCE_CALCULATION_FAILED: ${error.message}`);
  }
};

/**
 * Find locations within a specified radius
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {Array} locations - Array of location objects with lat/lon
 * @param {number} radiusKm - Radius in kilometers (default: 8)
 * @returns {Array} - Array of locations within radius with distance
 */
const findLocationsWithinRadius = (centerLat, centerLon, locations, radiusKm = 8) => {
  try {
    if (!validateCoordinates(centerLat, centerLon)) {
      throw new Error('INVALID_CENTER_COORDINATES');
    }
    
    if (!Array.isArray(locations)) {
      throw new Error('INVALID_LOCATIONS_ARRAY');
    }
    
    const locationsWithDistance = locations
      .map(location => {
        try {
          const distance = calculateDistance(
            centerLat, 
            centerLon, 
            parseFloat(location.latitude), 
            parseFloat(location.longitude)
          );
          
          return {
            ...location,
            distance: distance
          };
        } catch (distError) {
          logger.warn(`Skipping location due to distance calculation error:`, location);
          return null;
        }
      })
      .filter(location => location !== null && location.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance); // Sort by distance (nearest first)
    
    return locationsWithDistance;
  } catch (error) {
    logger.error('Find locations within radius error:', error);
    throw new Error(`RADIUS_SEARCH_FAILED: ${error.message}`);
  }
};

/**
 * Get bounds for a given center point and radius
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} - Object containing min/max lat/lon bounds
 */
const getBounds = (centerLat, centerLon, radiusKm) => {
  try {
    if (!validateCoordinates(centerLat, centerLon)) {
      throw new Error('INVALID_BOUNDS_COORDINATES');
    }
    
    // Rough conversion: 1 degree latitude ≈ 111 km
    // 1 degree longitude ≈ 111 km * cos(latitude)
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
    
    return {
      minLat: centerLat - latDelta,
      maxLat: centerLat + latDelta,
      minLon: centerLon - lonDelta,
      maxLon: centerLon + lonDelta
    };
  } catch (error) {
    logger.error('Get bounds error:', error);
    throw new Error(`BOUNDS_CALCULATION_FAILED: ${error.message}`);
  }
};

/**
 * Convert coordinates to address (reverse geocoding) with Google Maps and fallback
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} - Object containing address information
 */
const reverseGeocode = async (latitude, longitude) => {
  try {
    if (!validateCoordinates(latitude, longitude)) {
      throw new Error('INVALID_REVERSE_COORDINATES');
    }
    
    // === TRY GOOGLE MAPS FIRST ===
    if (googleGeocoder) {
      try {
        logger.info('🌍 Attempting Google Maps reverse geocoding (timeout: 30s)');
        
        // Create timeout promise with 30 seconds timeout to prioritize Google API
        const googlePromise = googleGeocoder.reverse({ lat: latitude, lon: longitude });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GOOGLE_REVERSE_TIMEOUT')), 30000)
        );
        
        const results = await Promise.race([googlePromise, timeoutPromise]);
        
        if (results && results.length > 0) {
          const result = results[0];
          logger.info('✅ Google Maps reverse geocoding successful');
          
          return {
            formattedAddress: result.formattedAddress || '',
            city: result.city || '',
            district: result.administrativeLevels?.level2long || '',
            ward: result.administrativeLevels?.level3long || '',
            country: result.country || '',
            countryCode: result.countryCode || '',
            source: 'google_maps'
          };
        } else {
          logger.warn('❌ Google Maps reverse geocoding returned no results');
        }
      } catch (error) {
        logger.warn(`❌ Google Maps reverse geocoding failed: ${error.message}`);
      }
    } else {
      logger.warn('🔑 Google Maps API key not configured for reverse geocoding');
    }
    
    // === TRY GEOAPI SECOND ===
    // Try alternative geocoder first if available
    if (alternativeGeocoder) {
      try {
        logger.info('🗺️ Attempting alternative geoAPI reverse geocoding (timeout: 15s)');
        
        const altPromise = alternativeGeocoder.reverse({ lat: latitude, lon: longitude });
        const altTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('ALT_GEOAPI_REVERSE_TIMEOUT')), 15000)
        );
        
        const altResults = await Promise.race([altPromise, altTimeoutPromise]);
        
        if (altResults && altResults.length > 0) {
          const result = altResults[0];
          logger.info('✅ Alternative geoAPI reverse geocoding successful');
          
          return {
            formattedAddress: result.formattedAddress || '',
            city: result.city || '',
            district: result.administrativeLevels?.level2long || '',
            ward: result.administrativeLevels?.level3long || '',
            country: result.country || '',
            countryCode: result.countryCode || '',
            source: 'alternative_geoapi'
          };
        }
      } catch (error) {
        logger.warn(`❌ Alternative geoAPI reverse geocoding failed: ${error.message}`);
      }
    }
    
    // Try OpenStreetMap as secondary geoAPI
    try {
      logger.info('🌐 Attempting OpenStreetMap geoAPI reverse geocoding (timeout: 15s)');
      
      const osmPromise = geoApiGeocoder.reverse({ lat: latitude, lon: longitude });
      const osmTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OSM_GEOAPI_REVERSE_TIMEOUT')), 15000)
      );
      
      const osmResults = await Promise.race([osmPromise, osmTimeoutPromise]);
      
      if (osmResults && osmResults.length > 0) {
        const result = osmResults[0];
        logger.info('✅ OpenStreetMap geoAPI reverse geocoding successful');
        
        return {
          formattedAddress: result.formattedAddress || '',
          city: result.city || '',
          district: result.administrativeLevels?.level2long || '',
          ward: result.administrativeLevels?.level3long || '',
          country: result.country || '',
          countryCode: result.countryCode || '',
          source: 'openstreetmap_geoapi'
        };
      }
    } catch (error) {
      logger.warn(`❌ OpenStreetMap geoAPI reverse geocoding failed: ${error.message}`);
    }
    
    // === FALLBACK: RETURN BASIC COORDINATES INFO ===
    logger.info('🔄 Using fallback for reverse geocoding');
    return {
      formattedAddress: `${latitude}, ${longitude}`,
      city: '',
      district: '',
      ward: '',
      country: 'Vietnam',
      countryCode: 'VN',
      source: 'coordinates_fallback'
    };
    
  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    throw new Error(`REVERSE_GEOCODING_FAILED: ${error.message}`);
  }
};

module.exports = {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  findLocationsWithinRadius,
  validateCoordinates,
  getBounds
};
