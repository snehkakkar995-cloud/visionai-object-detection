import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const http = axios.create({ baseURL: `${API_URL}/api`, timeout: 120000 });

/** Turn any axios error into a message that is safe and useful to show to the user. */
export function errorMessage(err) {
  if (axios.isCancel?.(err)) return 'Request cancelled.';
  if (err?.code === 'ERR_NETWORK' || (!err?.response && err?.request)) {
    return `Cannot reach the backend at ${API_URL}. Make sure the FastAPI server is running.`;
  }
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || String(d)).join('; ');
  if (err?.code === 'ECONNABORTED') return 'The request timed out.';
  return err?.message || 'Something went wrong.';
}

/** Absolute URL for a backend output path such as /api/outputs/abc.jpg */
export const fileUrl = (path, download = false) =>
  path ? `${API_URL}${path}${download ? '?download=1' : ''}` : null;

const form = (obj) => {
  const f = new FormData();
  Object.entries(obj).forEach(([k, v]) => v !== undefined && v !== null && f.append(k, v));
  return f;
};

export const getHealth = () => http.get('/health').then((r) => r.data);
export const getModelStatus = () => http.get('/model/status').then((r) => r.data);
export const reloadModel = () => http.post('/model/reload').then((r) => r.data);
export const getLimits = () => http.get('/limits').then((r) => r.data);
export const getSettings = () => http.get('/settings').then((r) => r.data);
export const saveSettings = (s) => http.put('/settings', s).then((r) => r.data);

export const detectImage = (file, { confidence, iou }, onUploadProgress) =>
  http
    .post('/detect/image', form({ file, confidence, iou }), { onUploadProgress })
    .then((r) => r.data);

export const detectFrame = (blob, { confidence, iou }, signal) =>
  http
    .post('/detect/frame', form({ file: new File([blob], 'frame.jpg', { type: 'image/jpeg' }), confidence, iou }), {
      signal,
      timeout: 15000,
    })
    .then((r) => r.data);

export const startVideo = (file, { confidence, iou, frame_stride }, onUploadProgress) =>
  http
    .post('/detect/video', form({ file, confidence, iou, frame_stride }), {
      onUploadProgress,
      timeout: 0,
    })
    .then((r) => r.data);

export const getVideoJob = (id) => http.get(`/detect/video/${id}`).then((r) => r.data);

export const getHistory = (params) => http.get('/history', { params }).then((r) => r.data);
export const getDetection = (id) => http.get(`/history/${id}`).then((r) => r.data);
export const deleteDetection = (id) => http.delete(`/history/${id}`);
export const clearHistory = () => http.delete('/history').then((r) => r.data);
export const getAnalytics = () => http.get('/analytics/summary').then((r) => r.data);
