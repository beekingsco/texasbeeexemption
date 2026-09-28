import { register } from 'node:module';

register('./ts-test-loader.mjs', {
  parentURL: import.meta.url,
});
