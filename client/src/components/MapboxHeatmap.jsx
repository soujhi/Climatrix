import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, AlertTriangle, Layers, Eye, Compass, Info, X } from 'lucide-react';

/**
 * MAPBOX HEATMAP & GEOGRAPHIC VISUALIZATION COMPONENT
 * Converts climate record coordinates into GeoJSON and renders interactive Mapbox heatmaps.
 */
export const MapboxHeatmap = ({ geojsonData, selectedParameter = 'temperature', hasCoordinates = true, height = '480px' }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [currentStyle, setCurrentStyle] = useState('mapbox://styles/mapbox/dark-v11');
  const [showPoints, setShowPoints] = useState(true);
  const [mapError, setMapError] = useState(null);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

  // Setup layers inside helper function
  const setupLayers = (mapInstance, data) => {
    if (!data || !data.features || data.features.length === 0) return;

    // Remove existing if any
    if (mapInstance.getLayer('climate-point')) mapInstance.removeLayer('climate-point');
    if (mapInstance.getLayer('climate-heatmap')) mapInstance.removeLayer('climate-heatmap');
    if (mapInstance.getSource('climate-source')) mapInstance.removeSource('climate-source');

    // Add Source
    mapInstance.addSource('climate-source', {
      type: 'geojson',
      data: data,
    });

    // Dynamic max value for heatmap weighting
    const values = data.features.map(f => Number(f.properties?.value)).filter(v => !isNaN(v));
    const maxVal = values.length > 0 ? Math.max(...values, 10) : 50;

    // Add Heatmap Layer
    mapInstance.addLayer({
      id: 'climate-heatmap',
      type: 'heatmap',
      source: 'climate-source',
      maxzoom: 12,
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'value'],
          0, 0,
          maxVal, 1
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          9, 3
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
          1, 'rgb(178,24,43)'
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 18,
          9, 36
        ],
        'heatmap-opacity': 0.85,
      },
    });

    // Add Point Inspection Circle Layer
    mapInstance.addLayer({
      id: 'climate-point',
      type: 'circle',
      source: 'climate-source',
      minzoom: 3,
      layout: {
        visibility: showPoints ? 'visible' : 'none',
      },
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          3, 5,
          8, 9
        ],
        'circle-color': '#156272',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });

    // Click event for Point Inspection
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
  };

  // Initialize Mapbox
  useEffect(() => {
    if (!hasCoordinates || !mapContainer.current) return;

    if (!mapboxToken || mapboxToken.includes('your_mapbox_access_token')) {
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;

      // Determine center
      let center = [80.2707, 13.0827]; // Chennai default
      if (geojsonData?.features && geojsonData.features.length > 0) {
        center = geojsonData.features[0].geometry.coordinates;
      }

      if (!map.current) {
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: currentStyle,
          center: center,
          zoom: 4.5,
          attributionControl: true,
        });

        mapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
        mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-right');

        mapInstance.on('load', () => {
          setMapError(null);
          setupLayers(mapInstance, geojsonData);

          // Fit bounds if multiple features
          if (geojsonData?.features && geojsonData.features.length > 1) {
            const bounds = new mapboxgl.LngLatBounds();
            geojsonData.features.forEach(f => bounds.extend(f.geometry.coordinates));
            mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 10 });
          }
        });

        mapInstance.on('error', (e) => {
          if (e.error && e.error.message && e.error.message.includes('Forbidden')) {
            setMapError('Mapbox access token was rejected or restricted. Please check your token permissions.');
          }
        });

        map.current = mapInstance;

        // Auto resize after render
        setTimeout(() => {
          mapInstance.resize();
        }, 300);
      } else {
        const mapInstance = map.current;
        if (mapInstance.isStyleLoaded()) {
          setupLayers(mapInstance, geojsonData);
        } else {
          mapInstance.once('style.load', () => {
            setupLayers(mapInstance, geojsonData);
          });
        }
      }
    } catch (err) {
      console.error('[Mapbox Init Error]', err);
      setMapError(err.message);
    }

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [hasCoordinates, mapboxToken]);

  // Update source data when geojsonData or selectedParameter changes without recreating map
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    if (mapInstance.isStyleLoaded()) {
      setupLayers(mapInstance, geojsonData);

      // Pan/Fly to center if coordinates changed
      if (geojsonData?.features && geojsonData.features.length > 0) {
        const coords = geojsonData.features[0].geometry.coordinates;
        mapInstance.flyTo({ center: coords, zoom: 5.5, essential: true });
      }
    }
  }, [geojsonData, selectedParameter]);

  // Handle style change
  const handleStyleChange = (styleUrl) => {
    setCurrentStyle(styleUrl);
    if (map.current) {
      map.current.setStyle(styleUrl);
      map.current.once('style.load', () => {
        setupLayers(map.current, geojsonData);
      });
    }
  };

  // Toggle points visibility
  const togglePoints = () => {
    const nextState = !showPoints;
    setShowPoints(nextState);
    if (map.current && map.current.getLayer('climate-point')) {
      map.current.setLayoutProperty('climate-point', 'visibility', nextState ? 'visible' : 'none');
    }
  };

  if (!hasCoordinates) {
    return (
      <div
        className="rounded-2xl p-8 text-center flex flex-col items-center justify-center border shadow-xs"
        style={{ backgroundColor: '#fff', borderColor: '#E4E2DC', minHeight: '300px' }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: '#FFFBEB' }}>
          <AlertTriangle size={24} style={{ color: '#D97706' }} />
        </div>
        <h4 className="font-semibold text-base mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
          Geographic Coordinates Not Detected
        </h4>
        <p className="text-xs max-w-md" style={{ color: '#8B8B97' }}>
          This dataset does not contain valid latitude and longitude fields. Temporal charts and statistical analysis remain fully operational.
        </p>
      </div>
    );
  }

  if (!mapboxToken || mapboxToken.includes('your_mapbox_access_token')) {
    return (
      <div
        className="rounded-2xl p-8 text-center flex flex-col items-center justify-center border shadow-xs"
        style={{ backgroundColor: '#fff', borderColor: '#E4E2DC', minHeight: '320px' }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: '#EAF4F6' }}>
          <Layers size={24} style={{ color: '#156272' }} />
        </div>
        <h4 className="font-semibold text-base mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
          Mapbox Access Token Required
        </h4>
        <p className="text-xs max-w-md mb-4" style={{ color: '#8B8B97' }}>
          Please add your Mapbox token to <code className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-teal-800">client/.env</code> as <code className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-teal-800">VITE_MAPBOX_TOKEN</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Style Selector Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border bg-white shadow-xs" style={{ borderColor: '#E4E2DC' }}>
          {[
            { id: 'mapbox://styles/mapbox/dark-v11', label: 'Dark Canvas' },
            { id: 'mapbox://styles/mapbox/light-v11', label: 'Light' },
            { id: 'mapbox://styles/mapbox/outdoors-v12', label: 'Terrain' },
            { id: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Satellite' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => handleStyleChange(s.id)}
              className="px-3 py-1.5 rounded-lg font-medium transition-all"
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

        {/* Layer Toggles & Stats */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePoints}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white text-xs font-medium shadow-xs transition-colors"
            style={{
              borderColor: '#E4E2DC',
              color: showPoints ? '#156272' : '#8B8B97',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Eye size={13} />
            <span>{showPoints ? 'Hide Stations' : 'Show Stations'}</span>
          </button>
          <div className="px-3 py-1.5 rounded-xl border bg-white text-xs font-medium text-slate-600 shadow-xs flex items-center gap-1.5" style={{ borderColor: '#E4E2DC' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16A34A' }} />
            <span>{geojsonData?.features?.length || 0} Data Points</span>
          </div>
        </div>
      </div>

      {mapError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{mapError}</span>
        </div>
      )}

      {/* Map Container */}
      <div
        className="relative w-full rounded-2xl overflow-hidden border shadow-sm"
        style={{ height: height, borderColor: '#E4E2DC' }}
      >
        <div ref={mapContainer} className="w-full h-full" />

        {/* Heatmap Legend Overlay */}
        <div
          className="absolute bottom-5 left-5 z-10 bg-white/95 backdrop-blur-md rounded-xl p-3 border shadow-md text-xs space-y-1.5"
          style={{ borderColor: '#E4E2DC', minWidth: '170px' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold capitalize text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {selectedParameter} Density
            </span>
          </div>
          <div className="h-2.5 rounded-full w-full bg-gradient-to-r from-blue-400 via-yellow-300 to-red-600 shadow-inner" />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>

        {/* Selected Point Inspection Card Overlay */}
        {selectedPoint && (
          <div
            className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border shadow-xl max-w-xs text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
            style={{ borderColor: '#E4E2DC', minWidth: '220px' }}
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
                Date: <span className="font-mono text-slate-800">{selectedPoint.date}</span>
              </p>
              <div className="flex items-baseline justify-between mt-1 pt-1 border-t" style={{ borderColor: '#F0EEE9' }}>
                <span className="text-slate-500 capitalize">{selectedPoint.parameter}:</span>
                <span className="text-sm font-bold font-mono text-teal-800">
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
