const config = require('./config.js');

class Logger {
  httpLogger = (req, res, next) => {
    let send = res.send;
    res.send = (resBody) => {
      const logData = {
        authorized: !!req.headers.authorization,
        path: `${req.hostname}${req.originalUrl}`,
        ip: req.ip,
        method: req.method,
        statusCode: res.statusCode,
        req: JSON.stringify(req.body),
        res: resBody,
      };
      const level = this.statusToLogLevel(res.statusCode);
      this.log(level, 'http', logData);
      res.send = send;
      return res.send(resBody);
    };
    next();
  };

  log(level, type, logData) {
    logData = this.sanitize(logData);
    const labels = { component: config.logging.source, level: level, type: type };
    const values = [this.nowString(), logData];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  sanitize(logData) {
    logData = JSON.stringify(logData);
    logData = logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\": \\"*****\\"');
    logData = logData.replace(/\\"token\\":\s*\\"[^"]*\\"/g, '\\"token\\": \\"*****\\"');
    return logData;
  }

  sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(`${config.logging.url}`, {
      method: 'POST',
      body: body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logging.apiKey}`,
      },
    })
      .then((res) => {
        return res.text().then(text => {
          try {
            const data = text ? JSON.parse(text) : {};
            return { status: res.status, statusText: res.statusText, body: data };
          } catch (error) {
            console.error('Error parsing response:', error);
            return { status: res.status, statusText: res.statusText, body: text };
          }
        });
      })
      .then((response) => {
        if (response.status >= 200 && response.status < 300) {
          console.log('Log successfully sent to Grafana:', response);
        } else {
          console.error('Failed to send log to Grafana:', response);
        }
      })
      .catch((error) => {
        console.error('Error pushing logs:', error);
      });
  }
}

module.exports = new Logger();
