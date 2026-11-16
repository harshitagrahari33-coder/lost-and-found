import { useState } from "react";
import { Loader2, LocateFixed, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { reverseGeocode } from "@/lib/location";

export default function LocationPicker({ location, latitude, longitude, onChange }) {
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported in this browser. Enter the location manually.");
      return;
    }

    setIsLocating(true);
    setMessage("");
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLatitude = position.coords.latitude.toFixed(5);
        const nextLongitude = position.coords.longitude.toFixed(5);

        try {
          const readableLocation = await reverseGeocode(nextLatitude, nextLongitude);

          onChange({
            latitude: nextLatitude,
            longitude: nextLongitude,
            location: readableLocation || `${nextLatitude}, ${nextLongitude}`,
          });

          setMessage("Location detected and converted into a readable address.");
          toast.success("Location added");
        } catch {
          onChange({
            latitude: nextLatitude,
            longitude: nextLongitude,
            location: location || `${nextLatitude}, ${nextLongitude}`,
          });

          setMessage("Coordinates captured. Reverse geocoding failed, so the location can still be edited manually.");
          toast.success("Coordinates captured");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage("Location permission was denied. Enter the location manually below.");
          toast.error("Permission denied");
          return;
        }

        setErrorMessage("Unable to fetch your current location. Enter the location manually below.");
        toast.error("Could not retrieve location");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-stone-200">
            Location
          </label>
          <p className="text-xs text-stone-400">Use geolocation or type it manually.</p>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          Use current location
        </button>
      </div>

      <input
        id="location"
        value={location}
        onChange={(event) => onChange({ location: event.target.value })}
        placeholder="e.g. Main library entrance"
        className="h-12 w-full rounded-2xl border border-white/10 bg-stone-950/40 px-4 text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/60"
      />

      {(latitude || longitude) && (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-300">
          Coordinates: <span className="font-medium text-white">{latitude}</span>,{" "}
          <span className="font-medium text-white">{longitude}</span>
        </div>
      )}

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      {errorMessage ? (
        <p className="inline-flex items-center gap-2 text-sm text-amber-200">
          <TriangleAlert className="h-4 w-4" />
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
