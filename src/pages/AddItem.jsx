import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  LocateFixed,
  Loader2,
  MapPin,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useItems, CATEGORIES } from "@/lib/ItemsContext";
import { itemService } from "@/services/itemService";
import LeafletMap from "@/components/items/LeafletMap";
import { findPotentialMatches } from "@/utils/matchingEngine";

const DEFAULT_CAMPUS_LOCATIONS = [
  {
    id: "central-library",
    name: "Central Library",
    address: "Academic Block A, 1st & 2nd Floor",
    latitude: 28.7532,
    longitude: 77.4975,
  },
  {
    id: "engineering-block-b",
    name: "Engineering Block B (ECE/CSE)",
    address: "North Quadrangle, Near Lecture Hall Complex",
    latitude: 28.7538,
    longitude: 77.4981,
  },
  {
    id: "cafeteria-central",
    name: "Central Cafeteria & Student Center",
    address: "Campus Ground Floor, Near Main Amphitheatre",
    latitude: 28.7528,
    longitude: 77.4969,
  },
  {
    id: "indoor-sports-complex",
    name: "Indoor Sports Complex & Gym",
    address: "East Campus Sports Wing",
    latitude: 28.7521,
    longitude: 77.4989,
  },
  {
    id: "main-gate",
    name: "Campus Main Gate 1",
    address: "Delhi-NCR Meerut Highway Entrance",
    latitude: 28.7545,
    longitude: 77.4962,
  },
  {
    id: "boys-hostel-cluster",
    name: "Boys Hostel Area (Tagore/Aryabhatta)",
    address: "Hostel Block 1-4 Common Lounge",
    latitude: 28.7515,
    longitude: 77.4972,
  },
  {
    id: "girls-hostel-cluster",
    name: "Girls Hostel Area (Gargi/Sarojini)",
    address: "Hostel Block Wing B Security Desk",
    latitude: 28.7518,
    longitude: 77.4955,
  },
  {
    id: "central-auditorium",
    name: "Central Auditorium",
    address: "Administrative Block, Ground Floor",
    latitude: 28.7535,
    longitude: 77.4968,
  },
];

const initialFormState = {
  title: "",
  description: "",
  imageUrl: "",
  type: "lost",
  category: "Electronics",
  locationName: "Central Library",
  address: "Academic Block A, 1st & 2nd Floor",
  latitude: 28.7532,
  longitude: 77.4975,
  date: new Date().toISOString().split("T")[0],
  contactPreference: "In-app Chat",
};

