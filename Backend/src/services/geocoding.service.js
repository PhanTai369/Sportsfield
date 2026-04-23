const NodeGeocoder = require('node-geocoder');
const geolib = require('geolib');
const logger = require('../utils/logger');

// Configure geocoder with proper User-Agent to comply with OSM policy
const geocoderOptions = {
  provider: 'openstreetmap',
  httpAdapter: 'https',
  formatter: null,
  headers: {
    'User-Agent': 'Football-Field-Booking-App/1.0 (contact@sportfields.com)'
  }
};

// Backup geocoder with Google Maps (requires API key)
const googleGeocoderOptions = {
  provider: 'google',
  apiKey: process.env.GOOGLE_MAPS_API_KEY, // Optional: add to .env file
  formatter: null
};

const osmGeocoder = NodeGeocoder(geocoderOptions);
const googleGeocoder = process.env.GOOGLE_MAPS_API_KEY ? NodeGeocoder(googleGeocoderOptions) : null;

/**
 * Convert address text to coordinates (latitude, longitude)
 * @param {string} address - Address text to geocode
 * @returns {Promise<Object>} - Object containing latitude, longitude, and formatted address
 */
/**
 * Convert address text to coordinates (latitude, longitude) with maximum accuracy
 * Priority order: Full address with street number > Street name > Ward > District > City
 * 
 * @param {string} address - Address text to geocode
 * @returns {Promise<Object>} - Object containing latitude, longitude, and formatted address
 */
