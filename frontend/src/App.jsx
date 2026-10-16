import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ImageDetection from './pages/ImageDetection.jsx';
import VideoDetection from './pages/VideoDetection.jsx';
import LiveCamera from './pages/LiveCamera.jsx';
import History from './pages/History.jsx';
import Analytics from './pages/Analytics.jsx';
import About from './pages/About.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/image" element={<ImageDetection />} />
        <Route path="/video" element={<VideoDetection />} />
        <Route path="/camera" element={<LiveCamera />} />
        <Route path="/history" element={<History />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/about" element={<About />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