export default function AddItem() {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const { items, createItem } = useItems();
  const [form, setForm] = useState(initialFormState);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [campusLocations, setCampusLocations] = useState(DEFAULT_CAMPUS_LOCATIONS);
  const [selectedPresetId, setSelectedPresetId] = useState("central-library");
  const [isLocating, setIsLocating] = useState(false);

  // Live match detection while user fills form
  const draftItem = useMemo(
    () => ({
      type: form.type,
      title: form.title,
      description: form.description,
      category: form.category,
      location: form.locationName,
      latitude: form.latitude,
      longitude: form.longitude,
    }),
    [form]
  );

  const liveMatches = useMemo(() => {
    if (!form.title || form.title.trim().length < 3) return [];
    return findPotentialMatches(draftItem, items, 40);
  }, [draftItem, items]);

  useEffect(() => {
    async function loadCampusLocations() {
      try {
        const locations = await itemService.getCampusLocations();
        if (locations && locations.length > 0) {
          setCampusLocations(locations);
        }
      } catch (err) {
        console.warn("Using fallback campus locations:", err.message);
      }
    }
    loadCampusLocations();
  }, []);

  function updateForm(updates) {
    setForm((currentForm) => ({ ...currentForm, ...updates }));
  }

  function handlePresetChange(e) {
    const locId = e.target.value;
    setSelectedPresetId(locId);

    if (locId === "custom") {
      setManualLocationMode(true);
      return;
    }

    const found = campusLocations.find((loc) => loc.id === locId);
    if (found) {
      updateForm({
        locationName: found.name,
        address: found.address || "",
        latitude: found.latitude,
        longitude: found.longitude,
      });
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setManualLocationMode(true);
      toast.error("Geolocation not supported. Enter campus location manually.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        updateForm({
          latitude: lat,
          longitude: lng,
          locationName: form.locationName.startsWith("Current Location") ? form.locationName : `Current Location (${lat}, ${lng})`,
        });
        setSelectedPresetId("custom");
        setIsLocating(false);
        toast.success("Location captured from GPS");
      },
      (error) => {
        setIsLocating(false);
        setManualLocationMode(true);
        if (error.code === error.PERMISSION_DENIED) {
          toast.warning("Location access denied. Please select or type your campus location.");
        } else {
          toast.error("Unable to get current location. Please select from campus presets.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image file size must be less than 5MB.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      updateForm({ imageUrl: reader.result || "" });
      setUploadedFileName(file.name);
      setUploadError("");
    };
    reader.onerror = () => {
      setUploadError("Unable to read image file. Please try another image.");
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Image file size must be less than 5MB.");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        updateForm({ imageUrl: reader.result || "" });
        setUploadedFileName(file.name);
        setUploadError("");
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error("Authentication required", {
        description: "Please sign in with your @kiet.edu email before publishing.",
      });
      return;
    }

    if (!form.title.trim() || !form.locationName.trim()) {
      toast.error("Item title and location are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("type", form.type);
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim() || form.title.trim());
      formData.append("category", form.category);
      if (form.date) formData.append("date", form.date);

      formData.append(
        "location",
        JSON.stringify({
          name: form.locationName.trim(),
          address: form.address || "",
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        })
      );

      if (selectedFile) {
        formData.append("images", selectedFile);
      }

      const nextItem = await createItem(formData);

      toast.success(
        form.type === "lost"
          ? "Lost item report published!"
          : "Found item report published!",
        {
          description: "Campus community members can now discover and help with your report.",
        }
      );

      setForm(initialFormState);
      setSelectedFile(null);
      navigate(`/item/${nextItem.id || nextItem._id}`);
    } catch (err) {
      console.error("Create item failed:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to publish report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-borderWarm bg-cream-surface px-3.5 py-2 text-xs font-medium text-ink-muted hover:text-ink hover:border-sage transition-all shadow-subtle"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Cancel & return</span>
        </button>

        <div className="text-xs text-ink-muted">
          Reporting as <strong className="text-forest font-semibold">{currentUser?.username}</strong>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 items-start">
        {/* Main Form (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl border border-borderWarm bg-cream-surface p-6 sm:p-8 shadow-card space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sage">
              <Sparkles className="h-3.5 w-3.5 text-accentGold" />
              Community Report
            </div>
            <h1 className="font-serif text-3xl font-medium text-ink mt-1">
              Report an item
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              A few details can help someone get their belongings back.
            </p>
          </div>

          {/* Toggle: I lost something vs I found something */}
          <div className="pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-cream-dark border border-borderWarm">
              <button
                type="button"
                onClick={() => updateForm({ type: "lost" })}
                className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  form.type === "lost"
                    ? "bg-cream-surface text-lostCoral shadow-subtle border border-lostCoral-border"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-lostCoral" />
                <span>I lost something</span>
              </button>

              <button
                type="button"
                onClick={() => updateForm({ type: "found" })}
                className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  form.type === "found"
                    ? "bg-cream-surface text-foundGreen shadow-subtle border border-foundGreen-border"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-foundGreen" />
                <span>I found something</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Item Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                Item Name <span className="text-lostCoral">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                placeholder="e.g. Sony WH-1000XM4 Headphones or Navy Canvas Backpack"
                className="h-11 w-full rounded-xl border border-borderWarm bg-cream/40 px-3.5 text-sm text-ink placeholder:text-ink-light outline-none transition focus:border-forest focus:bg-cream-surface focus:ring-1 focus:ring-forest"
              />

              {/* Instant Match Notification */}
              {liveMatches.length > 0 && (
                <div className="mt-2.5 rounded-xl border border-accentGold/60 bg-accentGold-surface p-3 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-accentGold-dark flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      {liveMatches.length} matching {form.type === "lost" ? "found" : "lost"} item{liveMatches.length > 1 ? "s" : ""} on campus!
                    </span>
                    <span className="text-[10px] text-ink-muted">Did someone already report this?</span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {liveMatches.slice(0, 2).map((m) => (
                      <div
                        key={m.item.id || m.item._id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-cream-surface p-2 text-xs border border-borderWarm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {m.item.imageUrl && (
                            <img
                              src={m.item.imageUrl}
                              alt={m.item.title}
                              className="h-7 w-7 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate text-[11px]">{m.item.title}</p>
                            <p className="text-[10px] text-ink-muted truncate">📍 {typeof m.item.location === "string" ? m.item.location : m.item.location?.name}</p>
                          </div>
                        </div>

                        <a
                          href={`/item/${m.item.id || m.item._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-[11px] font-semibold text-forest hover:underline flex items-center gap-0.5"
                        >
                          View <ArrowRight className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => updateForm({ category: e.target.value })}
                  className="h-11 w-full rounded-xl border border-borderWarm bg-cream/40 px-3.5 text-sm text-ink outline-none transition focus:border-forest focus:bg-cream-surface focus:ring-1 focus:ring-forest"
                >
                  {CATEGORIES.filter((c) => c !== "All Categories").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                  Date Lost or Found
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateForm({ date: e.target.value })}
                  className="h-11 w-full rounded-xl border border-borderWarm bg-cream/40 px-3.5 text-sm text-ink outline-none transition focus:border-forest focus:bg-cream-surface focus:ring-1 focus:ring-forest"
                >
                </input>
              </div>
            </div>

            {/* Campus Location Selector & Leaflet Preview */}
            <div className="space-y-3.5 rounded-2xl border border-borderWarm bg-cream/30 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Campus Location & GPS Pin <span className="text-lostCoral">*</span>
                </label>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-borderWarm bg-cream-surface px-2.5 py-1 text-xs font-medium text-forest hover:bg-cream-dark transition-colors disabled:opacity-50 self-start sm:self-auto"
                >
                  {isLocating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LocateFixed className="h-3.5 w-3.5 text-sage" />
                  )}
                  <span>Use current GPS location</span>
                </button>
              </div>

              {/* Preset Selector Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink-muted mb-1">
                    Select Campus Landmark / Building
                  </label>
                  <select
                    value={selectedPresetId}
                    onChange={handlePresetChange}
                    className="h-10 w-full rounded-xl border border-borderWarm bg-cream-surface px-3 text-xs font-medium text-ink outline-none transition focus:border-forest focus:ring-1 focus:ring-forest"
                  >
                    {campusLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                    <option value="custom">-- Custom / Other Campus Location --</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-ink-muted mb-1">
                    Location Label / Building Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.locationName}
                    onChange={(e) => updateForm({ locationName: e.target.value })}
                    placeholder="e.g. Central Library or Cafeteria"
                    className="h-10 w-full rounded-xl border border-borderWarm bg-cream-surface px-3 text-xs text-ink placeholder:text-ink-light outline-none transition focus:border-forest focus:ring-1 focus:ring-forest"
                  />
                </div>
              </div>

              {/* Specific spot details (floor / room / landmark) */}
              <div>
                <label className="block text-[11px] font-medium text-ink-muted mb-1">
                  Specific Spot / Floor / Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateForm({ address: e.target.value })}
                  placeholder="e.g. 2nd Floor Quiet Area, near Staircase B"
                  className="h-10 w-full rounded-xl border border-borderWarm bg-cream-surface px-3 text-xs text-ink placeholder:text-ink-light outline-none transition focus:border-forest focus:ring-1 focus:ring-forest"
                />
              </div>

              {/* Leaflet Map Interactive Preview */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-ink-muted">
                  <span className="font-medium flex items-center gap-1 text-forest">
                    <MapPin className="h-3 w-3 text-sage" />
                    OpenStreetMap Campus Preview:
                  </span>
                  <span>
                    GPS: {form.latitude}, {form.longitude}
                  </span>
                </div>
                <LeafletMap
                  latitude={form.latitude}
                  longitude={form.longitude}
                  locationName={form.locationName}
                  editable={true}
                  onChange={({ latitude, longitude }) => updateForm({ latitude, longitude })}
                  height="200px"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                Description & Distinguishing Features
              </label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Include color, stickers, scratches, case type, or what is inside to verify ownership..."
                className="w-full rounded-xl border border-borderWarm bg-cream/40 p-3.5 text-sm text-ink placeholder:text-ink-light outline-none transition focus:border-forest focus:bg-cream-surface focus:ring-1 focus:ring-forest"
              />
            </div>

            {/* Photo Upload with Drag & Drop */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                Upload Photo (Optional but Recommended)
              </label>

              {form.imageUrl ? (
                <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden rounded-2xl border border-borderWarm bg-cream-dark">
                  <img
                    src={form.imageUrl}
                    alt="Upload preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateForm({ imageUrl: "" });
                      setUploadedFileName("");
                    }}
                    className="absolute top-3 right-3 rounded-full bg-ink/70 text-cream-surface p-1.5 hover:bg-ink transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-3 rounded-lg bg-cream-surface/90 px-2.5 py-1 text-xs text-ink font-medium">
                    {uploadedFileName || "Custom photo ready"}
                  </div>
                </div>
              ) : (
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-borderWarm bg-cream/30 p-6 text-center hover:border-forest hover:bg-cream/60 transition-all cursor-pointer"
                >
                  <UploadCloud className="h-8 w-8 text-sage mb-2" />
                  <p className="text-sm font-medium text-ink">
                    Click to browse or drop an image here
                  </p>
                  <p className="text-xs text-ink-muted mt-1">
                    Supports JPG, PNG, or WebP
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
              {uploadError && (
                <p className="mt-1 text-xs text-lostCoral">{uploadError}</p>
              )}
            </div>

            {/* Contact Preference */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                Preferred Contact Method
              </label>
              <select
                value={form.contactPreference}
                onChange={(e) => updateForm({ contactPreference: e.target.value })}
                className="h-11 w-full rounded-xl border border-borderWarm bg-cream/40 px-3.5 text-sm text-ink outline-none transition focus:border-forest focus:bg-cream-surface focus:ring-1 focus:ring-forest"
              >
                <option value="In-app Chat">In-app Chat (Default & Recommended)</option>
                <option value="Campus Help Desk Handover">Handed over to Campus Security / Help Desk</option>
                <option value="Direct Call / SMS">Direct Call / SMS</option>
              </select>
            </div>

            {/* CTA Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-forest py-3.5 text-sm font-semibold text-cream-surface hover:bg-forest-hover transition-colors shadow-card disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Publish report</span>
              </button>
            </div>
          </form>
        </div>

        {/* Side Panel: Tips for a better report (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-3xl border border-borderWarm bg-cream-surface p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2 text-forest font-semibold text-sm">
              <Info className="h-4 w-4 text-sage" />
              <span>Tips for a better report</span>
            </div>

            <ul className="space-y-3 text-xs text-ink-muted leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-subtle text-forest text-[11px] font-bold flex-shrink-0">
                  1
                </span>
                <span>
                  <strong className="text-ink font-medium">Add clear photos</strong>: A photo is 4x more likely to catch the owner’s eye while browsing.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-subtle text-forest text-[11px] font-bold flex-shrink-0">
                  2
                </span>
                <span>
                  <strong className="text-ink font-medium">Exact location</strong>: Specify room numbers, floor levels, or nearby campus landmarks.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-subtle text-forest text-[11px] font-bold flex-shrink-0">
                  3
                </span>
                <span>
                  <strong className="text-ink font-medium">Unique details</strong>: Note specific scratches, keychains, lock screens, or distinguishing marks.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-subtle text-forest text-[11px] font-bold flex-shrink-0">
                  4
                </span>
                <span>
                  <strong className="text-ink font-medium">Keep status updated</strong>: Once recovered, mark the item as resolved so classmates know!
                </span>
              </li>
            </ul>
          </div>

          {/* Community Trust Card */}
          <div className="rounded-3xl border border-borderWarm bg-sage-subtle/50 p-6 space-y-2">
            <p className="text-xs font-semibold text-forest uppercase tracking-wider">
              Campus Trust & Safety
            </p>
            <p className="text-xs text-ink-muted leading-relaxed">
              Never share sensitive personal passcodes or OTPs. Arrange exchanges during daylight hours in public campus zones like the Library or Student Center.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
