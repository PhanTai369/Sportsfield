/**
 * Pagination Utilities
 * Helpers for implementing consistent pagination across the API
 */
const logger = require('./logger');

/**
 * Get pagination parameters from request query
 * @param {Object} query - Express request query object
 * @param {Object} options - Default options
 * @returns {Object} Pagination parameters (limit, offset, page)
 */
exports.getPaginationParams = (query, options = {}) => {
  const { 
    defaultPage = 1, 
    defaultLimit = 10,
    maxLimit = 100
  } = options;
  
  // Handle array parameters from duplicate query params
  const rawPage = Array.isArray(query.page) ? query.page[query.page.length - 1] : query.page;
  const rawLimit = Array.isArray(query.limit) ? query.limit[query.limit.length - 1] : query.limit;
  
  // Parse page and limit params, with defaults
  let page = parseInt(rawPage, 10) || defaultPage;
  let limit = parseInt(rawLimit, 10) || defaultLimit;
  
  // Ensure page is at least 1
  page = Math.max(1, page);
  
  // Ensure limit is between 1 and maxLimit
  limit = Math.min(Math.max(1, limit), maxLimit);
  
  // Calculate offset based on page and limit
  const offset = (page - 1) * limit;
  
  logger.debug('Pagination params calculated', { page, limit, offset });
  
  return { page, limit, offset };
};

/**
 * Format pagination metadata for response
 * @param {Object} data - Data from database query with count and rows
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Formatted pagination response
 */
exports.getPaginationData = (data, page, limit) => {
  const { count: totalItems, rows: items } = data;
  const currentPage = page;
  const totalPages = Math.ceil(totalItems / limit);
  const hasNext = currentPage < totalPages;
  const hasPrevious = currentPage > 1;
  
  logger.debug('Pagination metadata created', { 
    totalItems, 
    currentPage, 
    totalPages,
    hasNext,
    hasPrevious
  });
  
  return {
    items,
    meta: {
      totalItems,
      itemsPerPage: limit,
      currentPage,
      totalPages,
      hasNext,
      hasPrevious
    }
  };
};

/**
 * Generate pagination links for HATEOAS
 * @param {string} baseUrl - Base URL for the resource
 * @param {Object} meta - Pagination metadata
 * @param {Object} query - Additional query parameters
 * @returns {Object} Pagination links
 */
exports.getPaginationLinks = (baseUrl, meta, query = {}) => {
  const { currentPage, totalPages } = meta;
  
  // Create a copy of the query object without pagination params
  const { page, limit, ...restQuery } = query;
  
  // Build query string from remaining params
  const queryParams = Object.entries(restQuery)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  const queryBase = queryParams ? `&${queryParams}` : '';
  
  // Generate links object
  const links = {
    self: `${baseUrl}?page=${currentPage}&limit=${meta.itemsPerPage}${queryBase}`
  };
  
  if (currentPage > 1) {
    links.prev = `${baseUrl}?page=${currentPage - 1}&limit=${meta.itemsPerPage}${queryBase}`;
    links.first = `${baseUrl}?page=1&limit=${meta.itemsPerPage}${queryBase}`;
  }
  
  if (currentPage < totalPages) {
    links.next = `${baseUrl}?page=${currentPage + 1}&limit=${meta.itemsPerPage}${queryBase}`;
    links.last = `${baseUrl}?page=${totalPages}&limit=${meta.itemsPerPage}${queryBase}`;
  }
  
  return links;
};

/**
 * Create complete paginated response
 * @param {Object} data - Data from database query with count and rows
 * @param {Object} params - Pagination parameters
 * @param {string} baseUrl - Base URL for the resource
 * @param {Object} query - Additional query parameters
 * @returns {Object} Complete paginated response
 */
exports.paginatedResponse = (data, params, baseUrl, query = {}) => {
  const { page, limit } = params;
  const paginatedData = exports.getPaginationData(data, page, limit);
  
  if (baseUrl) {
    paginatedData.links = exports.getPaginationLinks(
      baseUrl, 
      paginatedData.meta,
      query
    );
  }
  
  return paginatedData;
}; 