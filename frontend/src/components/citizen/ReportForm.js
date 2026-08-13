import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const CATEGORIES = [
  { value: 'roads', label: 'Roads & Potholes' },
  { value: 'sanitation', label: 'Sanitation & Garbage' },
  { value: 'electricity', label: 'Electricity & Streetlights' },
  { value: 'water', label: 'Water Supply & Leakage' },
  { value: 'public_property', label: 'Public Property' },
  { value: 'drainage', label: 'Drainage & Waterlogging' },
  { value: 'other', label: 'Other' }
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

// Helper component to dynamically re-center map view
const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
};

// Location Marker Component for Map click selection
const LocationPicker = ({ position, setPosition, onLocationSelect }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationSelect({ lat, lng });
    },
  });

  return position ? <Marker position={position} /> : null;
};

// Google Maps Style Address Search Component
const LocationSearchBox = ({ onSelectLocation }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query || !query.trim()) return;

    try {
      setSearching(true);
      const res = await axios.get(`/api/issues/geocode?q=${encodeURIComponent(query)}`);
      if (res.data && res.data.success && res.data.data && res.data.data.length > 0) {
        setSuggestions(res.data.data);
      } else {
        toast.info('No matching locations found. Try typing city or area name.');
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Location search failed:', err);
      toast.error('Could not search location');
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    onSelectLocation({ lat, lng, address: item.display_name });
    setSuggestions([]);
    setQuery(item.display_name);
    toast.success('Map location updated!');
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          onSelectLocation({ lat, lng, address: 'Current GPS Position' });
          setQuery(`GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          toast.success('Location set to your current GPS position!');
        },
        () => {
          toast.error('Unable to fetch current GPS location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="relative mb-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2 min-w-[260px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any address, city, street, or area (e.g. Connaught Place, Bandra West)..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
          >
            {searching ? 'Searching...' : '🔍 Search Address'}
          </button>
        </form>
        <button
          type="button"
          onClick={handleCurrentLocation}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 shadow-sm"
          title="Use current GPS position"
        >
          📍 Use My GPS
        </button>
      </div>

      {/* Auto-suggest dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute z-[1000] left-0 right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {suggestions.map((item, index) => (
            <div
              key={index}
              onClick={() => handleSelect(item)}
              className="p-3 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
            >
              📍 <span className="font-medium text-gray-900">{item.display_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ReportForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    location: null
  });

  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default India center
  const [markerPos, setMarkerPos] = useState(null);

  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const fileInputRef = useRef();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationSelect = (loc) => {
    setFormData((prev) => ({ ...prev, location: loc }));
    setMarkerPos([loc.lat, loc.lng]);
    setMapCenter([loc.lat, loc.lng]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      toast.error('Maximum 5 photos allowed');
      return;
    }

    setPhotos(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.location) {
      toast.error('Please select or search a location on the map');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    setLoading(true);

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('priority', formData.priority);
    formDataToSend.append('location', JSON.stringify({
      type: 'Point',
      coordinates: [formData.location.lng, formData.location.lat],
      address: formData.location.address || ''
    }));

    photos.forEach(photo => {
      formDataToSend.append('photos', photo);
    });

    try {
      const res = await axios.post('/api/issues', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.duplicateWarning) {
        setDuplicateWarning(res.data.duplicateWarning);
        toast.warning('Similar issue found nearby!', { autoClose: false });
      } else {
        toast.success('Issue reported successfully!');
        navigate('/citizen');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to report issue');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl shadow-md text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Login Required</h2>
        <p className="text-gray-600 text-sm mb-4">Please log in to report civic issues.</p>
        <Link to="/login" className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-sm">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 my-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Report a Civic Issue</h1>

      {duplicateWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start">
            <div className="ml-3">
              <p className="text-sm text-amber-800">
                <strong>Duplicate Issue Warning:</strong> A similar issue was reported nearby.
                <br />
                Match score: {duplicateWarning.score}% — Existing title: "{duplicateWarning.existingIssue.title}"
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2.5 border"
            placeholder="Brief title (e.g. Deep pothole near main crossroad)"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="4"
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2.5 border"
            placeholder="Provide details about the issue..."
          />
        </div>

        {/* Category & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2.5 border bg-white"
            >
              <option value="">Select category</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2.5 border bg-white"
            >
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location Picker with Manual Search & GPS */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Location Selector {formData.location && '✓ (Location Set)'}
          </label>
          
          {/* Manual Location Search Input */}
          <LocationSearchBox onSelectLocation={handleLocationSelect} />

          <div className="h-72 w-full rounded-xl overflow-hidden border border-gray-300 shadow-inner relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={markerPos} />
              <LocationPicker
                position={markerPos}
                setPosition={setMarkerPos}
                onLocationSelect={handleLocationSelect}
              />
            </MapContainer>
          </div>
          
          {formData.location ? (
            <p className="text-xs font-semibold text-emerald-700 mt-2 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
              📍 Pin Location: {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
              {formData.location.address && ` — ${formData.location.address}`}
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Tip: Type location in the search bar above OR click directly on the map to place a pin.
            </p>
          )}
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photos (Up to 5)</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-400 transition-colors">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                  <span>Upload photos</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG up to 5MB (Max 5 photos)</p>
            </div>
          </div>
          {photoPreviews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img src={preview} alt={`Preview ${index + 1}`} className="h-20 w-20 object-cover rounded-lg border shadow-sm" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
                      setPhotos(prev => prev.filter((_, i) => i !== index));
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors"
        >
          {loading ? 'Submitting Issue...' : 'Submit Issue Report'}
        </button>
      </form>
    </div>
  );
};

export default ReportForm;