import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  Crosshair,
  Globe,
  ZoomIn,
  Navigation,
} from 'lucide-react';
import { LolaParcel, ParcelEvaluation } from '../types/lunar';

interface LunarMapProps {
  evaluations: ParcelEvaluation[];
  selectedParcel: LolaParcel | null;
  onSelectParcel: (parcel: LolaParcel) => void;
  onMapClickCustomCoord?: (lat: number, lon: number) => void;
}

const MOON_RADIUS_M = 1737400.0;
const PARCEL_SIZE_M = 100.0;
// Latitude span of 100m on the Moon in degrees ≈ 0.00329806°
const DLAT_DEG = (PARCEL_SIZE_M / MOON_RADIUS_M) * (180.0 / Math.PI);

export const LunarMap: React.FC<LunarMapProps> = ({
  evaluations,
  selectedParcel,
  onSelectParcel,
  onMapClickCustomCoord,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const parcelsLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedBoxLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeTileLayer, setActiveTileLayer] = useState<'lroc' | 'lola_color' | 'lola_bw'>('lroc');

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = selectedParcel ? selectedParcel.latitude : -89.44;
    const initialLon = selectedParcel ? selectedParcel.longitude : -137.5;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 6,
      minZoom: 1,
      maxZoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const parcelsLayer = L.layerGroup().addTo(map);
    parcelsLayerRef.current = parcelsLayer;

    const selectedBoxLayer = L.layerGroup().addTo(map);
    selectedBoxLayerRef.current = selectedBoxLayer;

    // Handle clicks anywhere on the Moon
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickCustomCoord) {
        onMapClickCustomCoord(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Base Tile Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (activeTileLayer === 'lroc') {
      const lrocLayer = L.tileLayer(
        'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
        {
          attribution: 'NASA / GSFC / ASU (LROC WAC)',
          maxZoom: 12,
          noWrap: true,
        }
      );
      lrocLayer.addTo(map);
    } else if (activeTileLayer === 'lola_color') {
      const usgsColorLayer = L.tileLayer.wms(
        'https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map',
        {
          layers: 'LOLA_color',
          format: 'image/jpeg',
          transparent: false,
          attribution: 'USGS / NASA LOLA',
          maxZoom: 12,
        }
      );
      usgsColorLayer.addTo(map);
    } else if (activeTileLayer === 'lola_bw') {
      const usgsBwLayer = L.tileLayer.wms(
        'https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map',
        {
          layers: 'LOLA_bw',
          format: 'image/jpeg',
          transparent: false,
          attribution: 'USGS / NASA LOLA',
          maxZoom: 12,
        }
      );
      usgsBwLayer.addTo(map);
    }
  }, [activeTileLayer]);

  // Render Candidate Parcels and Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = parcelsLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    evaluations.forEach((evalItem) => {
      const { parcel, status } = evalItem;
      const lat = parcel.latitude;
      const lon = parcel.longitude;

      const latRad = (lat * Math.PI) / 180.0;
      const cosLat = Math.max(0.0005, Math.abs(Math.cos(latRad)));
      const dlonDeg = Math.min(10.0, DLAT_DEG / cosLat);

      const halfDlat = DLAT_DEG / 2.0;
      const halfDlon = dlonDeg / 2.0;

      const bounds: [number, number][] = [
        [lat - halfDlat, lon - halfDlon],
        [lat + halfDlat, lon - halfDlon],
        [lat + halfDlat, lon + halfDlon],
        [lat - halfDlat, lon + halfDlon],
      ];

      const statusColor =
        status === 'optimal'
          ? '#16a34a'
          : status === 'warning'
          ? '#d97706'
          : '#dc2626';

      const isSelected = selectedParcel?.id === parcel.id;

      // Draw 100m box polygon
      const box = L.polygon(bounds, {
        color: isSelected ? '#0284c7' : statusColor,
        weight: isSelected ? 2 : 1,
        opacity: isSelected ? 1 : 0.7,
        fillColor: statusColor,
        fillOpacity: isSelected ? 0.4 : status === 'optimal' ? 0.3 : 0.15,
      });

      box.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectParcel(parcel);
      });

      const title = parcel.name || parcel.id;
      box.bindTooltip(
        `<div style="font-family:Inter,sans-serif">
          <div style="font-weight:600;font-size:11px">${title}</div>
          <div style="font-size:10px;color:${statusColor}">${status.toUpperCase()} (Score: ${evalItem.score}/100)</div>
          <div style="font-size:10px">Elev: ${parcel.mean_elevation_m}m | Slope: ${parcel.max_slope_deg}°</div>
        </div>`,
        { sticky: true, className: 'leaflet-lunar-tooltip' }
      );

      box.addTo(layer);

      // Marker for major named regions
      if (parcel.name) {
        const marker = L.circleMarker([lat, lon], {
          radius: isSelected ? 6 : 4,
          color: isSelected ? '#0284c7' : statusColor,
          fillColor: '#ffffff',
          fillOpacity: 1,
          weight: isSelected ? 2.5 : 1.5,
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectParcel(parcel);
        });

        marker.addTo(layer);
      }
    });
  }, [evaluations, selectedParcel, onSelectParcel]);

  // Draw Highlighted 100m x 100m Landing Box for Selected Area
  useEffect(() => {
    const boxLayer = selectedBoxLayerRef.current;
    if (!boxLayer) return;

    boxLayer.clearLayers();

    if (!selectedParcel) return;

    const lat = selectedParcel.latitude;
    const lon = selectedParcel.longitude;

    const latRad = (lat * Math.PI) / 180.0;
    const cosLat = Math.max(0.0005, Math.abs(Math.cos(latRad)));
    const dlonDeg = Math.min(10.0, DLAT_DEG / cosLat);

    const halfDlat = DLAT_DEG / 2.0;
    const halfDlon = dlonDeg / 2.0;

    const bounds: [number, number][] = [
      [lat - halfDlat, lon - halfDlon],
      [lat + halfDlat, lon - halfDlon],
      [lat + halfDlat, lon + halfDlon],
      [lat - halfDlat, lon + halfDlon],
    ];

    // Primary 100m x 100m landing box outline
    const landingBox = L.polygon(bounds, {
      color: '#0284c7',
      weight: 3,
      opacity: 1,
      fillColor: '#38bdf8',
      fillOpacity: 0.35,
      dashArray: '4, 4',
    });
    landingBox.addTo(boxLayer);

    // 500m Safety Buffer Zone
    const bufferLat = DLAT_DEG * 2.5;
    const bufferLon = dlonDeg * 2.5;
    const bufferBounds: [number, number][] = [
      [lat - bufferLat, lon - bufferLon],
      [lat + bufferLat, lon - bufferLon],
      [lat + bufferLat, lon + bufferLon],
      [lat - bufferLat, lon + bufferLon],
    ];
    const safetyBuffer = L.polygon(bufferBounds, {
      color: '#0284c7',
      weight: 1,
      opacity: 0.4,
      fillColor: 'transparent',
      dashArray: '2, 6',
    });
    safetyBuffer.addTo(boxLayer);

    // Center Crosshair Marker
    const centerPoint = L.circleMarker([lat, lon], {
      radius: 4,
      color: '#0284c7',
      fillColor: '#ffffff',
      fillOpacity: 1,
      weight: 2,
    });
    centerPoint.addTo(boxLayer);
  }, [selectedParcel]);

  // Smooth camera zoom on selected parcel
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedParcel) return;

    map.flyTo([selectedParcel.latitude, selectedParcel.longitude], Math.max(map.getZoom(), 8), {
      animate: true,
      duration: 0.7,
    });
  }, [selectedParcel?.id]);

  const handleZoomToLandingBox = () => {
    const map = mapInstanceRef.current;
    if (!map || !selectedParcel) return;
    map.flyTo([selectedParcel.latitude, selectedParcel.longitude], 11, {
      animate: true,
      duration: 0.6,
    });
  };

  const handleZoomWholeMoon = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([0, 0], 2, {
      animate: true,
      duration: 0.8,
    });
  };

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-slate-900 shadow-sm flex flex-col transition-colors">
      {/* Top Map Action HUD */}
      <div className="absolute top-2.5 left-2.5 z-[1000] flex flex-wrap items-center gap-1.5 pointer-events-auto">
        {/* Layer Selector */}
        <div className="flex items-center space-x-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs shadow-sm">
          <Layers className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
          <button
            onClick={() => setActiveTileLayer('lroc')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              activeTileLayer === 'lroc'
                ? 'bg-sky-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            LROC WAC
          </button>
          <button
            onClick={() => setActiveTileLayer('lola_color')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              activeTileLayer === 'lola_color'
                ? 'bg-sky-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            LOLA Color
          </button>
          <button
            onClick={() => setActiveTileLayer('lola_bw')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              activeTileLayer === 'lola_bw'
                ? 'bg-sky-500 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Relief
          </button>
        </div>

        {/* Zoom Presets */}
        <button
          onClick={handleZoomWholeMoon}
          className="flex items-center space-x-1 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
          title="Zoom out to whole Moon"
        >
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          <span>Whole Moon</span>
        </button>

        {selectedParcel && (
          <button
            onClick={handleZoomToLandingBox}
            className="flex items-center space-x-1 bg-white/90 dark:bg-slate-900/90 text-sky-600 dark:text-sky-300 px-2 py-1 rounded-lg border border-sky-300 dark:border-sky-500/40 text-xs shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Zoom directly into 100m x 100m landing box"
          >
            <ZoomIn className="w-3.5 h-3.5 text-sky-500" />
            <span>Zoom 100m Box</span>
          </button>
        )}
      </div>

      {/* Active Landing Box Banner */}
      {selectedParcel && (
        <div className="absolute top-2.5 right-2.5 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-500/30 text-xs shadow-sm pointer-events-auto flex items-center space-x-2">
          <Crosshair className="w-4 h-4 text-sky-500 animate-pulse" />
          <div>
            <div className="font-semibold text-slate-900 dark:text-white text-[11px] leading-tight">
              {selectedParcel.name || selectedParcel.id}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              100m × 100m Area: {selectedParcel.latitude.toFixed(4)}°, {selectedParcel.longitude.toFixed(4)}°
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-2.5 left-2.5 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 text-[11px] shadow-sm pointer-events-auto flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#16a34a]" />
          <span className="text-slate-700 dark:text-slate-300">Optimal 100m Site</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#d97706]" />
          <span className="text-slate-700 dark:text-slate-300">Occulted</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#dc2626]" />
          <span className="text-slate-700 dark:text-slate-300">Unviable</span>
        </div>
      </div>

      {/* Coordinate status */}
      <div className="absolute bottom-2.5 right-2.5 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 text-[11px] font-mono text-slate-600 dark:text-slate-300 pointer-events-none flex items-center space-x-1.5">
        <Navigation className="w-3 h-3 text-sky-500" />
        <span>
          {selectedParcel
            ? `${selectedParcel.latitude.toFixed(4)}°, ${selectedParcel.longitude.toFixed(4)}°`
            : 'Click map to evaluate any spot'}
        </span>
      </div>

      <div ref={mapContainerRef} className="w-full h-full min-h-[460px] z-0" />
    </div>
  );
};
