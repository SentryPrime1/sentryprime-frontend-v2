// src/components/ScanResults.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

export default function ScanResults({ scanId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [violations, setViolations] = useState([]);
  const [scanMeta, setScanMeta] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResponse, setAiResponse] = useState(null);

  useEffect(() => {
    console.log('ScanResults received scanId:', scanId);
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.scanning.getScanResults(scanId);
        if (!mounted) return;

        // res should be normalized to { violations: [] }
        setViolations(res.violations || []);
        setScanMeta({
          url: res.url || res.pageUrl || res.targetUrl || '',
          timestamp: res.timestamp || res.scan_date || res.createdAt || '',
          totals: {
            violations: (res.violations && res.violations.length) || 0,
          },
        });
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || 'Failed to load results');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [scanId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return violations;
    return violations.filter((v) => {
      const fields = [
        v.id,
        v.impact,
        v.help,
        v.description,
        v.helpUrl,
        ...(v?.nodes || []).flatMap((n) => [
          n.html,
          n.target?.join(' '),
          n.failureSummary
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return fields.includes(needle);
    });
  }, [violations, q]);

  const runAI = async () => {
    setAiLoading(true);
    setAiError('');
    setAiResponse(null);
    try {
      const resp = await api.scanning.getAIAnalysis(scanId);
      setAiResponse(resp);
    } catch (e) {
      setAiError(e.message || 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-sm"
          >
            ← Back
          </button>
        )}
        <h2 className="text-xl font-semibold">Scan Results</h2>
      </div>

      {scanMeta && (
        <div className="text-sm text-gray-600">
          <div><span className="font-medium">URL:</span> {scanMeta.url || 'Unknown'}</div>
          <div><span className="font-medium">When:</span> {scanMeta.timestamp ? new Date(scanMeta.timestamp).toLocaleString() : 'Unknown'}</div>
          <div><span className="font-medium">Total Violations:</span> {violations.length}</div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter by rule, impact, selector…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
        <button
          onClick={runAI}
          disabled={aiLoading}
          className="px-3 py-2 rounded-md bg-black text-white text-sm disabled:opacity-50"
        >
          {aiLoading ? 'Analyzing…' : 'AI Analysis'}
        </button>
      </div>

      {aiError && (
        <div className="p-3 border border-red-300 text-red-700 rounded-md text-sm">
          {aiError}
        </div>
      )}

      {aiResponse && (
        <div className="p-4 border rounded-md bg-gray-50">
          <h3 className="font-semibold mb-2">AI Guidance</h3>

          {/* Try to render nicely if the shape is recognizable, otherwise show raw JSON */}
          {Array.isArray(aiResponse?.prioritized_fixes) ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-700">{aiResponse.summary || ''}</div>
              <div>
                <div className="font-medium mb-1">Top Fixes:</div>
                <ul className="list-disc pl-6">
                  {aiResponse.prioritized_fixes.map((item, idx) => (
                    <li key={idx} className="text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(aiResponse, null, 2)}
            </pre>
          )}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-600">Loading results…</div>
      )}

      {error && !loading && (
        <div className="p-3 border border-red-300 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Rule</th>
                <th className="text-left p-2">Impact</th>
                <th className="text-left p-2">Help</th>
                <th className="text-left p-2">Nodes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-3 text-center text-gray-500">
                    No violations match your filter.
                  </td>
                </tr>
              )}
              {filtered.map((v, i) => (
                <tr key={`${v.id}-${i}`} className="border-t">
                  <td className="align-top p-2">
                    <div className="font-medium">{v.id}</div>
                    <div className="text-xs text-gray-500">{v.description}</div>
                    {v.helpUrl && (
                      <a
                        href={v.helpUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        Learn more
                      </a>
                    )}
                  </td>
                  <td className="align-top p-2">
                    <span className="inline-block px-2 py-1 rounded bg-gray-100">
                      {v.impact || 'n/a'}
                    </span>
                  </td>
                  <td className="align-top p-2">{v.help}</td>
                  <td className="align-top p-2">
                    <ul className="space-y-2">
                      {(v.nodes || []).map((n, ni) => (
                        <li key={ni} className="p-2 rounded border bg-white">
                          {n.target && (
                            <div className="text-xs text-gray-600 break-all">
                              <span className="font-medium">Target:</span>{' '}
                              {Array.isArray(n.target) ? n.target.join(', ') : n.target}
                            </div>
                          )}
                          {n.html && (
                            <pre className="mt-1 text-xs overflow-x-auto bg-gray-50 p-2 rounded">
                              {n.html}
                            </pre>
                          )}
                          {n.failureSummary && (
                            <div className="mt-1 text-xs">
                              <span className="font-medium">Why:</span> {n.failureSummary}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
