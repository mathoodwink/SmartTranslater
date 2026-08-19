import React from 'react';
import ReactDOM from 'react-dom/client';
import PreviewApp from './PreviewApp';
import './preview.css';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <PreviewApp />
  </React.StrictMode>,
);
