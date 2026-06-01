// Public re-exports for the format registry. The actual registry
// implementation lives in formats/index.ts so the built-in formats
// can seed it on first import.

export {
  registerFormat,
  unregisterFormat,
  getFormat,
  listFormats,
  resolveFormat,
} from './formats/index.js';
