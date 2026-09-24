import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Targets from './pages/Targets';
import Credentials from './pages/Credentials';
import Scans from './pages/Scans';
import NewScan from './pages/NewScan';
import ScanForm from './pages/ScanForm';
import ScanDetail from './pages/ScanDetail';
import Schedules from './pages/Schedules';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import Assets from './pages/Assets';
import PortLists from './pages/PortLists';
import ScanConfigs from './pages/ScanConfigs';
import FeedStatus from './pages/FeedStatus';
import Trends from './pages/Trends';
import Alerts from './pages/Alerts';
import CveBrowser from './pages/CveBrowser';


export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/targets" element={<Targets />} />
        <Route path="/credentials" element={<Credentials />} />
        <Route path="/scans" element={<Scans />} />
        <Route path="/scans/new" element={<NewScan />} />
        <Route path="/scans/new/:template" element={<ScanForm />} />
        <Route path="/scans/:id" element={<ScanDetail />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/:id" element={<ReportDetail />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/port-lists" element={<PortLists />} />
        <Route path="/scan-configs" element={<ScanConfigs />} />
        <Route path="/feed-status" element={<FeedStatus />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/cve-browser" element={<CveBrowser />} />

      </Route>
    </Routes>
  );
}
