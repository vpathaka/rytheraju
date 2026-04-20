const { cors } = require('./_auth');
module.exports = (req, res) => {
  cors(res);
  res.json({ status:'ok', service:'Rytheraju API', version:'1.0.0', timestamp: new Date().toISOString() });
};
