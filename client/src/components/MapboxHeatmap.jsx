import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MapPin,
  AlertTriangle,
  Layers,
  Eye,
  Compass,
  Info,
  X,
  ChevronRight,
  HelpCircle,
  Flame,
  CheckCircle2,
  Navigation,
} from 'lucide-react';

/**
 * MAPBOX HEATMAP & GEOGRAPHIC VISUALIZATION COMPONENT
 * Features:
 * 1. Plain-English viva defense cheat sheet (explains colors, stations, values).
 * 2. Interactive HTML station badges with city names and exact values directly on the map.
 * 3. Quick Station Jump Bar (1-click flyTo for any city).
 * 4. 3 View Modes: "All-in-One (Badges + Heatmap)", "Pins & Values Only (Simplest)", "Heatmap Glow Only".
 * 5. Detailed inspection card on click.
 */
export const MapboxHeatmap = ({
  geojsonData,
  selectedParameter = 'temperature',
  hasCoordinates = true,
  height = '500px',
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);

  const [selectedPoint, setSelectedPoint] = useState(null);
  const [currentStyle, setCurrentStyle] = useState('mapbox://styles/mapbox/light-v11');
  const [viewMode, setViewMode] = useState('both'); // 'both', 'pins', 'heatmap'
  const [showVivaGuide, setShowVivaGuide] = useState(true);
  const [mapError, setMapError] = useState(null);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

  // Extract distinct locations for quick jump buttons
  const uniqueStations = React.useMemo(() => {
    if (!geojsonData?.features) return [];
    const stationMap = new Map();
    geojsonData.features.forEach((f) => {
      const loc = f.properties?.location;
      if (loc && !stationMap.has(loc)) {
        stationMap.set(loc, {
          location: loc,
          coordinates: f.geometry.coordinates,
          value: f.properties?.value,
          date: f.properties?.date,
          props: f.properties,
        });
      }
    });
    return Array.from(stationMap.values()).slice(0, 8); // Top 8 stations
  }, [geojsonData]);

  // Clean existing HTML markers
  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  };

  // Render HTML station badges directly on the map
  const renderStationBadges = (mapInstance, data) => {
    clearMarkers();
    if (!data?.features || viewMode === 'heatmap') return;

    // To prevent overlapping duplicates at the same lat/lng, pick latest/first per unique location
    const seen = new Set();
    const stationsToDisplay = [];

    data.features.forEach((f) => {
      const loc = f.properties?.location || `${f.geometry.coordinates[0]},${f.geometry.coordinates[1]}`;
      if (!seen.has(loc)) {
        seen.add(loc);
        stationsToDisplay.push(f);
      }
    });

    stationsToDisplay.forEach((feature) => {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;

      // Custom badge DOM element
      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.style.transform = 'translate(-50%, -100%)';
      el.style.transition = 'transform 0.15s ease';

      const unit =
        selectedParameter === 'temperature'
          ? '°C'
          : selectedParameter === 'rainfall'
          ? 'mm'
          : selectedParameter === 'humidity'
          ? '%'
          : selectedParameter === 'wind_speed'
          ? 'km/h'
          : '';

      el.innerHTML = `
        <div style="
          background: #FFFFFF;
          border: 1.5px solid #156272;
          border-radius: 9999px;
          padding: 3px 9px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          color: #0D1117;
          white-space: nowrap;
        ">
          <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #156272;"></span>
          <span style="font-weight: 600;">${props.location || 'Station'}</span>
          <span style="
            background: #EAF4F6;
            color: #156272;
            padding: 1px 6px;
            border-radius: 9999px;
            font-weight: 700;
            font-family: monospace;
          ">${props.value ?? '--'}${unit}</span>
        </div>
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'translate(-50%, -108%) scale(1.08)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(-50%, -100%) scale(1)';
      });

      el.addEventListener('click', () => {
        setSelectedPoint({
          location: props.location || 'Observation Station',
          date: props.date,
          parameter: props.parameter || selectedParameter,
          value: props.value,
          temperature: props.temperature,
          rainfall: props.rainfall,
          humidity: props.humidity,
          wind_speed: props.wind_speed,
          coordinates: coords,
        });
        mapInstance.flyTo({ center: coords, zoom: 7.5, essential: true });
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(mapInstance);

      markersRef.current.push(marker);
    });
  };

  // Setup layers inside map
  const setupLayers = (mapInstance, data) => {
    if (!data?.features || data.features.length === 0) return;

    // Remove existing layers if any
    if (mapInstance.getLayer('climate-point')) mapInstance.removeLayer('climate-point');
    if (mapInstance.getLayer('climate-heatmap')) mapInstance.removeLayer('climate-heatmap');
    if (mapInstance.getSource('climate-source')) mapInstance.removeSource('climate-source');

    // Add GeoJSON Source
    mapInstance.addSource('climate-source', {
      type: 'geojson',
      data: data,
    });

    const values = data.features.map((f) => Number(f.properties?.value)).filter((v) => !isNaN(v));
    const maxVal = values.length > 0 ? Math.max(...values, 10) : 50;

    // Add Heatmap Layer
    mapInstance.addLayer({
      id: 'climate-heatmap',
      type: 'heatmap',
      source: 'climate-source',
      maxzoom: 12,
      layout: {
        visibility: viewMode === 'pins' ? 'none' : 'visible',
      },
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'value'],
          0, 0,
          maxVal, 1,
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          9, 3,
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)',
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 20,
          9, 45,
        ],
        'heatmap-opacity': 0.8,
      },
    });

    // Add circle layer underneath badges for hover precision
    mapInstance.addLayer({
      id: 'climate-point',
      type: 'circle',
      source: 'climate-source',
      minzoom: 3,
      layout: {
        visibility: viewMode === 'heatmap' ? 'none' : 'visible',
      },
      paint: {
        'circle-radius': 6,
        'circle-color': '#156272',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });

    // Click handler for points
    mapInstance.on('click', 'climate-point', (e) => {
      if (e.features && e.features.length > 0) {
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates.slice();
        setSelectedPoint({
          location: props.location || 'Observation Station',
          date: props.date,
          parameter: props.parameter || selectedParameter,
          value: props.value,
          temperature: props.temperature,
          rainfall: props.rainfall,
          humidity: props.humidity,
          wind_speed: props.wind_speed,
          coordinates: coords,
        });
      }
    });

    mapInstance.on('mouseenter', 'climate-point', () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    });
    mapInstance.on('mouseleave', 'climate-point', () => {
      mapInstance.getCanvas().style.cursor = '';
    });

    // Render HTML badges
    renderStationBadges(mapInstance, data);
  };

  // Initialize Mapbox map
  useEffect(() => {
    if (!hasCoordinates || !mapContainer.current) return;
    if (!mapboxToken || mapboxToken.includes('your_mapbox_access_token')) return;

    try {
      mapboxgl.accessToken = mapboxToken;

      let center = [78.9629, 20.5937]; // Center of India
      if (geojsonData?.features && geojsonData.features.length > 0) {
        center = geojsonData.features[0].geometry.coordinates;
      }

      if (!map.current) {
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: currentStyle,
          center: center,
          zoom: 4.2,
          attributionControl: true,
        });

        mapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');
        mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-right');

        mapInstance.on('load', () => {
          setMapError(null);
          setupLayers(mapInstance, geojsonData);

          if (geojsonData?.features && geojsonData.features.length > 1) {
            const bounds = new mapboxgl.LngLatBounds();
            geojsonData.features.forEach((f) => bounds.extend(f.geometry.coordinates));
            mapInstance.fitBounds(bounds, { padding: 50, maxZoom: 8 });
          }
        });

        mapInstance.on('error', (e) => {
          if (e.error && e.error.message && e.error.message.includes('Forbidden')) {
            setMapError('Mapbox token error: please verify token domain restrictions.');
          }
        });

        map.current = mapInstance;

        setTimeout(() => {
          mapInstance.resize();
        }, 300);
      } else {
        const mapInstance = map.current;
        if (mapInstance.isStyleLoaded()) {
          setupLayers(mapInstance, geojsonData);
        } else {
          mapInstance.once('style.load', () => setupLayers(mapInstance, geojsonData));
        }
      }
    } catch (err) {
      console.error('[Mapbox Init Error]', err);
      setMapError(err.message);
    }

    return () => {
      clearMarkers();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [hasCoordinates, mapboxToken]);

  // Update layers & badges when data, viewMode, or parameter changes
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;
    if (mapInstance.isStyleLoaded()) {
      setupLayers(mapInstance, geojsonData);
    }
  }, [geojsonData, selectedParameter, viewMode]);

  // Fly to a specific station
  const jumpToStation = (station) => {
    if (!map.current) return;
    map.current.flyTo({
      center: station.coordinates,
      zoom: 7.5,
      essential: true,
    });
    setSelectedPoint({
      location: station.location,
      date: station.date,
      parameter: selectedParameter,
      value: station.value,
      temperature: station.props?.temperature,
      rainfall: station.props?.rainfall,
      humidity: station.props?.humidity,
      wind_speed: station.props?.wind_speed,
      coordinates: station.coordinates,
    });
  };

  const handleStyleChange = (styleUrl) => {
    setCurrentStyle(styleUrl);
    if (map.current) {
      map.current.setStyle(styleUrl);
      map.current.once('style.load', () => {
        setupLayers(map.current, geojsonData);
      });
    }
  };

  if (!hasCoordinates) {
    return (
      <div
        className="rounded-2xl p-8 text-center flex flex-col items-center justify-center border shadow-xs"
        style={{ backgroundColor: '#fff', borderColor: '#E4E2DC', minHeight: '280px' }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: '#FFFBEB' }}>
          <AlertTriangle size={24} style={{ color: '#D97706' }} />
        </div>
        <h4 className="font-semibold text-base mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
          Geographic Coordinates Not Detected
        </h4>
        <p className="text-xs max-w-md" style={{ color: '#8B8B97' }}>
          This dataset does not contain latitude/longitude fields. You can still use the Correlation Explorer, Analytics, and Workspace features.
        </p>
      </div>
    );
  }

  if (!mapboxToken || mapboxToken.includes('your_mapbox_access_token')) {
    return (
      <div
        className="rounded-2xl p-8 text-center flex flex-col items-center justify-center border shadow-xs"
        style={{ backgroundColor: '#fff', borderColor: '#E4E2DC', minHeight: '300px' }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: '#EAF4F6' }}>
          <Layers size={24} style={{ color: '#156272' }} />
        </div>
        <h4 className="font-semibold text-base mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
          Mapbox Token Required
        </h4>
        <p className="text-xs max-w-md" style={{ color: '#8B8B97' }}>
          Please ensure your public Mapbox access token is configured in your environment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1-Minute Viva Defense Cheat Sheet */}
      <div
        className="rounded-2xl border p-4 shadow-xs transition-all"
        style={{ backgroundColor: '#F9FBFB', borderColor: '#C8E1E6' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
              style={{ backgroundColor: '#156272', color: '#FFFFFF' }}
            >
              Viva Presentation Guide
            </span>
            <h4 className="font-semibold text-xs text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              How to Explain This Map to Your Examiners in 3 Simple Points
            </h4>
          </div>
          <button
            onClick={() => setShowVivaGuide(!showVivaGuide)}
            className="text-xs text-teal-800 font-medium hover:underline"
          >
            {showVivaGuide ? 'Hide Guide' : 'Show Guide'}
          </button>
        </div>

        {showVivaGuide && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs text-slate-700 border-t border-teal-100">
            <div className="p-2.5 rounded-xl bg-white border border-teal-100/80 space-y-1">
              <p className="font-semibold text-teal-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">1</span>
                What It Represents
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                "Each station badge on the map marks an active weather monitoring station across India with its exact recorded reading."
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-teal-100/80 space-y-1">
              <p className="font-semibold text-teal-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">2</span>
                What Colors Mean
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                "Red and orange regions show high values (e.g. heat peaks), while blue and cyan regions represent cooler or lower intensity areas."
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-teal-100/80 space-y-1">
              <p className="font-semibold text-teal-900 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">3</span>
                Interactive Inspection
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                "Examiners can click any city pill below or click a station badge on the map to inspect all 4 weather parameters simultaneously."
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Station Jump Bar */}
      {uniqueStations.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Navigation size={13} className="text-teal-700" />
            Quick Station Jump:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {uniqueStations.map((st) => (
              <button
                key={st.location}
                onClick={() => jumpToStation(st)}
                className="px-2.5 py-1 rounded-lg border bg-white text-slate-700 hover:border-teal-600 hover:text-teal-800 transition-colors shadow-2xs font-medium flex items-center gap-1"
                style={{ borderColor: '#E4E2DC' }}
              >
                <span>{st.location}</span>
                <span className="text-[10px] font-mono text-teal-700">({st.value})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls Bar: Mode Switcher & Map Styles */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl border bg-white shadow-xs" style={{ borderColor: '#E4E2DC' }}>
          <span className="px-2 font-medium text-slate-400 text-[11px]">Mode:</span>
          {[
            { id: 'both', label: 'Badges & Heatmap' },
            { id: 'pins', label: 'Pins & Values Only' },
            { id: 'heatmap', label: 'Heatmap Only' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className="px-2.5 py-1.5 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: viewMode === mode.id ? '#156272' : 'transparent',
                color: viewMode === mode.id ? '#fff' : '#4A4A52',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Map Basemap Style Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl border bg-white shadow-xs" style={{ borderColor: '#E4E2DC' }}>
          {[
            { id: 'mapbox://styles/mapbox/light-v11', label: 'Light' },
            { id: 'mapbox://styles/mapbox/dark-v11', label: 'Dark' },
            { id: 'mapbox://styles/mapbox/outdoors-v12', label: 'Terrain' },
            { id: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Satellite' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => handleStyleChange(s.id)}
              className="px-2.5 py-1.5 rounded-lg font-medium transition-all"
              style={{
                backgroundColor: currentStyle === s.id ? '#156272' : 'transparent',
                color: currentStyle === s.id ? '#fff' : '#4A4A52',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {mapError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{mapError}</span>
        </div>
      )}

      {/* Mapbox Canvas */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border shadow-sm"
        style={{ height: height, borderColor: '#E4E2DC' }}
      >
        <div ref={mapContainer} className="w-full h-full" />

        {/* Heatmap Legend */}
        {viewMode !== 'pins' && (
          <div
            className="absolute bottom-5 left-5 z-10 bg-white/95 backdrop-blur-md rounded-xl p-3 border shadow-md text-xs space-y-1.5"
            style={{ borderColor: '#E4E2DC', minWidth: '180px' }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold capitalize text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {selectedParameter} Intensity
              </span>
            </div>
            <div className="h-2.5 rounded-full w-full bg-gradient-to-r from-blue-400 via-yellow-300 to-red-600 shadow-inner" />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Low (Cool)</span>
              <span>Medium</span>
              <span>High (Warm)</span>
            </div>
          </div>
        )}

        {/* Inspection Card Popup */}
        {selectedPoint && (
          <div
            className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border shadow-xl max-w-xs text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
            style={{ borderColor: '#E4E2DC', minWidth: '240px' }}
          >
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: '#F0EEE9' }}>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-white" style={{ backgroundColor: '#156272' }}>
                  <MapPin size={12} />
                </div>
                <span>{selectedPoint.location}</span>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md"
              >
                <X size={14} />
              </button>
            </div>

            <div>
              <p className="text-slate-500 text-[11px]">
                Observed Date: <span className="font-mono text-slate-800">{selectedPoint.date || 'Active Period'}</span>
              </p>
              <div className="flex items-baseline justify-between mt-1 pt-1 border-t" style={{ borderColor: '#F0EEE9' }}>
                <span className="text-slate-500 capitalize">{selectedPoint.parameter}:</span>
                <span className="text-base font-bold font-mono text-teal-800">
                  {selectedPoint.value}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px] font-mono text-slate-700" style={{ borderColor: '#F0EEE9' }}>
              <div className="p-1.5 rounded-lg bg-slate-50 border" style={{ borderColor: '#E4E2DC' }}>
                <span className="text-[10px] text-slate-400 block font-sans">Temp</span>
                <span className="font-bold">{selectedPoint.temperature ?? 'N/A'} °C</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border" style={{ borderColor: '#E4E2DC' }}>
                <span className="text-[10px] text-slate-400 block font-sans">Rainfall</span>
                <span className="font-bold">{selectedPoint.rainfall ?? 'N/A'} mm</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border" style={{ borderColor: '#E4E2DC' }}>
                <span className="text-[10px] text-slate-400 block font-sans">Humidity</span>
                <span className="font-bold">{selectedPoint.humidity ?? 'N/A'} %</span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border" style={{ borderColor: '#E4E2DC' }}>
                <span className="text-[10px] text-slate-400 block font-sans">Wind</span>
                <span className="font-bold">{selectedPoint.wind_speed ?? 'N/A'} km/h</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-mono pt-1 text-center">
              Coordinates: {Number(selectedPoint.coordinates[1]).toFixed(4)}°N, {Number(selectedPoint.coordinates[0]).toFixed(4)}°E
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapboxHeatmap;
