const config = require('./config.js').metrics;
const os = require('os');

class MetricsBuilder {
  constructor() {
    this.metrics = [];
  }

  addMetric(name, value, type, unit) {
    this.metrics.push({ name, value, type, unit });
  }

  sendToGrafana(url = config.url) {
    // Create the metric class
    const metric = {
      resourceMetrics: [
        {
          scopeMetrics: [
            {
              metrics: [],
            },
          ],
        },
      ],
    };

    // Add the metrics
    let innerMetrics = metric.resourceMetrics[0].scopeMetrics[0].metrics;
    let timeUnixNano = Date.now() * 1000000;
    for (let metric of this.metrics) {
      let metricObj = {
        name: metric.name,
        unit: metric.unit,
        [metric.type]: {
          dataPoints: [
            {
              asInt: Math.round(metric.value), // Convert to integer
              timeUnixNano: timeUnixNano
            }
          ]
        }
      };
      if (metric.type === 'sum') {
        metricObj['sum'].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
        metricObj['sum'].isMonotonic = true; 
      }
      innerMetrics.push(metricObj);
    }
    console.log(JSON.stringify(metric))

    // Send the metrics
    const body = JSON.stringify(metric);
    fetch(url, {
      method: 'POST',
      body: body,
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    })
    .then((response) => {
      if (!response.ok) {
        response.text().then((text) => {
          console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
        });
      } else {
        console.log(`Pushed metrics`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
  }
}

class Metrics {
  requests = {};
  activeUsers = {};

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return (cpuUsage * 100);
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return ((usedMemory / totalMemory) * 100).toFixed(2);
  }

    /*
  sendMetricToGrafana(metricName, metricValue, type, unit) {
    const metric = {
      resourceMetrics: [
        {
          scopeMetrics: [
            {
              metrics: [
                {
                  name: metricName,
                  unit: unit,
                  [type]: {
                    dataPoints: [
                      {
                        asInt: Math.round(metricValue), // Convert to integer
                        timeUnixNano: Date.now() * 1000000,
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    if (type === 'sum') {
      metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
      metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
    }

    const body = JSON.stringify(metric);
    console.log('Grafana URL:', config.url); // Debug log
    fetch(`${config.url}`, {
      method: 'POST',
      body: body,
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    })
      .then((response) => {
        if (!response.ok) {
          response.text().then((text) => {
            console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
          });
        } else {
          console.log(`Pushed ${metricName}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }
  */

  requestTracker = (req, res, next) => {
    next();
  };

  sendMetricsPeriodically(period) {
    setInterval(() => {
      let builder = new MetricsBuilder();
      const cpuValue = this.getCpuUsagePercentage() + 6000;
      console.log(cpuValue);
      builder.addMetric("cpu_1", cpuValue, 'gauge', '%');
      builder.addMetric("random", 20, 'gauge', '%');

      builder.sendToGrafana();
    }, period);
  }
}

module.exports = new Metrics();
