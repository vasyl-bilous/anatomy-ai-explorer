import { Route, Routes } from 'react-router-dom';

import { DrillDownPage } from './pages/DrillDownPage';
import { ExplorerPage } from './pages/ExplorerPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ExplorerPage />} />
      <Route path="/region/:id" element={<DrillDownPage />} />
    </Routes>
  );
}
