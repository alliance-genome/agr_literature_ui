module.exports = {
  webpack: function (config) {
    return { ...config, ignoreWarnings: [/Failed to parse source map/] };
  },
  // d3 ships ES modules only, which Jest does not transform; its prebuilt UMD
  // bundle lets tests import components that draw with d3.
  jest: function (config) {
    return {
      ...config,
      moduleNameMapper: { ...config.moduleNameMapper, '^d3$': '<rootDir>/node_modules/d3/dist/d3.min.js' },
    };
  },
};
