const result = await Bun.build({
  entrypoints: ['./src/main.ts'],
  outdir: './dist',
  target: 'bun',
  bytecode: true,
  minify: true,
  external: [
    '@nestjs/microservices',
    '@nestjs/websockets/socket-module',
    '@nestjs/microservices/microservices-module',
    'class-transformer/storage',
    'class-validator',
    '@nestjs/common',
    '@nestjs/core',
    'fastify',
    'class-transformer'
  ],
});

if (!result.success) {
  console.error('Build failed');
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log('Build successful');