const geocodeAddress = async (address) => {
  try {
    logger.info(`🔍 Geocoding address: "${address}"`);
    
    // Tiền xử lý địa chỉ trước khi geocode
    let processedAddress = cleanAddressString(address);
    
    logger.info(`✓ Processed address for geocoding: "${processedAddress}"`);
    
    // Extract location components (city, district, ward)
    const locationComponents = extractLocationComponents(processedAddress);
    
    // For demo purposes, provide fallback coordinates for common Vietnam locations
    const fallbackCoordinates = {
      // Hồ Chí Minh
      'quận 1, hồ chí minh': { latitude: 10.7769, longitude: 106.7009, city: 'Hồ Chí Minh', district: 'Quận 1' },
      'quận 8, hồ chí minh': { latitude: 10.7378, longitude: 106.6765, city: 'Hồ Chí Minh', district: 'Quận 8' },
      'thủ đức, hồ chí minh': { latitude: 10.8700, longitude: 106.8000, city: 'Hồ Chí Minh', district: 'Thủ Đức' },
      'gò vấp, hồ chí minh': { latitude: 10.8370, longitude: 106.6420, city: 'Hồ Chí Minh', district: 'Gò Vấp' },
      
      // Đà Nẵng
      'đà nẵng': { latitude: 16.0544, longitude: 108.2022, city: 'Đà Nẵng' },
      
      // Quận Hải Châu, Đà Nẵng
      'hải châu, đà nẵng': { latitude: 16.0472, longitude: 108.2220, city: 'Đà Nẵng', district: 'Hải Châu' },
      'thuận phước, hải châu, đà nẵng': { latitude: 16.0806, longitude: 108.2163, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Thuận Phước' },
      'thạch thang, hải châu, đà nẵng': { latitude: 16.0738, longitude: 108.2235, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Thạch Thang' },
      'hải châu 1, hải châu, đà nẵng': { latitude: 16.0666, longitude: 108.2251, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Hải Châu 1' },
      'hải châu 2, hải châu, đà nẵng': { latitude: 16.0610, longitude: 108.2213, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Hải Châu 2' },
      'phước ninh, hải châu, đà nẵng': { latitude: 16.0598, longitude: 108.2149, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Phước Ninh' },
      'bình thuận, hải châu, đà nẵng': { latitude: 16.0524, longitude: 108.2163, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Bình Thuận' },
      'hòa thuận đông, hải châu, đà nẵng': { latitude: 16.0414, longitude: 108.2148, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Hòa Thuận Đông' },
      'hòa thuận tây, hải châu, đà nẵng': { latitude: 16.0363, longitude: 108.2104, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Hòa Thuận Tây' },
      'nam dương, hải châu, đà nẵng': { latitude: 16.0505, longitude: 108.2076, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Nam Dương' },
      'bình hiên, hải châu, đà nẵng': { latitude: 16.0451, longitude: 108.2206, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Bình Hiên' },
      'thuận thành, hải châu, đà nẵng': { latitude: 16.0780, longitude: 108.2192, city: 'Đà Nẵng', district: 'Hải Châu', ward: 'Thuận Thành' },

      // Quận Thanh Khê, Đà Nẵng
      'thanh khê, đà nẵng': { latitude: 16.0639, longitude: 108.1941, city: 'Đà Nẵng', district: 'Thanh Khê' },
      'tam thuận, thanh khê, đà nẵng': { latitude: 16.0667, longitude: 108.1878, city: 'Đà Nẵng', district: 'Thanh Khê', ward: 'Tam Thuận' },
      'thanh khê đông, thanh khê, đà nẵng': { latitude: 16.0611, longitude: 108.1909, city: 'Đà Nẵng', district: 'Thanh Khê', ward: 'Thanh Khê Đông' },
      'thanh khê tây, thanh khê, đà nẵng': { latitude: 16.0582, longitude: 108.1841, city: 'Đà Nẵng', district: 'Thanh Khê', ward: 'Thanh Khê Tây' },
      'xuân hà, thanh khê, đà nẵng': { latitude: 16.0700, longitude: 108.1802, city: 'Đà Nẵng', district: 'Thanh Khê', ward: 'Xuân Hà' },
      'tân chính, thanh khê, đà nẵng': { latitude: 16.0646, longitude: 108.1775, city: 'Đà Nẵng', district: 'Thanh Khê', ward: 'Tân Chính' },
      'chính gián, thanh khê, đà nẵng': { latitude: 16.0579, longitude: 108.1764, city: 'Đà Nẵng', district: 'Thanh Khê', ward: 'Chính Gián' },
      'vĩnh trung, thanh khê, đà nẵng': { latitude: 16.0625, longitude: 108.1855, city: 'Đà Nẵng', district: 'Thanh Khê', ward: 'Vĩnh Trung' },
      'thạc gián, thanh khê, đà nẵng': { latitude: 16.0552, longitude: 108.1907, city: 'Đà Nẵng', district: 'Thanh Khê', ward: 'Thạc Gián' },
      'an khê, thanh khê, đà nẵng': { latitude: 16.0528, longitude: 108.1841, city: 'Đà Nẵng', district: 'Thanh Khê', ward: 'An Khê' },
      'hòa khê, thanh khê, đà nẵng': { latitude: 16.0496, longitude: 108.1787, city: 'Đà Nẵng', district: 'Thanh Khê', ward: 'Hòa Khê' },
      
      // Quận Sơn Trà, Đà Nẵng
      'sơn trà, đà nẵng': { latitude: 16.1067, longitude: 108.2348, city: 'Đà Nẵng', district: 'Sơn Trà' },
      'mân thái, sơn trà, đà nẵng': { latitude: 16.1054, longitude: 108.2321, city: 'Đà Nẵng', district: 'Sơn Trà', ward: 'Mân Thái' },
      'thọ quang, sơn trà, đà nẵng': { latitude: 16.1183, longitude: 108.2379, city: 'Đà Nẵng', district: 'Sơn Trà', ward: 'Thọ Quang' },
      'nại hiên đông, sơn trà, đà nẵng': { latitude: 16.0979, longitude: 108.2403, city: 'Đà Nẵng', district: 'Sơn Trà', ward: 'Nại Hiên Đông' },
      'phước mỹ, sơn trà, đà nẵng': { latitude: 16.0859, longitude: 108.2427, city: 'Đà Nẵng', district: 'Sơn Trà', ward: 'Phước Mỹ' },
      'an hải bắc, sơn trà, đà nẵng': { latitude: 16.0872, longitude: 108.2356, city: 'Đà Nẵng', district: 'Sơn Trà', ward: 'An Hải Bắc' },
      'an hải tây, sơn trà, đà nẵng': { latitude: 16.0819, longitude: 108.2354, city: 'Đà Nẵng', district: 'Sơn Trà', ward: 'An Hải Tây' },
      'an hải đông, sơn trà, đà nẵng': { latitude: 16.0787, longitude: 108.2411, city: 'Đà Nẵng', district: 'Sơn Trà', ward: 'An Hải Đông' },
      
      // Quận Ngũ Hành Sơn, Đà Nẵng
      'ngũ hành sơn, đà nẵng': { latitude: 16.0310, longitude: 108.2459, city: 'Đà Nẵng', district: 'Ngũ Hành Sơn' },
      'mỹ an, ngũ hành sơn, đà nẵng': { latitude: 16.0472, longitude: 108.2486, city: 'Đà Nẵng', district: 'Ngũ Hành Sơn', ward: 'Mỹ An' },
      'khuê mỹ, ngũ hành sơn, đà nẵng': { latitude: 16.0377, longitude: 108.2544, city: 'Đà Nẵng', district: 'Ngũ Hành Sơn', ward: 'Khuê Mỹ' },
      'hòa hải, ngũ hành sơn, đà nẵng': { latitude: 16.0101, longitude: 108.2526, city: 'Đà Nẵng', district: 'Ngũ Hành Sơn', ward: 'Hòa Hải' },
      'hòa quý, ngũ hành sơn, đà nẵng': { latitude: 16.0183, longitude: 108.2358, city: 'Đà Nẵng', district: 'Ngũ Hành Sơn', ward: 'Hòa Quý' },
      
      // Quận Liên Chiểu, Đà Nẵng
      'liên chiểu, đà nẵng': { latitude: 16.0784, longitude: 108.1571, city: 'Đà Nẵng', district: 'Liên Chiểu' },
      'hòa minh, liên chiểu, đà nẵng': { latitude: 16.0767, longitude: 108.1677, city: 'Đà Nẵng', district: 'Liên Chiểu', ward: 'Hòa Minh' },
      'hòa khánh bắc, liên chiểu, đà nẵng': { latitude: 16.0851, longitude: 108.1577, city: 'Đà Nẵng', district: 'Liên Chiểu', ward: 'Hòa Khánh Bắc' },
      'hòa khánh nam, liên chiểu, đà nẵng': { latitude: 16.0770, longitude: 108.1527, city: 'Đà Nẵng', district: 'Liên Chiểu', ward: 'Hòa Khánh Nam' },
      'hòa hiệp bắc, liên chiểu, đà nẵng': { latitude: 16.1009, longitude: 108.1426, city: 'Đà Nẵng', district: 'Liên Chiểu', ward: 'Hòa Hiệp Bắc' },
      'hòa hiệp nam, liên chiểu, đà nẵng': { latitude: 16.0925, longitude: 108.1510, city: 'Đà Nẵng', district: 'Liên Chiểu', ward: 'Hòa Hiệp Nam' },
      
      // Quận Cẩm Lệ, Đà Nẵng
      'cẩm lệ, đà nẵng': { latitude: 16.0174, longitude: 108.2009, city: 'Đà Nẵng', district: 'Cẩm Lệ' },
      'khuê trung, cẩm lệ, đà nẵng': { latitude: 16.0288, longitude: 108.1984, city: 'Đà Nẵng', district: 'Cẩm Lệ', ward: 'Khuê Trung' },
      'hòa thọ đông, cẩm lệ, đà nẵng': { latitude: 16.0147, longitude: 108.1932, city: 'Đà Nẵng', district: 'Cẩm Lệ', ward: 'Hòa Thọ Đông' },
      'hòa thọ tây, cẩm lệ, đà nẵng': { latitude: 16.0189, longitude: 108.1856, city: 'Đà Nẵng', district: 'Cẩm Lệ', ward: 'Hòa Thọ Tây' },
      'hòa an, cẩm lệ, đà nẵng': { latitude: 16.0362, longitude: 108.2058, city: 'Đà Nẵng', district: 'Cẩm Lệ', ward: 'Hòa An' },
      'hòa phát, cẩm lệ, đà nẵng': { latitude: 16.0346, longitude: 108.1947, city: 'Đà Nẵng', district: 'Cẩm Lệ', ward: 'Hòa Phát' },
      'hòa xuân, cẩm lệ, đà nẵng': { latitude: 16.0085, longitude: 108.2133, city: 'Đà Nẵng', district: 'Cẩm Lệ', ward: 'Hòa Xuân' },
      
      // Huyện Hòa Vang, Đà Nẵng
      'hòa vang, đà nẵng': { latitude: 16.0833, longitude: 108.1167, city: 'Đà Nẵng', district: 'Hòa Vang' },
      'hòa bắc, hòa vang, đà nẵng': { latitude: 16.1697, longitude: 108.0598, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Bắc' },
      'hòa liên, hòa vang, đà nẵng': { latitude: 16.1263, longitude: 108.1251, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Liên' },
      'hòa ninh, hòa vang, đà nẵng': { latitude: 16.1034, longitude: 108.0866, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Ninh' },
      'hòa sơn, hòa vang, đà nẵng': { latitude: 16.0803, longitude: 108.0794, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Sơn' },
      'hòa nhơn, hòa vang, đà nẵng': { latitude: 16.0243, longitude: 108.1166, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Nhơn' },
      'hòa phú, hòa vang, đà nẵng': { latitude: 16.0478, longitude: 108.0888, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Phú' },
      'hòa phong, hòa vang, đà nẵng': { latitude: 16.0747, longitude: 108.1082, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Phong' },
      'hòa châu, hòa vang, đà nẵng': { latitude: 16.0362, longitude: 108.1326, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Châu' },
      'hòa tiến, hòa vang, đà nẵng': { latitude: 16.0138, longitude: 108.1326, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Tiến' },
      'hòa khương, hòa vang, đà nẵng': { latitude: 15.9975, longitude: 108.1083, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Khương' },
      'hòa phước, hòa vang, đà nẵng': { latitude: 16.0044, longitude: 108.1635, city: 'Đà Nẵng', district: 'Hòa Vang', ward: 'Hòa Phước' }
    };
    
    let fallbackUsed = false;
    
    // Chuẩn hóa địa chỉ đầu vào để tìm khớp với fallback
    const normalizedAddress = address.toLowerCase().trim();
    
    // Step 1: Check exact match in fallback coordinates
    logger.info(`🔍 Looking for exact match in fallback data...`);
    for (const key in fallbackCoordinates) {
      const coords = fallbackCoordinates[key];
      if (normalizedAddress === key) {
        fallbackUsed = true;
        logger.info(`✅ Using exact fallback coordinates match for: "${address}"`);
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          formattedAddress: address,
          city: coords.city || '',
          district: coords.district || '',
          ward: coords.ward || '',
          country: 'Việt Nam',
          countryCode: 'VN',
          fallbackUsed: true
        };
      }
    }
    
    // Step 2: Cố gắng khớp dựa trên các thành phần địa chỉ đã trích xuất
    if (locationComponents.city === 'đà nẵng' && (locationComponents.district || locationComponents.ward)) {
      logger.info(`🔍 Attempting fallback using extracted components...`);
      
      let matchKey = null;
      let matchKeyLength = 0;
      
      // Build potential match keys based on components (most specific to least)
      const potentialKeys = [];
      
      if (locationComponents.ward && locationComponents.district) {
        potentialKeys.push(`${locationComponents.ward}, ${locationComponents.district}, ${locationComponents.city}`);
      }
      
      if (locationComponents.district) {
        potentialKeys.push(`${locationComponents.district}, ${locationComponents.city}`);
      }
      
      // Check each potential key against fallback data
      for (const potentialKey of potentialKeys) {
        logger.info(`🔍 Checking potential key: "${potentialKey}"`);
        if (fallbackCoordinates[potentialKey]) {
          matchKey = potentialKey;
          matchKeyLength = potentialKey.length;
          logger.info(`✅ Found direct match for component key: "${matchKey}"`);
          break;
        }
      }
      
      if (matchKey) {
        fallbackUsed = true;
        const coords = fallbackCoordinates[matchKey];
        logger.info(`✅ Using fallback coordinates based on address components for: "${address}" (matched: "${matchKey}")`);
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          formattedAddress: address,
          city: coords.city || '',
          district: coords.district || '',
          ward: coords.ward || '',
          country: 'Việt Nam',
          countryCode: 'VN',
          fallbackUsed: true
        };
      }
    }
    
    // Step 3: Try partial match if component match failed
    // Sort keys by length in descending order to match the most specific first
    const sortedKeys = Object.keys(fallbackCoordinates).sort((a, b) => b.length - a.length);
    
    logger.info(`🔍 Attempting partial match against ${sortedKeys.length} fallback keys...`);
    
    for (const key of sortedKeys) {
      if (normalizedAddress.includes(key)) {
        fallbackUsed = true;
        logger.info(`✅ Using partial fallback coordinates for: "${address}" (matched: "${key}")`);
        const coords = fallbackCoordinates[key];
        return {
          latitude: coords.latitude,
          longitude: coords.longitude,
          formattedAddress: address,
          city: coords.city || '',
          district: coords.district || '',
          ward: coords.ward || '',
          country: 'Việt Nam',
          countryCode: 'VN',
          fallbackUsed: true
        };
      }
    }// If not in fallback, log and try external APIs
    if (!fallbackUsed) {
      logger.info(`🌐 Address "${address}" not in fallback, trying external geocoding...`);
    }
    
    // Try OpenStreetMap with rate limiting
    logger.info(`🗺️ Attempting OSM geocoding for: "${address}"`);
    
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let results = await osmGeocoder.geocode(address);
    
    if (results && results.length > 0) {
      logger.info(`✅ OSM geocoding successful for: "${address}"`);
    } else {
      logger.warn(`❌ OSM geocoding failed for: "${address}"`);
    }
    
    // If no results and Google API key is available, try Google
    if ((!results || results.length === 0) && googleGeocoder) {
      logger.info(`🌍 OSM failed, trying Google Maps for: "${address}"`);
      results = await googleGeocoder.geocode(address);
      
      if (results && results.length > 0) {
        logger.info(`✅ Google Maps geocoding successful for: "${address}"`);
      } else {
        logger.warn(`❌ Google Maps geocoding also failed for: "${address}"`);
      }
    }
    
    // If we have results, process and return them
    if (results && results.length > 0) {
      const result = results[0];
      
      // Ensure we have valid coordinates
      const latitude = parseFloat(result.latitude);
      const longitude = parseFloat(result.longitude);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        logger.warn(`⚠️ Invalid coordinates from geocoding result for: "${address}"`);
        throw new Error('Invalid coordinates in geocoding result');
      }
      
      logger.info(`📍 Successfully geocoded "${address}" to coordinates: ${latitude}, ${longitude}`);
      
      return {
        latitude: latitude,
        longitude: longitude,
        formattedAddress: result.formattedAddress || address,
        city: result.city || '',
        district: result.administrativeLevels?.level2long || '',
        ward: result.administrativeLevels?.level3long || '',
        country: result.country || '',
        countryCode: result.countryCode || ''
      };
    }  } catch (error) {
    logger.error(`❌ Geocoding error: ${error.message}`, error);
      // Try to extract location components for more accurate fallback
    const addressParts = extractLocationComponents(address);
    logger.info(`📊 Extracted address components for fallback: ${JSON.stringify(addressParts)}`);
      // Check for Da Nang wards first (most specific)
    if (addressParts.city === 'đà nẵng' && addressParts.district && addressParts.ward) {
      const wardKey = `${addressParts.ward}, ${addressParts.district}, ${addressParts.city}`;
      const normalizedWardKey = wardKey.toLowerCase();
      
      logger.info(`🔍 Looking for ward-level fallback with key: "${normalizedWardKey}"`);
      logger.info(`📊 Available ward keys: ${Object.keys(fallbackCoordinates).filter(k => k.includes(addressParts.ward)).join(', ')}`);
      
      // Check if we have exact ward coordinates
      if (fallbackCoordinates[normalizedWardKey]) {
        logger.info(`🏘️ Using ward-level fallback for: ${wardKey}`);
        return {
          latitude: fallbackCoordinates[normalizedWardKey].latitude,
          longitude: fallbackCoordinates[normalizedWardKey].longitude,
          formattedAddress: address,
          city: 'Đà Nẵng',
          district: addressParts.district,
          ward: addressParts.ward,
          country: 'Việt Nam',
          countryCode: 'VN'
        };
      } else {
        // Try a more flexible approach - looking for partial matches in ward keys
        const possibleWardKeys = Object.keys(fallbackCoordinates).filter(key => 
          key.includes(addressParts.ward) && 
          key.includes(addressParts.district) && 
          key.includes(addressParts.city)
        );
        
        if (possibleWardKeys.length > 0) {
          const bestMatchKey = possibleWardKeys[0]; // Take the first match
          logger.info(`🏘️ Using flexible ward-level fallback for: ${wardKey} (matched: ${bestMatchKey})`);
          
          return {
            latitude: fallbackCoordinates[bestMatchKey].latitude,
            longitude: fallbackCoordinates[bestMatchKey].longitude,
            formattedAddress: address,
            city: 'Đà Nẵng',
            district: addressParts.district,
            ward: addressParts.ward,
            country: 'Việt Nam',
            countryCode: 'VN'
          };
        } else {
          logger.info(`⚠️ No ward-level fallback found for: ${wardKey}`);
        }
      }
    }
    
    // Check for Da Nang districts (medium specific)
    if (addressParts.city === 'đà nẵng' && addressParts.district) {
      const districtCoordinates = {
        'hải châu': { latitude: 16.0544, longitude: 108.2022 },
        'thanh khê': { latitude: 16.0657, longitude: 108.1890 },
        'sơn trà': { latitude: 16.1068, longitude: 108.2339 },
        'ngũ hành sơn': { latitude: 16.0040, longitude: 108.2628 },
        'liên chiểu': { latitude: 16.0737, longitude: 108.1406 },
        'cẩm lệ': { latitude: 16.0213, longitude: 108.1890 },
        'hòa vang': { latitude: 16.0771, longitude: 108.2730 }
      };
      
      if (districtCoordinates[addressParts.district]) {
        logger.info(`🏙️ Using Da Nang district fallback for: ${addressParts.district}`);
        return {
          latitude: districtCoordinates[addressParts.district].latitude,
          longitude: districtCoordinates[addressParts.district].longitude,
          formattedAddress: address,
          city: 'Đà Nẵng',
          district: addressParts.district,
          ward: addressParts.ward || '',
          country: 'Việt Nam',
          countryCode: 'VN'
        };
      }
    }
    
    // Second try: city level fallback
    if (addressParts.city === 'hồ chí minh') {
      logger.info('🏙️ Using HCM fallback coordinates');
      return {
        latitude: 10.7769,
        longitude: 106.7009,
        formattedAddress: address,
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        ward: '',
        country: 'Việt Nam',
        countryCode: 'VN'
      };
    }
    
    if (addressParts.city === 'hà nội') {
      logger.info('🏙️ Using Ha Noi fallback coordinates');
      return {
        latitude: 21.0285,
        longitude: 105.8542,
        formattedAddress: address,
        city: 'Hà Nội',
        district: 'Hoàn Kiếm',
        ward: '',
        country: 'Việt Nam',
        countryCode: 'VN'
      };
    }
    
    if (addressParts.city === 'đà nẵng') {
      logger.info('🏙️ Using Da Nang fallback coordinates');
      return {
        latitude: 16.0471,
        longitude: 108.2068,
        formattedAddress: address,
        city: 'Đà Nẵng',
        district: 'Hải Châu',
        ward: '',
        country: 'Việt Nam',
        countryCode: 'VN'
      };
    }
    
    // Last resort: Da Nang city center as ultimate fallback
    logger.info('🆘 Using ultimate fallback: Da Nang city center');
    return {
      latitude: 16.0471,
      longitude: 108.2068,
      formattedAddress: address,
      city: 'Đà Nẵng',
      district: 'Hải Châu',
      ward: '',
      country: 'Việt Nam',
      countryCode: 'VN'
    };
  }
};

/**
 * Convert coordinates to address (reverse geocoding) with maximum accuracy
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} - Object containing address information
 */
const reverseGeocode = async (latitude, longitude) => {
  try {
    logger.info(`🔍 Attempting reverse geocoding for coordinates: ${latitude}, ${longitude}`);
    
    // First, validate the coordinates
    if (!validateCoordinates(latitude, longitude)) {
      throw new Error('Invalid coordinates provided for reverse geocoding');
    }
      // Try OpenStreetMap first (usually more detailed for street-level info)
    let results = await osmGeocoder.reverse({ lat: latitude, lon: longitude });
    let provider = 'OSM';
    
    // Check if the OSM result has enough detail (street name)
    let hasStreetDetail = false;
    if (results && results.length > 0) {
      hasStreetDetail = results[0].streetName ? true : false;
      logger.info(`OSM reverse geocoding ${hasStreetDetail ? 'has' : 'lacks'} street-level detail`);
    }
    
    // If no street detail from OSM and Google API key is available, try Google
    if ((!hasStreetDetail) && googleGeocoder) {
      logger.info('Trying Google Maps for better street-level detail');
      const googleResults = await googleGeocoder.reverse({ lat: latitude, lon: longitude });
      
      // If Google gave us better results (with street name), use those instead
      if (googleResults && googleResults.length > 0 && googleResults[0].streetName) {
        results = googleResults;
        provider = 'Google';
        logger.info('Using Google results for better street detail');
      } else {
        logger.info('Google results no better than OSM, keeping OSM results');
      }
    }
    
    if (!results || results.length === 0) {
      throw new Error('No reverse geocoding results found for the given coordinates');
    }
    
    const result = results[0];
    logger.info(`✅ Successfully reverse geocoded coordinates using ${provider} to: ${result.formattedAddress}`);
    
    // Build a complete address with priority on detailed street information
    const streetInfo = [];
    if (result.streetNumber) streetInfo.push(result.streetNumber);
    if (result.streetName) streetInfo.push(result.streetName);
    
    // Build full address in order from most specific to least specific
    const addressParts = [
      streetInfo.join(' '), // Street number + name
      result.administrativeLevels?.level3long, // ward/commune
      result.administrativeLevels?.level2long, // district
      result.administrativeLevels?.level1long || result.city, // province/city
      result.country
    ].filter(Boolean); // Remove empty/undefined values
    
    const fullAddress = addressParts.join(', ');
    
    // For logging detail level
    let detailLevel = 'unknown';
    if (result.streetName) {
      detailLevel = result.streetNumber ? 'street-number' : 'street';
    } else if (result.administrativeLevels?.level3long) {
      detailLevel = 'ward';
    } else if (result.administrativeLevels?.level2long) {
      detailLevel = 'district';
    } else if (result.city) {
      detailLevel = 'city';
    }
    
    logger.info(`📍 Reverse geocoded to detail level: ${detailLevel}`);
    
    return {
      address: fullAddress,
      formattedAddress: result.formattedAddress || fullAddress,
      streetNumber: result.streetNumber || '',
      streetName: result.streetName || '',
      city: result.city || result.administrativeLevels?.level1long || '',
      district: result.administrativeLevels?.level2long || '',
      ward: result.administrativeLevels?.level3long || '',
      country: result.country || '',
      countryCode: result.countryCode || '',
      provider: provider,
      detailLevel: detailLevel
    };
  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    
    // For reverse geocoding, we at least know the coordinates,
    // so we can try to determine an approximate location
    try {
      // Check if coordinates are within Da Nang boundaries
      const daNangBounds = {
        minLat: 15.9500, maxLat: 16.1700,
        minLon: 108.0700, maxLon: 108.3500
      };
      
      if (latitude >= daNangBounds.minLat && latitude <= daNangBounds.maxLat &&
          longitude >= daNangBounds.minLon && longitude <= daNangBounds.maxLon) {
        
        // Determine approximate district in Da Nang
        const districts = [
          { name: 'Hải Châu', center: { lat: 16.0544, lon: 108.2022 } },
          { name: 'Thanh Khê', center: { lat: 16.0657, lon: 108.1890 } },
          { name: 'Sơn Trà', center: { lat: 16.1068, lon: 108.2339 } },
          { name: 'Ngũ Hành Sơn', center: { lat: 16.0040, lon: 108.2628 } },
          { name: 'Liên Chiểu', center: { lat: 16.0737, lon: 108.1406 } },
          { name: 'Cẩm Lệ', center: { lat: 16.0213, lon: 108.1890 } }
        ];
        
        // Find the closest district by calculating distance to each district center
        let closestDistrict = districts[0];
        let minDistance = calculateDistance(
          latitude, longitude, 
          districts[0].center.lat, districts[0].center.lon
        );
        
        for (let i = 1; i < districts.length; i++) {
          const distance = calculateDistance(
            latitude, longitude,
            districts[i].center.lat, districts[i].center.lon
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            closestDistrict = districts[i];
          }
        }
        
        logger.info(`🏙️ Using approximate district fallback: ${closestDistrict.name}`);
        
        return {
          address: `Khu vực ${closestDistrict.name}, Đà Nẵng`,
          formattedAddress: `Khu vực ${closestDistrict.name}, Đà Nẵng, Việt Nam`,
          city: 'Đà Nẵng',
          district: closestDistrict.name,
          ward: '',
          country: 'Việt Nam',
          countryCode: 'VN',
          provider: 'Fallback',
          detailLevel: 'district-approximation'
        };
      }
    } catch (fallbackError) {
      logger.error('Error in reverse geocoding fallback:', fallbackError);
    }
    
    // If all else fails, just return the coordinates as text
    return {
      address: `Vị trí (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
      formattedAddress: `Vị trí (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
      city: '',
      district: '',
      ward: '',
      country: '',
      countryCode: '',
      provider: 'Coordinates',
      detailLevel: 'coordinates-only'
    };
  }
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
    throw new Error(`Distance calculation failed: ${error.message}`);
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
    const locationsWithDistance = locations
      .map(location => {
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
      })
      .filter(location => location.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance); // Sort by distance (nearest first)
    
    return locationsWithDistance;
  } catch (error) {
    logger.error('Find locations within radius error:', error);
    throw new Error(`Finding locations within radius failed: ${error.message}`);
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
 * Get bounds for a given center point and radius
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} - Object containing min/max lat/lon bounds
 */
const getBounds = (centerLat, centerLon, radiusKm) => {
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
};

/**
 * Helper function to extract city, district, ward from address
 * @param {string} address - Full address text
 * @returns {Object} - Object with city, district, ward if found
 */
const extractLocationComponents = (address) => {
  logger.info(`🔍 Extracting location components from address: "${address}"`);
  
  // Sử dụng hàm cleanAddressString để tiền xử lý địa chỉ
  let normalizedAddress = cleanAddressString(address).toLowerCase();
  
  logger.info(`✓ Normalized address: "${normalizedAddress}"`);
  
  const result = {
    city: null,
    district: null,
    ward: null
  };
  
  // Check for cities with more aliases
  const cities = [
    { name: 'đà nẵng', aliases: ['da nang', 'danang', 'đn', 'tp đà nẵng', 'tp. đà nẵng', 'thành phố đà nẵng'] },
    { name: 'hồ chí minh', aliases: ['ho chi minh', 'hcm', 'tp hcm', 'tphcm', 'tp. hồ chí minh', 'thành phố hồ chí minh', 'sài gòn', 'saigon'] },
    { name: 'hà nội', aliases: ['ha noi', 'hanoi', 'hn', 'tp hà nội', 'tp. hà nội', 'thành phố hà nội'] }
  ];
  
  for (const city of cities) {
    // Kiểm tra tên chính
    if (normalizedAddress.includes(city.name)) {
      result.city = city.name;
      logger.info(`✓ Found city: ${city.name} (exact match)`);
      break;
    }
    
    // Kiểm tra các biến thể (alias)
    for (const alias of city.aliases) {
      if (normalizedAddress.includes(alias)) {
        result.city = city.name;
        logger.info(`✓ Found city: ${city.name} (via alias: ${alias})`);
        break;
      }
    }
    
    if (result.city) break;
  }
  
  // Xử lý địa chỉ trước khi kiểm tra quận/phường
  // Loại bỏ các tiền tố quận/phường để tránh trùng lặp
  const cleanedAddress = normalizedAddress
    .replace(/\bphường\s+/gi, '')
    .replace(/\bquận\s+/gi, '')
    .replace(/\bp\.\s*/gi, '')
    .replace(/\bq\.\s*/gi, '')
    .replace(/\bward\s+/gi, '')
    .replace(/\bdistrict\s+/gi, '');
  
  logger.info(`✓ Cleaned address for district/ward detection: "${cleanedAddress}"`);
  
  // Check for Da Nang districts with more aliases
  const daNangDistricts = [
    { name: 'hải châu', aliases: ['hai chau', 'haichau', 'hc'] },
    { name: 'thanh khê', aliases: ['thanh khe', 'thanhkhe', 'tk'] },
    { name: 'sơn trà', aliases: ['son tra', 'sontra', 'st'] },
    { name: 'ngũ hành sơn', aliases: ['ngu hanh son', 'nguhanhson', 'nhs', 'ngũ hành'] },
    { name: 'liên chiểu', aliases: ['lien chieu', 'lienchieu', 'lc'] },
    { name: 'cẩm lệ', aliases: ['cam le', 'camle', 'cl'] },
    { name: 'hòa vang', aliases: ['hoa vang', 'hoavang', 'hv'] }
  ];
  
  if (result.city === 'đà nẵng' || normalizedAddress.includes('đà nẵng') || 
      normalizedAddress.includes('da nang')) {
    
    result.city = 'đà nẵng'; // Ensure city is set
    
    for (const district of daNangDistricts) {
      // Kiểm tra tên chính
      if (cleanedAddress.includes(district.name)) {
        result.district = district.name;
        logger.info(`✓ Found district: ${district.name} (exact match)`);
        break;
      }
      
      // Kiểm tra các biến thể (alias)
      for (const alias of district.aliases) {
        if (cleanedAddress.includes(alias)) {
          result.district = district.name;
          logger.info(`✓ Found district: ${district.name} (via alias: ${alias})`);
          break;
        }
      }
      
      if (result.district) break;
    }
  }
  
  // Mapping các phường xã với nhiều biến thể hơn
  const daNangWards = {
    'hải châu': [
      { name: 'thuận thành', aliases: ['thuan thanh', 'thuanthanh'] },
      { name: 'thuận phước', aliases: ['thuan phuoc', 'thuanphuoc'] },
      { name: 'thạch thang', aliases: ['thach thang', 'thachthang'] },
      { name: 'hải châu 1', aliases: ['hai chau 1', 'haichau1', 'hải châu i', 'hai chau i'] },
      { name: 'hải châu 2', aliases: ['hai chau 2', 'haichau2', 'hải châu ii', 'hai chau ii'] },
      { name: 'phước ninh', aliases: ['phuoc ninh', 'phuocninh'] },
      { name: 'bình thuận', aliases: ['binh thuan', 'binhthuan'] },
      { name: 'hòa thuận đông', aliases: ['hoa thuan dong', 'hoathuandong'] },
      { name: 'hòa thuận tây', aliases: ['hoa thuan tay', 'hoathuantay'] },
      { name: 'nam dương', aliases: ['nam duong', 'namduong'] },
      { name: 'bình hiên', aliases: ['binh hien', 'binhhien'] }
    ],
    'ngũ hành sơn': [
      { name: 'mỹ an', aliases: ['my an', 'myan'] },
      { name: 'khuê mỹ', aliases: ['khue my', 'khuemy'] },
      { name: 'hòa hải', aliases: ['hoa hai', 'hoahai'] },
      { name: 'hòa quý', aliases: ['hoa quy', 'hoaquy'] }
    ],
    'sơn trà': [
      { name: 'mân thái', aliases: ['man thai', 'manthai'] },
      { name: 'thọ quang', aliases: ['tho quang', 'thoquang'] },
      { name: 'nại hiên đông', aliases: ['nai hien dong', 'naihiendong'] },
      { name: 'phước mỹ', aliases: ['phuoc my', 'phuocmy'] },
      { name: 'an hải bắc', aliases: ['an hai bac', 'anhaibac'] },
      { name: 'an hải tây', aliases: ['an hai tay', 'anhaitay'] },
      { name: 'an hải đông', aliases: ['an hai dong', 'anhaidong'] }
    ],
    'thanh khê': [
      { name: 'tam thuận', aliases: ['tam thuan', 'tamthuan'] },
      { name: 'thanh khê đông', aliases: ['thanh khe dong', 'thanhkhedong'] },
      { name: 'thanh khê tây', aliases: ['thanh khe tay', 'thanhkhetay'] },
      { name: 'xuân hà', aliases: ['xuan ha', 'xuanha'] },
      { name: 'tân chính', aliases: ['tan chinh', 'tanchinh'] },
      { name: 'chính gián', aliases: ['chinh gian', 'chinhgian'] },
      { name: 'vĩnh trung', aliases: ['vinh trung', 'vinhtrung'] },
      { name: 'thạc gián', aliases: ['thac gian', 'thacgian'] },
      { name: 'an khê', aliases: ['an khe', 'ankhe'] },
      { name: 'hòa khê', aliases: ['hoa khe', 'hoakhe'] }
    ],
    'liên chiểu': [
      { name: 'hòa minh', aliases: ['hoa minh', 'hoaminh'] },
      { name: 'hòa khánh bắc', aliases: ['hoa khanh bac', 'hoakhanhbac'] },
      { name: 'hòa khánh nam', aliases: ['hoa khanh nam', 'hoakhanhnam'] },
      { name: 'hòa hiệp bắc', aliases: ['hoa hiep bac', 'hoahiepbac'] },
      { name: 'hòa hiệp nam', aliases: ['hoa hiep nam', 'hoahiepnam'] }
    ],
    'cẩm lệ': [
      { name: 'khuê trung', aliases: ['khue trung', 'khuetrung'] },
      { name: 'hòa thọ đông', aliases: ['hoa tho dong', 'hoathodong'] },
      { name: 'hòa thọ tây', aliases: ['hoa tho tay', 'hoathotay'] },
      { name: 'hòa an', aliases: ['hoa an', 'hoaan'] },
      { name: 'hòa phát', aliases: ['hoa phat', 'hoaohat'] },
      { name: 'hòa xuân', aliases: ['hoa xuan', 'hoaxuan'] }
    ],
    'hòa vang': [
      { name: 'hòa bắc', aliases: ['hoa bac', 'hoabac'] },
      { name: 'hòa liên', aliases: ['hoa lien', 'hoalien'] },
      { name: 'hòa ninh', aliases: ['hoa ninh', 'hoaninh'] },
      { name: 'hòa sơn', aliases: ['hoa son', 'hoason'] },
      { name: 'hòa nhơn', aliases: ['hoa nhon', 'hoanhon'] },
      { name: 'hòa phú', aliases: ['hoa phu', 'hoaphu'] },
      { name: 'hòa phong', aliases: ['hoa phong', 'hoaphong'] },
      { name: 'hòa châu', aliases: ['hoa chau', 'hoachau'] },
      { name: 'hòa tiến', aliases: ['hoa tien', 'hoatien'] },
      { name: 'hòa khương', aliases: ['hoa khuong', 'hoakhuong'] },
      { name: 'hòa phước', aliases: ['hoa phuoc', 'hoaphuoc'] }
    ]
  };
  
  // Tìm phường nếu đã biết quận
  if (result.district && daNangWards[result.district]) {
    const wardsInDistrict = daNangWards[result.district];
    
    for (const wardInfo of wardsInDistrict) {
      // Kiểm tra tên chính
      if (cleanedAddress.includes(wardInfo.name)) {
        result.ward = wardInfo.name;
        logger.info(`✓ Found ward: ${wardInfo.name} in ${result.district} (exact match)`);
        break;
      }
      
      // Kiểm tra các biến thể (alias)
      for (const alias of wardInfo.aliases) {
        if (cleanedAddress.includes(alias)) {
          result.ward = wardInfo.name;
          logger.info(`✓ Found ward: ${wardInfo.name} in ${result.district} (via alias: ${alias})`);
          break;
        }
      }
      
      if (result.ward) break;
    }
  }
  
  // Nếu không tìm thấy phường với quận đã biết, tìm trong tất cả các phường
  if (!result.ward && result.city === 'đà nẵng') {
    // Tạo danh sách phẳng của tất cả các phường ở Đà Nẵng
    const allWards = [];
    for (const district in daNangWards) {
      for (const wardInfo of daNangWards[district]) {
        allWards.push({
          name: wardInfo.name,
          aliases: wardInfo.aliases,
          district: district
        });
      }
    }
    
    // Sắp xếp theo độ dài tên giảm dần để ưu tiên tên dài hơn (cụ thể hơn)
    allWards.sort((a, b) => b.name.length - a.name.length);
    
    for (const wardInfo of allWards) {
      // Kiểm tra tên chính
      if (cleanedAddress.includes(wardInfo.name)) {
        result.ward = wardInfo.name;
        result.district = wardInfo.district; // Cập nhật quận dựa trên phường tìm thấy
        logger.info(`✓ Found ward: ${wardInfo.name} from all wards (exact match), updated district to: ${wardInfo.district}`);
        break;
      }
      
      // Kiểm tra các biến thể (alias)
      for (const alias of wardInfo.aliases) {
        if (cleanedAddress.includes(alias)) {
          result.ward = wardInfo.name;
          result.district = wardInfo.district; // Cập nhật quận dựa trên phường tìm thấy
          logger.info(`✓ Found ward: ${wardInfo.name} from all wards (via alias: ${alias}), updated district to: ${wardInfo.district}`);
          break;
        }
      }
      
      if (result.ward) break;
    }
  }
  
  // Kết quả cuối cùng
  logger.info(`📍 Extracted components: City: ${result.city || 'unknown'}, District: ${result.district || 'unknown'}, Ward: ${result.ward || 'unknown'}`);
  return result;
};

/**
 * Normalizes and cleans an address string to improve geocoding accuracy
 * @param {string} address - Raw address string to clean
 * @returns {string} - Cleaned and normalized address
 */
const cleanAddressString = (address) => {
  if (!address) return '';
  
  logger.info(`🧹 Cleaning address: "${address}"`);
  
  // Các mẫu địa chỉ bắt đầu không chuẩn thường gặp
  const invalidPrefixes = [
    /^f\s*,/i,         // "f," ở đầu địa chỉ
    /^g\s*,/i,         // "g," ở đầu địa chỉ
    /^h\s*,/i,         // "h," ở đầu địa chỉ
    /^số\s*,/i,        // "số," ở đầu địa chỉ
    /^so\s*,/i,        // "so," ở đầu địa chỉ
    /^\d+\s*,/,        // số + dấu phẩy ở đầu
    /^[a-z]\d+\s*,/i,  // ký tự + số + dấu phẩy
  ];
  
  let cleanedAddress = address.trim();
  
  // Xóa các tiền tố không hợp lệ
  for (const prefix of invalidPrefixes) {
    if (prefix.test(cleanedAddress)) {
      const originalAddress = cleanedAddress;
      cleanedAddress = cleanedAddress.replace(prefix, '').trim();
      logger.info(`✓ Removed invalid prefix: "${originalAddress}" -> "${cleanedAddress}"`);
    }
  }
  
  // Chuẩn hóa dấu phẩy và khoảng trắng
  cleanedAddress = cleanedAddress
    // Loại bỏ dấu phẩy liền với chữ và thay bằng dấu phẩy + khoảng trắng
    .replace(/,([^\s])/g, ', $1')
    // Loại bỏ khoảng trắng thừa trước dấu phẩy
    .replace(/\s+,/g, ',')
    // Đảm bảo có một khoảng trắng sau dấu phẩy
    .replace(/,\s*/g, ', ')
    // Loại bỏ các ký tự đặc biệt không cần thiết
    .replace(/[`~!@#$%^&*()_|+=?;:'"><]/g, ' ')
    // Chuẩn hóa tiền tố phường/quận
    .replace(/\bp(hường)?\s*\.\s*/gi, 'phường ')
    .replace(/\bq(uận)?\s*\.\s*/gi, 'quận ')
    .replace(/\btp\s*\.\s*/gi, '')
    // Chuẩn hóa khoảng trắng liên tiếp
    .replace(/\s+/g, ' ')
    .trim();
  
  logger.info(`✓ Cleaned address result: "${cleanedAddress}"`);
  return cleanedAddress;
};

module.exports = {
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  findLocationsWithinRadius,
  validateCoordinates,
  getBounds,
  extractLocationComponents,
  cleanAddressString
};
