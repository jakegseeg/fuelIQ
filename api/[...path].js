let appPromise;

module.exports = async function handler(req, res) {
  appPromise ??= import('../server/dist/app.js').then(async (mod) => {
    await mod.prepareApp();
    return mod.default;
  });

  const app = await appPromise;
  return app(req, res);
};
