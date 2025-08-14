const handleStartScan = async (website) => {
  setScanningWebsites(prev => new Set(prev).add(website.id));
  try {
    const scanResult = await scanning.startScan(website.id, {
      // you can add options like { maxPages: 10 } if your backend supports them
    });

    console.log('Scan created with ID:', scanResult.id);
    // Tell the parent (Dashboard) to reload stats/websites/scans
    if (typeof onScanStarted === 'function') onScanStarted();

    // Optional: show quick confirmation
    alert(`Scan started successfully! Scan ID: ${scanResult.id}`);
  } catch (err) {
    console.error('Scan start error:', err);
    alert('Failed to start scan: ' + err.message);
  } finally {
    setScanningWebsites(prev => {
      const s = new Set(prev);
      s.delete(website.id);
      return s;
    });
  }
};
