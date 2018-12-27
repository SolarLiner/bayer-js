module.exports = (api) => {
  api.cache(true);

  return {
    presets: [
      [
        '@babel/env',
        {
          targets: {
            node: '8'
          },
        },
      ],
      '@babel/preset-typescript',
      'minify'
    ],
    env: {
      build: {
        ignore: [
          '**/*.test.ts',
          '__snapshots__',
          '__tests__',
        ],
      },
    },
    ignore: ['node_modules'],
  };
};
