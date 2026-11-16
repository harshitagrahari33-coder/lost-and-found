import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import { ArrowRight, MapPin } from "lucide-react";

// Create custom colored pin for lost (coral) vs found (forest/green)
function createPinIcon(type = "lost", label = "") {
  const isLost = type === "lost";
  const pinBg = isLost ? "#E56B67" : "#5C9B78";
  const shadowColor = isLost ? "rgba(229, 107, 103, 0.45)" : "rgba(92, 155, 120, 0.45)";

  return L.divIcon({
    className: "campus-leaflet-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="background-color: ${pinBg}; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px ${shadowColor}; border: 2.5px solid #FFFDF8;">
          <div style="width: 10px; height: 10px; background-color: #FFFDF8; border-radius: 50%;"></div>
        </div>
        ${
          label
            ? `<div style="margin-top: 4px; background: rgba(23,32,27,0.88); color: #FFFDF8; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 12px; white-space: nowrap; pointer-events: none; backdrop-filter: blur(4px); box-shadow: 0 2px 6px rgba(0,0,0,0.15); max-width: 140px; overflow: hidden; text-overflow: ellipsis;">${label}</div>`
            : ""
        }
      </div>
    `,
    iconSize: [34, 44],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

export default function CampusItemMap({ items = [], height = "520px", className = "" }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Filter items that have valid coordinates
  const mappedItems = items.filter((item) => {
    const lat = Number(item.latitude || item.locationDetails?.latitude);
    const lng = Number(item.longitude || item.locationDetails?.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const defaultLat = 28.7532;
    const defaultLng = 77.4975;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 16,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Update Markers when items change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const bounds = L.latLngBounds();

    mappedItems.forEach((item) => {
      const lat = Number(item.latitude || item.locationDetails?.latitude);
      const lng = Number(item.longitude || item.locationDetails?.longitude);
      const locName = typeof item.location === "string" ? item.location : (item.location?.name || "Campus");

      const marker = L.marker([lat, lng], {
        icon: createPinIcon(item.type, locName.split("·")[0].trim()),
      });

      // HTML Popup
      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; min-width: 200px; padding: 2px;">
          ${
            item.imageUrl
              ? `<div style="width: 100%; height: 110px; border-radius: 10px; overflow: hidden; margin-bottom: 8px; background: #ECE6D9;">
                  <img src="${item.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${item.title}" />
                </div>`
              : ""
          }
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; background-color: ${
              item.type === "lost" ? "#FDF4F4" : "#F0F7F3"
            }; color: ${item.type === "lost" ? "#B84743" : "#3A7253"}; border: 1px solid ${
              item.type === "lost" ? "#F7CDCC" : "#C7E3D3"
            };">
              ${item.type}
            </span>
            <span style="font-size: 11px; color: #69736D;">${item.category || ""}</span>
          </div>
          <h4 style="font-size: 13px; font-weight: 600; color: #17201B; margin: 0 0 4px 0; line-height: 1.3;">
            ${item.title}
          </h4>
          <p style="font-size: 11px; color: #69736D; margin: 0 0 8px 0;">📍 ${locName}</p>
          <a href="/item/${item.id || item._id}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #234C3B; text-decoration: none; border-bottom: 1.5px solid #234C3B; padding-bottom: 1px;">
            View details &rarr;
          </a>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 260 });
      marker.on("click", () => {
        setSelectedItem(item);
      });

      marker.addTo(markersLayerRef.current);
      bounds.extend([lat, lng]);
    });

    if (mappedItems.length > 0 && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [items]);

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden border border-borderWarm shadow-card bg-cream-surface ${className}`}>
      {/* Map Header / Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-borderWarm bg-cream-surface/95 backdrop-blur-sm z-10 relative">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-subtle text-forest">
            <MapPin className="h-4 w-4 text-forest" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-semibold text-ink">Campus Map View</h3>
            <p className="text-[11px] text-ink-muted">
              Displaying <strong className="text-forest">{mappedItems.length}</strong> geolocated items across campus
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-lostCoral border border-lostCoral-border" />
            <span className="text-ink-muted text-[11px]">Lost Items ({items.filter((i) => i.type === "lost").length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-foundGreen border border-foundGreen-border" />
            <span className="text-ink-muted text-[11px]">Found Items ({items.filter((i) => i.type === "found").length})</span>
          </div>
        </div>
      </div>

      {/* Leaflet Canvas Container */}
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="w-full z-0 relative"
      />

      {/* Bottom Floating Quick Inspection Drawer (if item clicked) */}
      {selectedItem && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-20 rounded-2xl border border-borderWarm bg-cream-surface/95 backdrop-blur-md p-3.5 shadow-float animate-fade-in">
          <div className="flex items-start gap-3">
            {selectedItem.imageUrl && (
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                className="h-16 w-16 rounded-xl object-cover border border-borderWarm flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                    selectedItem.type === "lost"
                      ? "bg-lostCoral-surface text-lostCoral-text border border-lostCoral-border"
                      : "bg-foundGreen-surface text-foundGreen-text border border-foundGreen-border"
                  }`}
                >
                  {selectedItem.type}
                </span>
                <span className="text-[11px] text-ink-muted truncate">{selectedItem.category}</span>
              </div>

              <h4 className="text-xs font-semibold text-ink line-clamp-1">{selectedItem.title}</h4>
              <p className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">
                📍 {typeof selectedItem.location === "string" ? selectedItem.location : selectedItem.location?.name}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-borderWarm-light flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="text-[11px] text-ink-muted hover:text-ink"
            >
              Dismiss
            </button>
            <Link
              to={`/item/${selectedItem.id || selectedItem._id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
            >
              <span>View details</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
