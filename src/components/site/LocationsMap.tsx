import { useState, useCallback, memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { X, ExternalLink } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface OfficeLocation {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  coordinates: [number, number]; // [lng, lat]
  address: string;
  isPrimary: boolean;
  googleMapsQuery: string;
}

const LOCATIONS: OfficeLocation[] = [
  {
    id: "windhoek",
    city: "Windhoek",
    country: "Namibia",
    countryCode: "NA",
    coordinates: [17.0658, -22.5609],
    address: "6 Luther Street",
    isPrimary: true,
    googleMapsQuery: "6 Luther Street, The Village, Eros, Windhoek, Namibia",
  },
  {
    id: "nairobi",
    city: "Nairobi",
    country: "Kenya",
    countryCode: "KE",
    coordinates: [36.8219, -1.2921],
    address: "Nairobi",
    isPrimary: false,
    googleMapsQuery: "Nairobi, Kenya",
  },
  {
    id: "portharcourt",
    city: "Port Harcourt",
    country: "Nigeria",
    countryCode: "NG",
    coordinates: [7.0171, 4.8156],
    address: "Port Harcourt",
    isPrimary: false,
    googleMapsQuery: "Port Harcourt, Nigeria",
  },
];

const DEFAULT_CENTER: [number, number] = [20, 5];
const DEFAULT_ZOOM = 1;
const ZOOMED_ZOOM = 6;

const DOT_COLOR = "#4a7c59";
const DOT_COLOR_HOVER = "#3d6b4b";

function LocationsMap() {
  const [selectedLocation, setSelectedLocation] =
    useState<OfficeLocation | null>(null);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleMarkerClick = useCallback((location: OfficeLocation) => {
    setSelectedLocation(location);
    setCenter(location.coordinates);
    setZoom(ZOOMED_ZOOM);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedLocation(null);
    setCenter(DEFAULT_CENTER);
    setZoom(DEFAULT_ZOOM);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.5, 12));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.5, 1));
  }, []);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-2xl font-bold">Locations ({LOCATIONS.length})</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Interact with the map to explore all locations
        </p>
      </div>

      {/* Map container */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-[#f0f4f8] shadow-card">
        {/* Side panel */}
        {selectedLocation && (
          <div className="absolute left-0 top-0 z-20 h-full w-72 border-r border-border bg-white/95 backdrop-blur-sm shadow-lg sm:w-80">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h4 className="text-base font-bold text-foreground">
                {selectedLocation.city} (1)
              </h4>
              <button
                onClick={handleClose}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close location details"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-5">
              <div className="border-l-[3px] border-accent pl-4">
                {selectedLocation.isPrimary && (
                  <span className="mb-2 inline-block rounded border border-border px-2 py-0.5 text-xs font-semibold text-foreground">
                    Primary
                  </span>
                )}
                <p className="text-sm font-medium text-foreground">
                  {selectedLocation.address}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {selectedLocation.city}, {selectedLocation.countryCode}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLocation.googleMapsQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                >
                  Get directions
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="grid size-9 place-items-center rounded-full border border-border bg-white text-lg font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="grid size-9 place-items-center rounded-full border border-border bg-white text-lg font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>

        {/* SVG Map */}
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 150,
          }}
          className="h-[300px] w-full sm:h-[400px] lg:h-[460px]"
          style={{ backgroundColor: "#f0f4f8" }}
        >
          <ZoomableGroup
            center={center}
            zoom={zoom}
            onMoveEnd={({ coordinates, zoom: z }) => {
              setCenter(coordinates as [number, number]);
              setZoom(z);
            }}
            translateExtent={[
              [-200, -200],
              [1200, 800],
            ]}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#d4dde8"
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#c5cfd9" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {LOCATIONS.map((location) => (
              <Marker
                key={location.id}
                coordinates={location.coordinates}
                onClick={() => handleMarkerClick(location)}
                onMouseEnter={() => setHoveredId(location.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  r={selectedLocation?.id === location.id ? 6 : 5}
                  fill={
                    hoveredId === location.id ||
                    selectedLocation?.id === location.id
                      ? DOT_COLOR_HOVER
                      : DOT_COLOR
                  }
                  stroke="#fff"
                  strokeWidth={1.5}
                  className="transition-all duration-200"
                />
                {/* Tooltip on hover */}
                {hoveredId === location.id && !selectedLocation && (
                  <g>
                    <rect
                      x={-40}
                      y={-32}
                      width={80}
                      height={22}
                      rx={4}
                      fill="rgba(0,0,0,0.8)"
                    />
                    <text
                      textAnchor="middle"
                      y={-17}
                      style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: "11px",
                        fill: "#ffffff",
                        fontWeight: 500,
                      }}
                    >
                      {location.city}
                    </text>
                  </g>
                )}
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </div>
  );
}

export default memo(LocationsMap);
