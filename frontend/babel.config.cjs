module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current',
      },
      modules: 'auto',
    }],
    ['@babel/preset-react', {
      runtime: 'automatic',
      importSource: 'react',
    }],
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
  ],
};