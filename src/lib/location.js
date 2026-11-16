export async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: latitude,
    lon: longitude,
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Unable to reverse geocode coordinates");
  }

  const data = await response.json();
  const address = data.address || {};

  const locationParts = [
    address.suburb,
    address.neighbourhood,
    address.city || address.town || address.village,
    address.state,
  ].filter(Boolean);

  return locationParts[0] ? locationParts.join(", ") : data.display_name || "";
}
