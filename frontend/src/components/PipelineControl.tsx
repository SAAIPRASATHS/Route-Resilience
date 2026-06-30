import { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { fetchSatelliteImage, extractRoads, buildGraph } from '../api/client';

export function PipelineControl() {
  const {
    isLoading,
    setLoading,
    setSatelliteImageUrl,
    setRoadGeoJSON,
    addAlert,
  } = useMapStore();

  const [lat, setLat] = useState('11.0168');
  const [lon, setLon] = useState('76.9558');
  const [radius, setRadius] = useState(15);
  const [satelliteId, setSatelliteId] = useState<number | null>(null);
  const [predictionId, setPredictionId] = useState<number | null>(null);

  const handleFetchSatellite = async () => {
    setLoading(true, 'Acquiring Sentinel-2 satellite image via GEE...');
    try {
      const res = await fetchSatelliteImage({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        radius_km: radius,
      });
      setSatelliteId(res.id);
      setSatelliteImageUrl(res.thumbnail_url);
      addAlert(
        'satellite_update',
        `Acquired satellite composite over Coimbatore (${res.num_images} cloud-masked scenes used)`,
        'info'
      );
    } catch (err: any) {
      console.error(err);
      addAlert(
        'satellite_error',
        `Failed to fetch GEE imagery: ${err.response?.data?.detail || err.message}`,
        'critical'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExtractRoads = async () => {
    if (!satelliteId) return;
    setLoading(true, 'Executing SegFormer inference on Coimbatore AOI...');
    try {
      const res = await extractRoads({ image_id: satelliteId });
      setPredictionId(res.prediction_id);
      setRoadGeoJSON(res.mask_geojson);
      addAlert(
        'roads_extracted',
        `SegFormer identified ${res.num_road_segments} road features in Coimbatore imagery.`,
        'info'
      );
    } catch (err: any) {
      console.error(err);
      addAlert(
        'roads_error',
        `Road extraction failed: ${err.response?.data?.detail || err.message}`,
        'critical'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBuildGraph = async () => {
    if (!predictionId) return;
    setLoading(true, 'Skeletonizing road masks & creating routable NetworkX graph...');
    try {
      const res = await buildGraph(predictionId);
      addAlert(
        'graph_update',
        `Routable graph built successfully: ${res.num_nodes} intersections, ${res.num_edges} road links`,
        'info'
      );
    } catch (err: any) {
      console.error(err);
      addAlert(
        'graph_error',
        `Graph building failed: ${err.response?.data?.detail || err.message}`,
        'critical'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span className="card-icon">⚙️</span>
        Inference & Processing Pipeline
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label>Target Centre Coordinates (Coimbatore)</label>
          <div className="input-row">
            <input
              type="text"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Lat"
            />
            <input
              type="text"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="Lon"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label>Radius (km)</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            min={1}
            max={50}
          />
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <button
            onClick={handleFetchSatellite}
            className="btn btn-primary btn-full"
            disabled={isLoading}
          >
            1. Fetch Satellite Image (GEE)
          </button>

          <button
            onClick={handleExtractRoads}
            className="btn btn-success btn-full"
            disabled={isLoading || !satelliteId}
          >
            2. Extract Road Masks (SegFormer)
          </button>

          <button
            onClick={handleBuildGraph}
            className="btn btn-ghost btn-full"
            disabled={isLoading || !predictionId}
          >
            3. Build Routable Graph
          </button>
        </div>
      </div>
    </div>
  );
}
