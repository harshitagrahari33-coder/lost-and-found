import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Create a custom styled marker matching the forest green & cream palette
function createCustomPin(label = '') {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="background-color: #234C3B; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(35, 76, 59, 0.4); border: 2.5px solid #FFFDF8;">
          <div style="width: 10px; height: 10px; background-color: #F5F1E8; border-radius: 50%;"></div>
        </div>
        ${
          label
            ? `<div style="margin-top: 4px; background: rgba(23,32,27,0.85); color: #FFFDF8; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 12px; white-space: nowrap; pointer-events: none; backdrop-filter: blur(4px);">${label}</div>`
            : ''
        }
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export default function LeafletMap({
  latitude = 28.7532,
  longitude = 77.4975,
  locationName = 'Campus Location',
  editable = false,
  onChange,
  height = '240px',
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const lat = Number(latitude) || 28.7532;
  const lng = Number(longitude) || 77.4975;

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if map already exists
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        icon: createCustomPin(locationName),
        draggable: editable,
      }).addTo(map);

      if (editable) {
        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          onChange?.({
            latitude: Number(newPos.lat.toFixed(5)),
            longitude: Number(newPos.lng.toFixed(5)),
          });
        });

        map.on('click', (e) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          marker.setLatLng([clickLat, clickLng]);
          onChange?.({
            latitude: Number(clickLat.toFixed(5)),
            longitude: Number(clickLng.toFixed(5)),
          });
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate size after initial render to avoid gray tile glitch
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update center and marker position when lat/lng/locationName changes
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setIcon(createCustomPin(locationName));
      mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
    }
  }, [lat, lng, locationName]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-borderWarm shadow-inner bg-cream-dark ${className}`}
      style={{ height }}
    >
      <div ref={mapContainerRef} className="h-full w-full z-0" />
      {editable && (
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-lg bg-cream-surface/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-ink-muted border border-borderWarm shadow-subtle">
          Click map or drag pin to adjust
        </div>
      )}
    </div>
  );
}
