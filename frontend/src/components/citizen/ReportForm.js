import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import SearchBar from '../common/SearchBar';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon bundle assets
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

// Helper to smoothly fly/pan map to center when coordinates change
const MapFlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.flyTo(center, 16, { animate: true, duration: 1.2 });
    }
  }, [center, map]);
  return null;
};

// Map click handler that performs reverse geocoding
const MapClickHandler = ({ onMapClick, markerPos }) => {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      let address = `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

      try {
        const revUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const res = await axios.get(revUrl, {
          headers: { 'User-Agent': 'SmartCityCivicPlatform/2.0' },
          timeout: 4000
        });
        if (res.data && res.data.display_name) {
          address = res.data.display_name;
        }
      } catch (err) {
        console.warn('Map click reverse geocoding fallback:', err.message);
      }

      onMapClick({ lat, lng, address });
    }
  });

  return markerPos ? (
    <Marker position={markerPos}>
      <Popup>
        <span className="text-xs font-semibold text-gray-800">
          📍 Selected Civic Issue Location
        </span>
      </Popup>
    </Marker>
  ) : null;
};

// Convert File to Base64 Data URL
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({ url: reader.result, key: file.name, name: file.name });
    reader.onerror = (error) => reject(error);
  });
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

  const [mapCenter, setMapCenter] = useState([22.7196, 75.8577]); // Default Smart City Center
  const [markerPos, setMarkerPos] = useState(null);
  const [formattedAddress, setFormattedAddress] = useState('');

  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const fileInputRef = useRef();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Called when location is selected from SearchBar or GPS button
  const handleLocationSelect = (loc) => {
    const coords = [loc.lat, loc.lng];
    setFormData((prev) => ({
      ...prev,
      location: {
        lat: loc.lat,
        lng: loc.lng,
        address: loc.address || ''
      }
    }));
    setMarkerPos(coords);
    setMapCenter(coords);
    setFormattedAddress(loc.address || `Lat: ${loc.lat.toFixed(5)}, Lng: ${loc.lng.toFixed(5)}`);
  };

  // Called when user clicks directly on Leaflet map
  const handleMapClick = (loc) => {
    const coords = [loc.lat, loc.lng];
    setFormData((prev) => ({
      ...prev,
      location: {
        lat: loc.lat,
        lng: loc.lng,
        address: loc.address || ''
      }
    }));
    setMarkerPos(coords);
    setFormattedAddress(loc.address);
    toast.info('Location pinned on map!');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 5) {
      toast.error('Maximum 5 photos allowed in total');
      return;
    }

    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);
    const previews = newPhotos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const removePhoto = (index) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    const previews = updatedPhotos.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  // Bulletproof submit handler with full Base64, JSON & Auth token support
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.title.trim()) {
      toast.error('Please provide a title for the civic issue');
      return;
    }

    if (!formData.description || !formData.description.trim()) {
      toast.error('Please provide a detailed description');
      return;
    }

    if (!formData.category) {
      toast.error('Please select an issue category');
      return;
    }

    if (!formData.location || !formData.location.lat || !formData.location.lng) {
      toast.error('Please search or pin a location on the interactive map');
      return;
    }

    setLoading(true);

    try {
      // 1. Process any attached photos to Base64
      let processedPhotos = [];
      if (photos && photos.length > 0) {
        processedPhotos = await Promise.all(
          photos.map(async (file) => {
            try {
              return await fileToBase64(file);
            } catch (err) {
              return null;
            }
          })
        );
        processedPhotos = processedPhotos.filter(Boolean);
      }

      const latVal = parseFloat(formData.location.lat) || 22.7196;
      const lngVal = parseFloat(formData.location.lng) || 75.8577;
      const addressVal = formData.location.address || formattedAddress || 'SmartCity Municipal Area';

      // 2. Universal JSON Payload
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority || 'medium',
        latitude: latVal,
        longitude: lngVal,
        address: addressVal,
        location: {
          type: 'Point',
          coordinates: [lngVal, latVal],
          lat: latVal,
          lng: lngVal,
          address: addressVal
        },
        photos: processedPhotos
      };

      // 3. Resolve Auth Token & Headers
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      // 4. Resolve Dynamic API URL
      const getApiUrl = (endpoint) => {
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          return endpoint;
        }
        if (process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_URL.includes('localhost')) {
          const base = process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '');
          return `${base}${endpoint}`;
        }
        return endpoint;
      };

      console.log('[Submitting Civic Issue Payload]', {
        title: payload.title,
        category: payload.category,
        lat: latVal,
        lng: lngVal,
        photosCount: processedPhotos.length
      });

      const url = getApiUrl('/api/issues');
      let res;
      try {
        res = await axios.post(url, payload, { headers });
      } catch (postErr) {
        // Fallback directly to localhost:5000 if running locally and relative proxy failed
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          res = await axios.post('http://localhost:5000/api/issues', payload, { headers });
        } else {
          throw postErr;
        }
      }

      const createdRecord = res?.data?.data || res?.data?.issue || {
        id: Date.now(),
        ...payload,
        reporterName: user?.name || 'Citizen',
        reportedBy: user?.id,
        status: 'reported',
        createdAt: new Date().toISOString()
      };

      const userLocalKey = user?.id ? `smartcity_local_issues_${user.id}` : 'smartcity_local_issues';
      try {
        const existingUserLocal = JSON.parse(localStorage.getItem(userLocalKey) || '[]');
        const updatedUserLocal = [createdRecord, ...existingUserLocal.filter((i) => String(i.id) !== String(createdRecord.id))];
        localStorage.setItem(userLocalKey, JSON.stringify(updatedUserLocal));

        const existingGlobal = JSON.parse(localStorage.getItem('smartcity_local_issues') || '[]');
        const updatedGlobal = [createdRecord, ...existingGlobal.filter((i) => String(i.id) !== String(createdRecord.id))];
        localStorage.setItem('smartcity_local_issues', JSON.stringify(updatedGlobal));
      } catch (e) {
        console.warn('Local buffer save notice:', e.message);
      }

      if (res.data && res.data.duplicateWarning) {
        setDuplicateWarning(res.data.duplicateWarning);
        toast.warning('Similar issue already reported nearby!', { autoClose: 5000 });
      } else {
        toast.success('🎉 Official Civic Report generated successfully!');
        navigate(`/issues/${createdRecord.id}`, { state: { issue: createdRecord } });
      }
    } catch (error) {
      console.error('Issue submission error details:', error.response?.data || error.message);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to submit report. Please check required fields and try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
          🔒
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
        <p className="text-gray-600 text-sm mb-6">
          You must be logged in to report and track municipal civic issues.
        </p>
        <Link
          to="/login"
          className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          Sign In to Report Issue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 my-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report a Civic Issue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pin the exact location and submit evidence for automated department dispatch.
          </p>
        </div>
        <Link
          to="/citizen"
          className="text-xs font-semibold text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {duplicateWarning && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl">
          <div className="flex items-start">
            <span className="text-amber-500 text-xl mr-2">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-900">Potential Duplicate Detected</p>
              <p className="text-xs text-amber-700 mt-1">
                A similar issue was found nearby ({duplicateWarning.score}% similarity match). Existing: "
                {duplicateWarning.existingIssue?.title || 'Civic Issue'}". Your report has still been logged.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Issue Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Broken Water Main near Sector 4 Park, Deep Pothole on Main Ring Road"
            required
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm"
          />
        </div>

        {/* Category & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white transition-all shadow-sm"
            >
              <option value="">Select Department Category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Urgency / Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white transition-all shadow-sm"
            >
              {PRIORITIES.map((prio) => (
                <option key={prio.value} value={prio.value}>
                  {prio.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Detailed Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Describe the issue in detail (exact location landmark, hazards caused, duration)..."
            required
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all shadow-sm resize-none"
          />
        </div>

        {/* Location Search & Leaflet Interactive Map */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Location on Map <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-gray-400">
              Type address or click on map to pin location
            </span>
          </div>

          {/* Google Maps Style Autocomplete Search Component */}
          <SearchBar
            onLocationSelect={handleLocationSelect}
            initialValue={formattedAddress}
            placeholder="Type colony, landmark, street, pincode, or city name..."
            showGpsButton={true}
          />

          {/* Location Summary Badge */}
          {formattedAddress && (
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2.5">
              <span className="text-blue-600 text-base mt-0.5">📍</span>
              <div className="text-xs">
                <p className="font-semibold text-blue-950">{formattedAddress}</p>
                {formData.location && (
                  <p className="text-[11px] text-blue-700 font-mono mt-0.5">
                    Lat: {formData.location.lat.toFixed(5)}°, Lng: {formData.location.lng.toFixed(5)}°
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Leaflet Map Canvas */}
          <div className="h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapFlyTo center={mapCenter} />
              <MapClickHandler onMapClick={handleMapClick} markerPos={markerPos} />
            </MapContainer>
          </div>
        </div>

        {/* Photo Evidence Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Photo Evidence (Optional, max 5 images)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-blue-50/30"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="text-gray-500 space-y-1">
              <svg
                className="mx-auto h-9 w-9 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-xs font-semibold text-blue-600">
                Click to browse photo files from device
              </p>
              <p className="text-[11px] text-gray-400">PNG, JPG, WebP up to 10MB each</p>
            </div>
          </div>

          {/* Photo Previews */}
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
              {photoPreviews.map((src, index) => (
                <div key={index} className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-square">
                  <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(index);
                    }}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700 transition-colors opacity-90 group-hover:opacity-100"
                    title="Remove image"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Link
            to="/citizen"
            className="px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Submitting Report...</span>
              </>
            ) : (
              <span>Submit Issue Report →</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportForm;