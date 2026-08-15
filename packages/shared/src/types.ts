export type ServiceName = 'mongo' | 'redis' | 'qdrant';

export type ServiceCheck = {
  ok: boolean;
  latencyMs: number;
  detail?: string;
};

export type HealthSnapshot = {
  status: 'ok' | 'degraded';
  service: string;
  uptimeSec: number;
  checks: Record<ServiceName, ServiceCheck>;
};
