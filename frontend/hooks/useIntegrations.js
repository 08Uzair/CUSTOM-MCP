'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';

/**
 * Polls an integration's generation status until it reaches a terminal
 * state (completed / failed). Used by the wizard's Generate step.
 */
export function useGenerationStatus(integrationId, { interval = 2000, enabled = true } = {}) {
  const [status, setStatus] = useState({ loading: Boolean(integrationId), job: null, project: null, error: null });
  const timerRef = useRef(null);
  const [done, setDone] = useState(false);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (!integrationId || !enabled) return undefined;

    const tick = async () => {
      try {
        const data = await apiFetch(`/api/integrations/${integrationId}/status`);
        setStatus({ loading: false, job: data.job, project: data.project, error: null });
        if (data.job?.status === 'completed' || data.job?.status === 'failed') {
          setDone(true);
          stop();
        }
      } catch (err) {
        setStatus((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    };

    tick();
    timerRef.current = setInterval(tick, interval);
    return stop;
  }, [integrationId, interval, enabled, stop]);

  const progress = status.job
    ? Math.round(
        ((status.job.steps || []).filter((s) => s.status === 'completed').length /
          Math.max((status.job.steps || []).length, 1)) *
          100
      )
    : 0;

  return { ...status, progress, done };
}

/**
 * Loads an integration once, with an optional poll interval for detail pages.
 */
export function useIntegration(id, { pollInterval = 0 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    let timer = null;

    const load = () => {
      apiFetch(`/api/integrations/${id}`)
        .then((d) => active && (setData(d), setError(null), setLoading(false)))
        .catch((err) => active && (setError(err.message), setLoading(false)));
    };

    load();
    if (pollInterval > 0) timer = setInterval(load, pollInterval);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [id, pollInterval]);

  return { data, error, loading };
}