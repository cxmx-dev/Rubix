import React from 'react';
import ReactDOM from 'react-dom/client';
import * as amplitude from '@amplitude/unified';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const amplitudeApiKey = import.meta.env.VITE_AMPLITUDE_API_KEY;
if (!amplitudeApiKey) {
  console.warn('Amplitude API key missing — analytics disabled');
} else {
  amplitude.initAll(amplitudeApiKey, {"analytics":{"autocapture":true},"sessionReplay":{"sampleRate":1}});
  amplitude.track('Viewed Home Page', { prompt_version: 'BA400.4' }); // helps improve this setup flow — safe to remove once you've verified the event lands
}
