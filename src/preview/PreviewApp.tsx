import { useEffect, useState } from 'react';
import type { PreviewPayload } from '../shared/types';

export default function PreviewApp() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);

  useEffect(() => {
    return window.previewApi.onPreview(setPayload);
  }, []);

  if (!payload) {
    return (
      <div className="preview-shell">
        <div className="preview-card">
          <p className="preview-text">Загрузка перевода...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-shell">
      <div className="preview-card">
        <header className="preview-header">
          <span>{payload.title}</span>
          <button type="button" aria-label="Закрыть" onClick={() => window.previewApi.close()}>
            ×
          </button>
        </header>
        <p className="preview-text">{payload.text}</p>
      </div>
    </div>
  );
}
