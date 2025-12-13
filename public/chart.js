// Chart.js CDN loader for Vite
// Use this file to load Chart.js from CDN if not installed via npm
export async function loadChartJs() {
  if (!window.Chart) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.async = true;
    document.head.appendChild(script);
    await new Promise(resolve => {
      script.onload = resolve;
    });
  }
}
