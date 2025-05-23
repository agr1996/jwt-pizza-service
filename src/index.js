const app = require('./service.js');
const metrics = require('./metrics.js');

metrics.sendMetricsPeriodically(2000);

const port = process.argv[2] || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});