import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRedesign } from './AppRedesign';
import { installPreviewLongYinApi } from './previewMock';
import './redesign.css';

installPreviewLongYinApi();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppRedesign />
  </React.StrictMode>
);
