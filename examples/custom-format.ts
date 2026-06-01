/**
 * Custom format registration — e.g. a university's house style.
 */
import { compileCitations, registerFormat, type Citation, type FormatStrategy } from 'cite-formatter';

const houseStyle: FormatStrategy = {
  id: 'unilag-engineering',
  label: 'UNILAG Faculty of Engineering House Style',
  inText: (c) => `[Ref. ${c.authors[0]?.split(',')[0] ?? '?'} ${c.year}]`,
  reference: (c) => `${c.authors.join('; ')} (${c.year}). "${c.title}."`,
};

registerFormat(houseStyle);

const c: Citation = {
  id: 'smith2020',
  authors: ['Smith, J. Q.'],
  year: 2020,
  title: 'A study',
};

const { content, references } = compileCitations({
  content: 'As shown in [CITE:smith2020], this matters.',
  citations: [c],
  format: 'unilag-engineering',
});

console.log(content);
console.log(references.join('\n'));
