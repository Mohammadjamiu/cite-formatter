#!/usr/bin/env node
/**
 * cite-formatter CLI
 *
 * Usage:
 *   cite-formatter <input.md> <citations.json> [options]
 *
 * Options:
 *   -f, --format <name>          Citation format (apa, ieee, chicago, mla, vancouver, harvard)
 *   -o, --output <file>          Write to file (default: stdout)
 *   --on-missing <action>        What to do with missing ids: keep | remove | throw (default: keep)
 *   --bibtex                     Emit BibTeX for the citation pool instead
 *   --number-map <file>          Read a number map JSON from a previous run (for IEEE continuity)
 *   --write-number-map <file>    Write the resulting number map JSON to a file
 *   -h, --help                   Show this help
 *   -v, --version                Show version
 *
 * Exit codes:
 *   0  success
 *   1  invalid arguments
 *   2  input file read error
 *   3  compilation error
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { compileCitations, toBibtex, listFormats } from '../dist/index.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

function printHelp() {
  process.stdout.write(
    `cite-formatter v${version}\n\n` +
      `Compile [CITE:id] placeholders to APA, IEEE, Chicago, MLA, Vancouver, or Harvard.\n\n` +
      `Usage:\n  cite-formatter <input.md> <citations.json> [options]\n\n` +
      `Options:\n` +
      `  -f, --format <name>          Citation format (apa, ieee, chicago, mla, vancouver, harvard)\n` +
      `  -o, --output <file>          Write to file (default: stdout)\n` +
      `  --on-missing <action>        keep | remove | throw (default: keep)\n` +
      `  --bibtex                     Emit BibTeX for the citation pool instead\n` +
      `  --number-map <file>          Read number map JSON from a previous run\n` +
      `  --write-number-map <file>    Write resulting number map JSON\n` +
      `  -h, --help                   Show this help\n` +
      `  -v, --version                Show version\n\n` +
      `Built-in formats: ${listFormats().map((f) => f.id).join(', ')}\n`,
  );
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    input: null,
    citationsFile: null,
    format: 'apa',
    output: null,
    onMissing: 'keep',
    bibtex: false,
    numberMapFile: null,
    writeNumberMapFile: null,
    help: false,
    versionFlag: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '-v':
      case '--version':
        opts.versionFlag = true;
        break;
      case '-f':
      case '--format':
        opts.format = args[++i];
        break;
      case '-o':
      case '--output':
        opts.output = args[++i];
        break;
      case '--on-missing':
        opts.onMissing = args[++i];
        break;
      case '--bibtex':
        opts.bibtex = true;
        break;
      case '--number-map':
        opts.numberMapFile = args[++i];
        break;
      case '--write-number-map':
        opts.writeNumberMapFile = args[++i];
        break;
      default:
        if (!opts.input) opts.input = a;
        else if (!opts.citationsFile) opts.citationsFile = a;
        else throw new Error(`Unexpected argument: ${a}`);
    }
  }
  return opts;
}

function loadJson(path) {
  const full = resolve(process.cwd(), path);
  const text = readFileSync(full, 'utf8');
  return JSON.parse(text);
}

function readInput(path) {
  const full = resolve(process.cwd(), path);
  return readFileSync(full, 'utf8');
}

function writeOutput(path, content) {
  if (path === null) {
    process.stdout.write(content);
  } else {
    writeFileSync(resolve(process.cwd(), path), content, 'utf8');
  }
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n\n`);
    printHelp();
    process.exit(1);
  }

  if (opts.help) {
    printHelp();
    process.exit(0);
  }
  if (opts.versionFlag) {
    process.stdout.write(`${version}\n`);
    process.exit(0);
  }

  if (!opts.input || !opts.citationsFile) {
    process.stderr.write('Error: input file and citations file are required.\n\n');
    printHelp();
    process.exit(1);
  }

  let content, citations;
  try {
    content = readInput(opts.input);
    citations = loadJson(opts.citationsFile);
  } catch (e) {
    process.stderr.write(`Error reading input: ${e.message}\n`);
    process.exit(2);
  }

  if (opts.bibtex) {
    try {
      const out = toBibtex(citations);
      writeOutput(opts.output, out.endsWith('\n') ? out : out + '\n');
      process.exit(0);
    } catch (e) {
      process.stderr.write(`BibTeX conversion failed: ${e.message}\n`);
      process.exit(3);
    }
  }

  let numberMap;
  if (opts.numberMapFile) {
    try {
      const raw = loadJson(opts.numberMapFile);
      numberMap = new Map(Object.entries(raw));
    } catch (e) {
      process.stderr.write(`Error reading number map: ${e.message}\n`);
      process.exit(2);
    }
  }

  let result;
  try {
    result = compileCitations({
      content,
      citations,
      format: opts.format,
      numberMap,
      onMissing: opts.onMissing,
    });
  } catch (e) {
    process.stderr.write(`Compilation failed: ${e.message}\n`);
    process.exit(3);
  }

  const output = `${result.content}\n\n## References\n\n${result.references.join('\n\n')}\n`;
  writeOutput(opts.output, output);

  if (opts.writeNumberMapFile) {
    const obj = Object.fromEntries(result.numberMap);
    writeFileSync(resolve(process.cwd(), opts.writeNumberMapFile), JSON.stringify(obj, null, 2));
  }

  if (result.missingIds.length > 0) {
    process.stderr.write(
      `Warning: ${result.missingIds.length} missing citation id(s): ${result.missingIds.join(', ')}\n`,
    );
  }
}

main();
