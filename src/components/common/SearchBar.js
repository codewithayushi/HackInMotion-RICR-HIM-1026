import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

/**
 * Google Maps Style Location SearchBar Component
 * Uses OpenStreetMap Nominatim + Esri Fallback Geocoding (100% Free Tier)
 *
 * @param {Function} onLocationSelect - Callback returning { lat, lng, address, displayName, raw }
 * @param {String} placeholder - Input placeholder text
 * @param {String} initialValue - Initial address string
 * @param {Boolean} showGpsButton - Toggle GPS location button (default: true)
 * @param {String} className - Additional container styling classes
 */
const SearchBar = ({
  onLocationSelect,
  placeholder = 'Search colony, street, landmark, pincode, or city...',
  initialValue = '',
  showGpsButton = true,
  className = ''
}) => {
  const [query, setQuery] = useState(initialValue || '');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [gpsLoading, setGpsLoading] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync with external initialValue if updated
  useEffect(() => {
    if (initialValue && initialValue !== query) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format Nominatim / Geocoder display items into primary title and secondary address
  const formatSuggestion = (item) => {
    const full = item.display_name || '';
    const parts = full.split(',').map((p) => p.trim());
    const primary = parts[0] || 'Selected Location';
    const secondary = parts.slice(1, 4).join(', ') || parts.slice(1).join(', ');
    return { primary, secondary, full };
  };

  // Perform debounced geocoding search (1 req / 350ms to respect OpenStreetMap Nominatim policy)
  const fetchSuggestions = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    try {
      setSearching(true);
      let results = [];

      // 1. Direct OpenStreetMap Nominatim Free Geocoding (100% Client-side, Free, No 404)
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchTerm.trim()
        )}&limit=8&addressdetails=1`;
        const nomRes = await axios.get(nomUrl, {
          headers: { 'User-Agent': 'SmartCityCivicPlatform/2.0' },
          timeout: 5000
        });
        if (nomRes.data && Array.isArray(nomRes.data) && nomRes.data.length > 0) {
          results = nomRes.data.map((item) => ({
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            type: item.type || 'place'
          }));
        }
      } catch (nomErr) {
        console.warn('Nominatim client geocode fallback:', nomErr.message);
      }

      // 2. Fallback to Esri Free Geocoder if Nominatim is unreachable
      if (results.length === 0) {
        try {
          const esriUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
            searchTerm.trim()
          )}&maxLocations=8`;
          const esriRes = await axios.get(esriUrl, { timeout: 4500 });
          const candidates = esriRes.data?.candidates || [];
          results = candidates.map((item) => ({
            display_name: item.address,
            lat: item.location.y,
            lon: item.location.x,
            type: 'address'
          }));
        } catch (esriErr) {
          console.warn('Esri geocode fallback:', esriErr.message);
        }
      }

      setSuggestions(results);
      setIsDropdownOpen(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.warn('Location search notice:', error.message);
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 350);
  };

  const handleSelectLocation = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon || item.lng);
    const formatted = formatSuggestion(item);

    const locationPayload = {
      lat,
      lng,
      address: item.display_name,
      displayName: formatted.primary,
      raw: item
    };

    setQuery(item.display_name);
    setIsDropdownOpen(false);
    setSuggestions([]);

    if (onLocationSelect) {
      onLocationSelect(locationPayload);
    }
  };

  // Keyboard navigation support (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e) => {
    if (!isDropdownOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectLocation(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsDropdownOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // GPS Current Location Detection with detailed error feedback
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        let detectedAddress = `GPS Position (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

        // Attempt Reverse Geocoding to get actual colony / street name
        try {
          const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
          const revRes = await axios.get(revUrl, {
            headers: { 'User-Agent': 'SmartCityCivicPlatform/2.0' },
            timeout: 4000
          });
          if (revRes.data && revRes.data.display_name) {
            detectedAddress = revRes.data.display_name;
          }
        } catch (revErr) {
          console.warn('Reverse geocode fallback:', revErr.message);
        }

        setQuery(detectedAddress);
        setIsDropdownOpen(false);
        setGpsLoading(false);

        if (onLocationSelect) {
          onLocationSelect({
            lat,
            lng,
            address: detectedAddress,
            displayName: 'Current GPS Location'
          });
        }
        toast.success('Location set to your current GPS position!');
      },
      (error) => {
        setGpsLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission was denied. Please allow GPS access or search manually.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('GPS position is currently unavailable. Please search your address.');
            break;
          case error.TIMEOUT:
            toast.error('GPS location request timed out. Please try searching.');
            break;
          default:
            toast.error('Could not detect location. Please search manually.');
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="flex items-center gap-2">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg
              className={`h-4 w-4 ${searching ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setIsDropdownOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            autoComplete="off"
          />

          {/* Loading / Clear Controls */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
            {searching && (
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            )}
            {query && !searching && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                title="Clear input"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Current GPS Button */}
        {showGpsButton && (
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={gpsLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-60 whitespace-nowrap"
            title="Locate via GPS"
          >
            {gpsLoading ? (
              <>
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>My GPS</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isDropdownOpen && suggestions.length > 0 && (
        <div className="absolute z-[9999] left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 flex justify-between items-center">
            <span>Location Suggestions</span>
            <span className="text-[10px] text-gray-400 font-normal">Powered by OpenStreetMap</span>
          </div>

          {suggestions.map((item, index) => {
            const formatted = formatSuggestion(item);
            const isSelected = index === selectedIndex;

            return (
              <div
                key={index}
                onClick={() => handleSelectLocation(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`p-3 text-sm cursor-pointer flex items-start gap-3 transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50 text-gray-900'
                }`}
              >
                <div className="mt-0.5 p-1.5 bg-blue-100 text-blue-700 rounded-lg flex-shrink-0">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 leading-snug truncate">
                    {formatted.primary}
                  </p>
                  {formatted.secondary && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {formatted.secondary}
                    </p>
                  )}
                  <p className="text-[10px] text-blue-600 font-mono mt-1">
                    {parseFloat(item.lat).toFixed(5)}°, {parseFloat(item.lon || item.lng).toFixed(5)}°
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
