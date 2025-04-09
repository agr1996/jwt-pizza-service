const config = require('./config.js').metrics;
const os = require('os');

class Metrics {

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
  
  

  requestTracker = (req, res, next) => {
    const httpMethod = req.method.toLowerCase();
    const previousValue = this.requests[httpMethod] ?? 0;
    this.requests[httpMethod] = previousValue + 1;

    const dateNow = Date.now();
    if (req.user) {
      if (this.activeUsers.has(req.user.id)) {
        this.activeUsers.get(req.user.id).last = dateNow;
      }
    }

    let send = res.send;
    res.send = (resBody) => {
      this.requestLatency += Date.now() - dateNow;
      res.send = send;
      return res.send(resBody);
    };

    next();
  };

  sendMetricsPeriodically(period) {
    setInterval(() => {
      const cpuValue = this.getCpuUsagePercentage() + 7000
      console.log(cpuValue)
      this.sendMetricToGrafana('cpu', cpuValue, 'gauge', '%');


    }, period);

  }
}

module.exports = new Metrics();