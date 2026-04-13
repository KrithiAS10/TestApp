require('dotenv').config();

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const {
  BatchLogRecordProcessor,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} = require('@opentelemetry/sdk-logs');
const { logs, SeverityNumber } = require('@opentelemetry/api-logs');

let sdk = null;
let configuredServiceName = 'unknown-service';

function resolveOtlpBase() {
  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://127.0.0.1:4318';
  return base.replace(/\/$/, '');
}

function start(opts = {}) {
  if (process.env.OTEL_SDK_DISABLED === 'true') return;
  if (sdk) return;

  configuredServiceName =
    opts.serviceName || process.env.OTEL_SERVICE_NAME || 'unknown-service';

  const otlpBase = resolveOtlpBase();
  const tracesUrl =
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || `${otlpBase}/v1/traces`;
  const logsUrl =
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || `${otlpBase}/v1/logs`;

  const traceExporter = new OTLPTraceExporter({ url: tracesUrl });
  const otlpLogExporter = new OTLPLogExporter({ url: logsUrl });

  const logRecordProcessors = [new BatchLogRecordProcessor(otlpLogExporter)];
  if (process.env.OTEL_LOGS_TO_CONSOLE !== 'false') {
    logRecordProcessors.push(new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()));
  }

  sdk = new NodeSDK({
    serviceName: configuredServiceName,
    traceExporter,
    logRecordProcessors,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  const onShutdown = () => {
    shutdown().catch((err) => console.error('OpenTelemetry shutdown error:', err));
  };
  process.once('SIGTERM', onShutdown);
  process.once('SIGINT', onShutdown);
}

async function shutdown() {
  if (!sdk) return;
  const instance = sdk;
  sdk = null;
  await instance.shutdown();
}

const severityByName = {
  DEBUG: SeverityNumber.DEBUG,
  INFO: SeverityNumber.INFO,
  WARN: SeverityNumber.WARN,
  ERROR: SeverityNumber.ERROR,
};

function emitLog(severityText, body, attributes) {
  if (process.env.OTEL_SDK_DISABLED === 'true') {
    console.log(`[${severityText}]`, body, attributes || '');
    return;
  }
  if (!sdk) {
    console.log(`[${severityText}]`, body, attributes || '');
    return;
  }
  const logger = logs.getLogger(configuredServiceName, '1.0.0');
  const severityNumber = severityByName[severityText] ?? SeverityNumber.INFO;
  logger.emit({
    severityNumber,
    severityText,
    body,
    attributes: attributes || {},
  });
}

module.exports = { start, shutdown, emitLog };
