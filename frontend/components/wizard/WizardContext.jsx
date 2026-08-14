'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { validateAuthStep } from '../../lib/validators';

export const STEP_IDS = ['application', 'authentication', 'ai', 'discovery', 'preview', 'generate', 'download'];

export const STEPS = [
  { id: 'application', title: 'Application', subtitle: 'Your app & API details' },
  { id: 'authentication', title: 'Authentication', subtitle: 'How clients call your API' },
  { id: 'ai', title: 'AI Configuration', subtitle: 'Model provider settings' },
  { id: 'discovery', title: 'API Discovery', subtitle: 'Test & analyze your API' },
  { id: 'preview', title: 'Preview', subtitle: 'Review the generated plan' },
  { id: 'generate', title: 'Generate', subtitle: 'Build your integration' },
  { id: 'download', title: 'Download', subtitle: 'Get your project files' },
];

export const DEFAULT_DRAFT = {
  name: '',
  appUrl: '',
  apiBaseUrl: '',
  auth: {
    type: 'none',
    token: '',
    apiKeyHeader: 'x-api-key',
    headerName: 'x-auth-token',
    headerValue: '',
    username: '',
    basicPassword: '',
  },
  ai: { provider: 'groq', model: 'openai/gpt-oss-120b' },
};

/**
 * Wizard state + backend orchestration:
 * drafts live here, discovery/preview/generation results as well, so steps
 * stay presentational.
 */
