# Tài liệu API Geocoding - Tìm kiếm sân bóng theo vị trí

## Tổng quan
Hệ thống geocoding cho phép:
1. **Tìm kiếm sân bóng trong bán kính** (8km mặc định)
2. **Chuyển đổi địa chỉ thành tọa độ** (geocoding)
3. **Tìm sân bóng gần nhất** theo vị trí hiện tại

## API Endpoints

### 1. Tìm kiếm sân bóng theo vị trí
**Endpoint:** `GET /api/fields/search/location`

**Mục đích:** Tìm sân bóng trong bán kính từ vị trí xác định

**Parameters:**
```
- address (string, optional): Địa chỉ cần tìm kiếm
- latitude (number, optional): Vĩ độ
- longitude (number, optional): Kinh độ  
- radius (number, optional): Bán kính tìm kiếm (km), mặc định 8km
- page (number, optional): Trang, mặc định 1
- limit (number, optional): Số kết quả mỗi trang, mặc định 10
```

**Ví dụ sử dụng:**
```bash
# Tìm kiếm bằng tọa độ (Quận 1, HCM)
GET /api/fields/search/location?latitude=10.7769&longitude=106.7009&radius=10

# Tìm kiếm bằng địa chỉ
GET /api/fields/search/location?address=Quận 1, Hồ Chí Minh&radius=15

# Phân trang
GET /api/fields/search/location?latitude=10.7769&longitude=106.7009&page=2&limit=5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fields": [
      {
        "id": "uuid",
        "name": "Sân bóng Bến Nghé", 
        "description": "Sân bóng ngay trung tâm thành phố",
        "price_per_hour": 200000,
        "images1": "url",
        "distance": 0.15,
        "location": {
          "latitude": "10.7829",
          "longitude": "106.7009",
          "address_text": "142 Lê Duẩn, Phường Bến Nghé, Quận 1",
          "city": "Hồ Chí Minh",
          "district": "Quận 1"
        },
        "owner": {
          "id": "uuid",
          "name": "Test Owner",
          "phone": "0123456789"
        }
      }
    ],
    "search_info": {
      "search_coordinates": {
        "latitude": 10.7769,
        "longitude": 106.7009
      },
      "radius_km": 10,
      "total_found": 3
    },
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 10,
      "total_pages": 1
    }
  }
}
```

### 2. Chuyển đổi địa chỉ thành tọa độ
**Endpoint:** `POST /api/fields/geocode`

**Mục đích:** Chuyển địa chỉ text thành tọa độ kinh độ/vĩ độ

**Request Body:**
```json
{
  "address": "Quận 1, Hồ Chí Minh"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coordinates": {
      "latitude": 10.7769,
      "longitude": 106.7009
    },
    "address_info": {
      "formatted_address": "Quận 1, Hồ Chí Minh, Việt Nam",
      "city": "Hồ Chí Minh",
      "district": "Quận 1",
      "country": "Việt Nam"
    }
  }
}
```

### 3. Tìm sân bóng gần nhất
**Endpoint:** `GET /api/fields/nearest`

**Mục đích:** Tìm các sân bóng gần nhất từ vị trí hiện tại

**Parameters:**
```
- latitude (number, required): Vĩ độ
- longitude (number, required): Kinh độ
- limit (number, optional): Số lượng sân tối đa, mặc định 5
```

**Ví dụ:**
```bash
GET /api/fields/nearest?latitude=10.7769&longitude=106.7009&limit=3
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nearest_fields": [
      {
        "id": "uuid",
        "name": "Sân bóng Bến Nghé",
        "distance": 0.15,
        "price_per_hour": 200000,
        "location": {
          "address_text": "142 Lê Duẩn, Phường Bến Nghé, Quận 1"
        }
      }
    ],
    "search_coordinates": {
      "latitude": 10.7769,
      "longitude": 106.7009
    }
  }
}
```

## Cách tích hợp vào Frontend

### 1. Tìm sân gần vị trí hiện tại
```javascript
// Lấy vị trí hiện tại
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/fields/search/location?latitude=${latitude}&longitude=${longitude}&radius=8`
    );
    const data = await response.json();
    
    if (data.success) {
      displayNearbyFields(data.data.fields);
    }
  } catch (error) {
    console.error('Error finding nearby fields:', error);
  }
});
```

### 2. Tìm kiếm theo địa chỉ
```javascript
const searchByAddress = async (address) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/fields/search/location?address=${encodeURIComponent(address)}&radius=10`
    );
    const data = await response.json();
    
    if (data.success) {
      displaySearchResults(data.data.fields);
      showSearchInfo(data.data.search_info);
    }
  } catch (error) {
    console.error('Error searching by address:', error);
  }
};
```

### 3. Geocoding địa chỉ
```javascript
const geocodeAddress = async (address) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/fields/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ address })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const { latitude, longitude } = data.data.coordinates;
      // Sử dụng tọa độ để hiển thị trên bản đồ
      showOnMap(latitude, longitude);
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
  }
};
```

## Kế hoạch mở rộng

### 1. Tích hợp Google Maps/MapBox
- Hiển thị sân bóng trên bản đồ
- Tính đường đi từ vị trí hiện tại đến sân
- Street view của sân bóng

### 2. Filter nâng cao
- Lọc theo loại sân (5vs5, 7vs7, 11vs11)
- Lọc theo giá
- Lọc theo thời gian mở cửa
- Lọc theo rating

### 3. Caching & Performance
- Cache geocoding results
- Spatial indexing với PostGIS
- Elasticsearch cho search phức tạp

## Lưu ý kỹ thuật

### Rate Limiting
- OpenStreetMap: 1 request/second
- Google Maps API: Tùy package (cần API key)

### Database Optimization
- Index trên (latitude, longitude)
- Bounding box query trước khi tính distance chính xác
- Pagination để tránh load quá nhiều dữ liệu

### Error Handling
- Fallback khi geocoding fail
- Validation coordinates
- Timeout cho external API calls

## Test Cases
```bash
# Test 1: Tìm sân trong HCM (có kết quả)
curl "http://localhost:5001/api/fields/search/location?latitude=10.7769&longitude=106.7009&radius=20"

# Test 2: Tìm sân ở vùng xa (không có kết quả)  
curl "http://localhost:5001/api/fields/search/location?latitude=21.0285&longitude=105.8542&radius=5"

# Test 3: Geocoding
curl -X POST "http://localhost:5001/api/fields/geocode" \
  -H "Content-Type: application/json" \
  -d '{"address": "Quận 1, Hồ Chí Minh"}'

# Test 4: Sân gần nhất
curl "http://localhost:5001/api/fields/nearest?latitude=10.7829&longitude=106.7009&limit=3"
```
