/**
 * Unit test for Geocoding Service
 * Kiểm tra khả năng xử lý địa chỉ không chuẩn và fallback
 */

const { cleanAddressString, extractLocationComponents } = require('../src/services/geocoding.service');

describe('Geocoding Service', () => {
  describe('cleanAddressString', () => {
    test('should remove invalid prefixes', () => {
      const addresses = [
        { input: 'f, Khuê Mỹ, Quận Ngũ Hành Sơn, Đà Nẵng', expected: 'khuê mỹ, quận ngũ hành sơn, đà nẵng' },
        { input: 'g,Hòa Minh, Liên Chiểu, Đà Nẵng', expected: 'hòa minh, liên chiểu, đà nẵng' },
        { input: '123, Nguyễn Văn Linh, Đà Nẵng', expected: 'nguyễn văn linh, đà nẵng' },
        { input: 'số,Hòa Xuân, Đà Nẵng', expected: 'hòa xuân, đà nẵng' }
      ];
      
      addresses.forEach(({ input, expected }) => {
        const result = cleanAddressString(input);
        expect(result.toLowerCase()).toContain(expected.toLowerCase());
        console.log(`Input: "${input}" -> Cleaned: "${result}"`);
      });
    });
    
    test('should normalize spaces and commas', () => {
      const addresses = [
        { input: 'Khuê Mỹ,Quận Ngũ Hành Sơn,Đà Nẵng', expected: 'khuê mỹ, quận ngũ hành sơn, đà nẵng' },
        { input: 'Hòa Minh ,Liên Chiểu ,Đà Nẵng', expected: 'hòa minh, liên chiểu, đà nẵng' }
      ];
      
      addresses.forEach(({ input, expected }) => {
        const result = cleanAddressString(input);
        expect(result.toLowerCase()).toContain(expected.toLowerCase());
        console.log(`Input: "${input}" -> Cleaned: "${result}"`);
      });
    });
    
    test('should normalize prefixes like P., Q.', () => {
      const addresses = [
        { input: 'P.Khuê Mỹ, Q.Ngũ Hành Sơn, Đà Nẵng', expected: 'phường khuê mỹ, quận ngũ hành sơn, đà nẵng' },
        { input: 'P. Hòa Minh, Q. Liên Chiểu, TP.Đà Nẵng', expected: 'phường hòa minh, quận liên chiểu, đà nẵng' }
      ];
      
      addresses.forEach(({ input, expected }) => {
        const result = cleanAddressString(input);
        expect(result.toLowerCase()).toContain(expected.toLowerCase());
        console.log(`Input: "${input}" -> Cleaned: "${result}"`);
      });
    });
  });
  
  describe('extractLocationComponents', () => {
    test('should extract city, district, ward from addresses with non-standard format', () => {
      const addresses = [
        { 
          input: 'f, Khuê Mỹ, Quận Ngũ Hành Sơn, Đà Nẵng', 
          expected: { city: 'đà nẵng', district: 'ngũ hành sơn', ward: 'khuê mỹ' }
        },
        { 
          input: '123, Hòa Minh, Liên Chiểu, Đà Nẵng', 
          expected: { city: 'đà nẵng', district: 'liên chiểu', ward: 'hòa minh' }
        },
        { 
          input: 'P.Hòa Xuân, Q.Cẩm Lệ, TP.Đà Nẵng', 
          expected: { city: 'đà nẵng', district: 'cẩm lệ', ward: 'hòa xuân' }
        },
      ];
      
      addresses.forEach(({ input, expected }) => {
        const result = extractLocationComponents(input);
        console.log(`Input: "${input}" -> Components:`, result);
        
        if (expected.city) expect(result.city).toBe(expected.city);
        if (expected.district) expect(result.district).toBe(expected.district);
        if (expected.ward) expect(result.ward).toBe(expected.ward);
      });
    });
    
    test('should handle aliases of district and ward names', () => {
      const addresses = [
        { 
          input: 'My An, Ngu Hanh Son, Da Nang', 
          expected: { city: 'đà nẵng', district: 'ngũ hành sơn', ward: 'mỹ an' }
        },
        { 
          input: 'Hoa Xuan, Cam Le, Da Nang', 
          expected: { city: 'đà nẵng', district: 'cẩm lệ', ward: 'hòa xuân' }
        }
      ];
      
      addresses.forEach(({ input, expected }) => {
        const result = extractLocationComponents(input);
        console.log(`Input: "${input}" -> Components:`, result);
        
        if (expected.city) expect(result.city).toBe(expected.city);
        if (expected.district) expect(result.district).toBe(expected.district);
        if (expected.ward) expect(result.ward).toBe(expected.ward);
      });
    });
  });
});
