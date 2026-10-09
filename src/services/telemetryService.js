// [IT23818620 - K.M.S.G.S.C. Karunanayake] - UC-02A: Monitor Live Animal Telemetry
// SOLID Principle: SRP - Centralizes all API calls related to telemetry.
import axios from 'axios';

const API_BASE_URL = 'http://localhost:7050/api/telemetry';

const getLiveTelemetry = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/live`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching live telemetry:', error);
    return { success: false, error: error.response?.data?.error || 'Network error' };
  }
};

const ingestTelemetry = async (telemetryData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/ingest`, telemetryData, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error('Error ingesting telemetry:', error);
      return { success: false, error: error.response?.data?.error || 'Network error' };
    }
  };

export default {
  getLiveTelemetry,
  ingestTelemetry
};
