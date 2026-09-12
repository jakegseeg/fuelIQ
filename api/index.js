const handler = require('./[...path].js');

module.exports = function apiHandler(req, res) {
  const url = new URL(req.url || '/api', 'http://localhost');
  const path = url.searchParams.get('path');

  if (path) {
    url.searchParams.delete('path');
    const query = url.searchParams.toString();
    req.url = `/api/${path}${query ? `?${query}` : ''}`;
  }

  return handler(req, res);
};