const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [step, setStep] = useState(0);

  const [discovery, setDiscovery] = useState({ status: 'idle', result: null, error: null });
  const [endpoints, setEndpoints] = useState([]);
  const [preview, setPreview] = useState({ status: 'idle', result: null, error: null });
  const [generation, setGeneration] = useState({ status: 'idle', integrationId: null, job: null, project: null, error: null });
  const pollTimer = useRef(null);

  const updateDraft = useCallback((patch) => setDraft((prev) => ({ ...prev, ...patch })), []);
  const updateAuth = useCallback((patch) => setDraft((prev) => ({ ...prev, auth: { ...prev.auth, ...patch } })), []);
  const updateAi = useCallback((patch) => setDraft((prev) => ({ ...prev, ai: { ...prev.ai, ...patch } })), []);

  /** Transient auth payload - sent for live tests only, never persisted. */
  const transientAuth = useCallback(() => {
    const a = draft.auth;
    const payload = { authType: a.type };
    if (a.token) payload.token = a.token;
    if (a.apiKeyHeader) payload.apiKeyHeader = a.apiKeyHeader;
    if (a.headerName) payload.headerName = a.headerName;
    if (a.headerValue) payload.headerValue = a.headerValue;
    if (a.username) payload.username = a.username;
    if (a.basicPassword) payload.basicPassword = a.basicPassword;
    return payload;
  }, [draft.auth]);

  /** Non-secret auth metadata used for preview/generate. */
  const metaAuth = useCallback(() => {
    const a = draft.auth;
    return {
      type: a.type,
      headerName: a.headerName || undefined,
      apiKeyHeader: a.apiKeyHeader || undefined,
      username: a.username || undefined,
      configured: a.type === 'none' ? true : Boolean(a.token || a.headerValue || a.basicPassword),
    };
  }, [draft.auth]);

  const runDiscovery = useCallback(async () => {
    setDiscovery({ status: 'loading', result: null, error: null });
    try {
      const result = await apiFetch('/api/integrations/discover', {
        method: 'POST',
        body: {
          appUrl: draft.appUrl || undefined,
          apiBaseUrl: draft.apiBaseUrl,
          auth: transientAuth(),
        },
        timeoutMs: 60_000,
      });
      setDiscovery({ status: 'done', result, error: null });
      if (result.endpoints?.length) setEndpoints(result.endpoints);
      return result;
    } catch (err) {
      setDiscovery({ status: 'error', result: null, error: err.message });
      return null;
    }
  }, [draft.appUrl, draft.apiBaseUrl, transientAuth]);

  const runPreview = useCallback(async () => {
    setPreview({ status: 'loading', result: null, error: null });
    try {
      const result = await apiFetch('/api/integrations/preview', {
        method: 'POST',
        body: {
          name: draft.name,
          appUrl: draft.appUrl || undefined,
          apiBaseUrl: draft.apiBaseUrl,
          auth: metaAuth(),
          ai: draft.ai,
          endpoints,
        },
        timeoutMs: 30_000,
      });
      setPreview({ status: 'done', result, error: null });
      return result;
    } catch (err) {
      setPreview({ status: 'error', result: null, error: err.message });
      return null;
    }
  }, [draft.name, draft.appUrl, draft.apiBaseUrl, draft.ai, metaAuth, endpoints]);

  const startGeneration = useCallback(async () => {
    if (!preview.result) return;
    setGeneration({ status: 'starting', integrationId: null, job: null, project: null, error: null });
    try {
      const payload = {
        name: draft.name,
        appUrl: draft.appUrl || undefined,
        apiBaseUrl: draft.apiBaseUrl,
        auth: metaAuth(),
        ai: draft.ai,
        discovery: discovery.result,
        endpoints,
        tools: preview.result.tools,
      };
      const data = await apiFetch('/api/integrations/generate', { method: 'POST', body: payload, timeoutMs: 20_000 });
      setGeneration({ status: 'running', integrationId: data.integration._id, job: data.job, project: null, error: null });
    } catch (err) {
      setGeneration({ status: 'error', integrationId: null, job: null, project: null, error: err.message });
      return null;
    }
    return generation.integrationId;
  }, [preview.result, draft, discovery.result, endpoints, generation.integrationId]);

  // Poll the job while generation is running.
  useEffect(() => {
    if (generation.status !== 'running' || !generation.integrationId) return undefined;
    pollTimer.current = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/integrations/${generation.integrationId}/status`);
        setGeneration((prev) => ({ ...prev, job: data.job, project: data.project }));
        if (data.job?.status === 'completed') {
          setGeneration((prev) => ({ ...prev, status: 'done' }));
        } else if (data.job?.status === 'failed') {
          setGeneration((prev) => ({ ...prev, status: 'error', error: data.job.error || 'Generation failed' }));
        }
      } catch {
        /* transient network errors during polling are ignored */
      }
    }, 2000);
    return () => clearInterval(pollTimer.current);
  }, [generation.status, generation.integrationId]);

  const reset = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    setDraft(DEFAULT_DRAFT);
    setStep(0);
    setDiscovery({ status: 'idle', result: null, error: null });
    setEndpoints([]);
    setPreview({ status: 'idle', result: null, error: null });
    setGeneration({ status: 'idle', integrationId: null, job: null, project: null, error: null });
  }, []);

  const goToStep = useCallback((target) => setStep(Math.max(0, Math.min(STEP_IDS.length - 1, target))), []);

  const value = useMemo(
    () => ({
      draft, updateDraft, updateAuth, updateAi,
      step, goToStep,
      discovery, runDiscovery,
      endpoints, setEndpoints,
      preview, runPreview,
      generation, startGeneration,
      reset,
      transientAuth, metaAuth,
    }),
    [draft, updateDraft, updateAuth, updateAi, step, goToStep, discovery, runDiscovery, endpoints, preview, runPreview, generation, startGeneration, reset, transientAuth, metaAuth]
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) throw new Error('useWizard must be used inside WizardProvider');
  return context;
}

/** Step gating rules - which steps the user may advance to. */
export function stepAccess(wizard) {
  const { draft, discovery, preview, generation, endpoints } = wizard;
  const validApp = draft.apiBaseUrl.trim().length > 0 && draft.name.trim().length > 1;
  const validAuth = validateAuthStep(draft.auth);
  const discovered = discovery.status === 'done' && (discovery.result?.endpoints?.length > 0 || endpoints.length > 0);

  return {
    canEnter: [
      true, // application
      validApp, // authentication
      validApp && validAuth, // ai
      validApp && validAuth, // discovery
      discovered, // preview
      Boolean(preview.result), // generate
      generation.status === 'done', // download
    ],
  };
}