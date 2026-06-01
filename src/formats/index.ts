// All built-in formats and the runtime registry. See docs/UNDERSTANDING.md
// for the architecture and docs/INTEGRATION.md for the practical guide.

export { apaStrategy } from './apa.js';
export { ieeeStrategy } from './ieee.js';
export { chicagoStrategy } from './chicago.js';
export { mlaStrategy } from './mla.js';
export { vancouverStrategy } from './vancouver.js';
export { harvardStrategy } from './harvard.js';

import { apaStrategy } from './apa.js';
import { ieeeStrategy } from './ieee.js';
import { chicagoStrategy } from './chicago.js';
import { mlaStrategy } from './mla.js';
import { vancouverStrategy } from './vancouver.js';
import { harvardStrategy } from './harvard.js';
import type { FormatId, FormatStrategy } from '../types.js';

/** All built-in formats, indexed by id. */
export const builtInFormats: Record<string, FormatStrategy> = {
  apa: apaStrategy,
  ieee: ieeeStrategy,
  chicago: chicagoStrategy,
  mla: mlaStrategy,
  vancouver: vancouverStrategy,
  harvard: harvardStrategy,
};

/** Built-in format ids — protected from unregister. */
const BUILT_IN_IDS = new Set(Object.keys(builtInFormats));

/** Runtime registry. Pre-populated with built-ins; add customs via registerFormat. */
const registry: Map<string, FormatStrategy> = new Map(Object.entries(builtInFormats));

/**
 * Add a custom format to the runtime registry.
 * Throws if the id is empty, or if a format with that id is already registered.
 */
export function registerFormat(strategy: FormatStrategy): void {
  if (!strategy.id) {
    throw new Error('A format strategy must have a non-empty `id`.');
  }
  if (registry.has(strategy.id)) {
    throw new Error(
      `Format "${strategy.id}" is already registered. ` +
        `Call unregisterFormat("${strategy.id}") first to override.`,
    );
  }
  registry.set(strategy.id, strategy);
}

/**
 * Remove a custom format from the runtime registry. Built-in formats
 * cannot be removed — calling unregisterFormat with a built-in id throws.
 *
 * @returns true if a format was removed, false if no such id was registered.
 */
export function unregisterFormat(id: FormatId): boolean {
  if (BUILT_IN_IDS.has(id)) {
    throw new Error(`Cannot unregister built-in format "${id}".`);
  }
  return registry.delete(id);
}

/**
 * Look up a registered format by id. Returns undefined if no format
 * with that id has been registered.
 */
export function getFormat(id: FormatId): FormatStrategy | undefined {
  return registry.get(id);
}

/**
 * List every registered format (built-ins + customs).
 * Useful for building a format-picker UI in your app.
 */
export function listFormats(): FormatStrategy[] {
  return Array.from(registry.values());
}

/**
 * Resolve a format from a string id (built-in or registered) or pass
 * through a custom FormatStrategy. Throws if the id is not registered.
 */
export function resolveFormat(format: FormatId | FormatStrategy): FormatStrategy {
  if (typeof format !== 'string') return format;
  const found = registry.get(format.toLowerCase());
  if (!found) {
    throw new Error(
      `Unknown format "${format}". Use listFormats() to see available ids, ` +
        `or registerFormat() to add a custom one.`,
    );
  }
  return found;
}
