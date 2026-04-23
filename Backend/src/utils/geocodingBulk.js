const { Location } = require('../src/models');
const geocodingService = require('../src/services/geocoding.service');
const logger = require('../src/utils/logger');

/**
 * Bulk geocode existing locations that don't have coordinates
 */
const bulkGeocodeExistingLocations = async () => {
  try {
    console.log('🔍 Finding locations without coordinates...');
    
    // Find locations without coordinates
    const locationsToGeocode = await Location.findAll({
      where: {
        latitude: null,
        longitude: null,
        address_text: { [require('sequelize').Op.not]: null }
      }
    });

    console.log(`📊 Found ${locationsToGeocode.length} locations to geocode`);

    if (locationsToGeocode.length === 0) {
      console.log('✅ All locations already have coordinates!');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < locationsToGeocode.length; i++) {
      const location = locationsToGeocode[i];
      
      console.log(`\n🔄 Processing ${i + 1}/${locationsToGeocode.length}: ${location.address_text}`);
      
      // Build full address
      const addressParts = [
        location.address_text,
        location.ward,
        location.district,
        location.city
      ].filter(Boolean);
      
      const fullAddress = addressParts.join(', ');
      
      try {
        console.log(`   🌍 Geocoding: ${fullAddress}`);
        const geocodeResult = await geocodingService.geocodeAddress(fullAddress);
        
        // Update the location
        await location.update({
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          formatted_address: geocodeResult.formattedAddress,
          country: geocodeResult.country,
          country_code: geocodeResult.countryCode
        });
        
        console.log(`   ✅ Success: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
        successCount++;
        
        // Rate limiting - wait 1 second between requests
        if (i < locationsToGeocode.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        failCount++;
        
        // Continue with next location instead of stopping
        continue;
      }
    }

    console.log('\n🎉 Bulk geocoding completed!');
    console.log(`✅ Successfully geocoded: ${successCount} locations`);
    console.log(`❌ Failed to geocode: ${failCount} locations`);
    
    return {
      total: locationsToGeocode.length,
      success: successCount,
      failed: failCount
    };

  } catch (error) {
    console.error('❌ Error in bulk geocoding:', error);
    throw error;
  }
};

/**
 * Reverse geocode coordinates to get address details
 */
const bulkReverseGeocodeCoordinates = async () => {
  try {
    console.log('🔍 Finding locations with coordinates but missing address details...');
    
    // Find locations with coordinates but missing formatted address
    const locationsToReverseGeocode = await Location.findAll({
      where: {
        latitude: { [require('sequelize').Op.not]: null },
        longitude: { [require('sequelize').Op.not]: null },
        formatted_address: null
      }
    });

    console.log(`📊 Found ${locationsToReverseGeocode.length} locations to reverse geocode`);

    if (locationsToReverseGeocode.length === 0) {
      console.log('✅ All locations with coordinates already have formatted addresses!');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < locationsToReverseGeocode.length; i++) {
      const location = locationsToReverseGeocode[i];
      
      console.log(`\n🔄 Processing ${i + 1}/${locationsToReverseGeocode.length}: ${location.latitude}, ${location.longitude}`);
      
      try {
        const reverseResult = await geocodingService.reverseGeocode(
          parseFloat(location.latitude), 
          parseFloat(location.longitude)
        );
        
        // Update the location with formatted address details
        await location.update({
          formatted_address: reverseResult.formattedAddress,
          country: reverseResult.country,
          country_code: reverseResult.countryCode
        });
        
        console.log(`   ✅ Success: ${reverseResult.formattedAddress}`);
        successCount++;
        
        // Rate limiting
        if (i < locationsToReverseGeocode.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        failCount++;
        continue;
      }
    }

    console.log('\n🎉 Bulk reverse geocoding completed!');
    console.log(`✅ Successfully reverse geocoded: ${successCount} locations`);
    console.log(`❌ Failed to reverse geocode: ${failCount} locations`);
    
    return {
      total: locationsToReverseGeocode.length,
      success: successCount,
      failed: failCount
    };

  } catch (error) {
    console.error('❌ Error in bulk reverse geocoding:', error);
    throw error;
  }
};

/**
 * Get statistics about geocoded locations
 */
const getGeocodingStats = async () => {
  try {
    const totalLocations = await Location.count();
    const locationsWithCoords = await Location.count({
      where: {
        latitude: { [require('sequelize').Op.not]: null },
        longitude: { [require('sequelize').Op.not]: null }
      }
    });
    const locationsWithoutCoords = totalLocations - locationsWithCoords;
    const geocodingPercentage = totalLocations > 0 ? ((locationsWithCoords / totalLocations) * 100).toFixed(1) : 0;

    console.log('\n📊 Geocoding Statistics:');
    console.log(`   📍 Total locations: ${totalLocations}`);
    console.log(`   🌍 With coordinates: ${locationsWithCoords} (${geocodingPercentage}%)`);
    console.log(`   ❓ Without coordinates: ${locationsWithoutCoords}`);

    return {
      total: totalLocations,
      withCoordinates: locationsWithCoords,
      withoutCoordinates: locationsWithoutCoords,
      percentage: parseFloat(geocodingPercentage)
    };
  } catch (error) {
    console.error('❌ Error getting geocoding stats:', error);
    throw error;
  }
};

module.exports = {
  bulkGeocodeExistingLocations,
  bulkReverseGeocodeCoordinates,
  getGeocodingStats
};

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  const runCommand = async () => {
    switch (command) {
      case 'geocode':
        await bulkGeocodeExistingLocations();
        break;
      case 'reverse':
        await bulkReverseGeocodeCoordinates();
        break;
      case 'stats':
        await getGeocodingStats();
        break;
      case 'all':
        await getGeocodingStats();
        await bulkGeocodeExistingLocations();
        await bulkReverseGeocodeCoordinates();
        await getGeocodingStats();
        break;
      default:
        console.log('Usage:');
        console.log('  node utils/geocodingBulk.js geocode   - Geocode locations without coordinates');
        console.log('  node utils/geocodingBulk.js reverse   - Reverse geocode coordinates to addresses');
        console.log('  node utils/geocodingBulk.js stats     - Show geocoding statistics');
        console.log('  node utils/geocodingBulk.js all       - Run all operations');
        break;
    }
  };

  runCommand()
    .then(() => {
      console.log('✅ Command completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Command failed:', error);
      process.exit(1);
    });
}
