import { useEffect, useState } from 'react';
import api from '@/services/api';

type HealthState = 'unknown' | 'healthy' | 'unhealthy' | 'error';

export default function HealthBadge() {
  const [state, setState] = useState<HealthState>('unknown');
  const [detail, setDetail] = useState<string>('');

  async function probe() {
    try {
      const res = await api.checkHealth();
      const ok = res?.status === 'healthy';
      setState(ok ? 'healthy' : 'unhealthy');
      setDetail(ok ? '' : 'backend reports unhealthy');
    } catch (e: any) {
      setState('error');
      setDetail(e?.message || 'health request failed');
    }
  }

  useEffect(() => {
    probe();
    const id = setInterval(() => probe(), 20000);
    return () => clearInterval(id);
  }, []);

  const color =
    state === 'healthy' ? 'bg-green-500' :
    state === 'unhealthy' ? 'bg-yellow-500' :
    state === 'error' ? 'bg-red-500' : 'bg-gray-400';

  const label =
    state === 'unknown' ? 'Checking…' :
    state === 'healthy' ? 'Healthy' :
    state === 'unhealthy' ? 'Unhealthy' : 'Error';

  return (
    <div
      title={detail}
      className="hidden md:flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground"
      aria-live="polite"
    >
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span>Backend: {label}</span>
    </div>
  );
}
