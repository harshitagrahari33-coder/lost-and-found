const campusLocations = require('../config/campusLocations');

function getCampusLocations() {
  return campusLocations;
}

function generateMapsUrl(latitude, longitude) {
  const safeLat = Number(latitude);
  const safeLng = Number(longitude);
  if (isNaN(safeLat) || isNaN(safeLng)) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${safeLat},${safeLng}`;
}

/**
 * Apply privacy rounding rules:
 * - Unauthenticated users get coordinates rounded to 3 decimal places (~110m precision)
 * - Authenticated users get exact coordinates for items
 */
function sanitizeLocation(location, isAuthenticated = false) {
  if (!location) return null;

  const lat = Number(location.latitude);
  const lng = Number(location.longitude);

  let finalLat = lat;
  let finalLng = lng;

  if (!isAuthenticated) {
    finalLat = Math.round(lat * 1000) / 1000;
    finalLng = Math.round(lng * 1000) / 1000;
  }

  return {
    name: location.name,
    address: location.address || '',
    latitude: finalLat,
    longitude: finalLng,
    mapsUrl: generateMapsUrl(finalLat, finalLng),
    isApproximate: !isAuthenticated,
  };
}

module.exports = {
  getCampusLocations,
  generateMapsUrl,
  sanitizeLocation,
};
