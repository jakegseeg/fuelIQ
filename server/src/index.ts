import app, { prepareApp } from './app.js';

const PORT = Number(process.env.PORT) || 4000;

await prepareApp();

app.listen(PORT, () => {
  console.log(`FuelIQ API listening on http://localhost:${PORT}`);
});
