const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add a resolver to handle potential compatibility issues
config.resolver = {
  ...config.resolver,
  unstable_conditionNames: ['require', 'react-native', 'browser'],
};

// Override the default metro transformer to handle compatibility issues
config.transformer = {
  ...config.transformer,
  experimentalImportSupport: false,
  inlineRequires: true,
};

module.exports = config;