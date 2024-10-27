import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';
import { logger } from './logger';

const client = new CloudWatchClient({});
const BATCH_SIZE = 20;
const METRICS_BUFFER: MetricDatum[] = [];
let bufferTimeout: NodeJS.Timeout | null = null;

export const MetricsConfig = {
  enabled: process.env.ENABLE_METRICS === 'true',
  flushInterval: parseInt(process.env.METRICS_FLUSH_INTERVAL || '60000'),
  namespace: 'InstagramFollowerService',
};

export const Metrics = {
  async recordMetric(
    name: string,
    value: number,
    unit: 'Count' | 'Milliseconds' | 'Percent' = 'Count',
    dimensions?: Record<string, string>
  ): Promise<void> {
    if (!MetricsConfig.enabled) return;

    const metric: MetricDatum = {
      MetricName: name,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
      Dimensions: dimensions
        ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
        : undefined,
    };

    METRICS_BUFFER.push(metric);
    await this.scheduleFlush();
  },

  async flushMetrics(): Promise<void> {
    if (METRICS_BUFFER.length === 0) return;

    try {
      for (let i = 0; i < METRICS_BUFFER.length; i += BATCH_SIZE) {
        const batch = METRICS_BUFFER.slice(i, i + BATCH_SIZE);

        const command = new PutMetricDataCommand({
          Namespace: MetricsConfig.namespace,
          MetricData: batch,
        });

        await client.send(command);
      }

      METRICS_BUFFER.length = 0;
      logger.debug('Metrics flushed successfully');
    } catch (error) {
      logger.error('Failed to flush metrics:', { error });
    }
  },

  async scheduleFlush(): Promise<void> {
    if (bufferTimeout) return;

    bufferTimeout = setTimeout(() => {
      this.flushMetrics();
      bufferTimeout = null;
    }, MetricsConfig.flushInterval);
  },
};
