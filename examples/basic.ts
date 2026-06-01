/**
 * Basic usage — single chapter, APA format.
 */
import { compileCitations, type Citation } from 'cite-formatter';

const citations: Citation[] = [
  {
    id: 'smith2020',
    authors: ['Smith, J. Q.'],
    year: 2020,
    title: 'A study of things',
    journal: 'Journal of Studies',
    volume: '12',
    issue: '3',
    pages: '34-56',
    doi: '10.1234/abc',
  },
  {
    id: 'jones2021',
    authors: ['Jones, J. B.'],
    year: 2021,
    title: 'Another paper',
    journal: 'Reviews',
  },
];

const { content, references } = compileCitations({
  content: 'Studies show [CITE:smith2020] that this works [CITE:jones2021].',
  citations,
  format: 'apa',
});

console.log('--- Compiled content ---');
console.log(content);
console.log('\n--- References ---');
console.log(references.join('\n\n'));
