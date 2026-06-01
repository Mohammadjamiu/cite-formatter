/**
 * BibTeX export.
 */
import { toBibtex, type Citation } from 'cite-formatter';

const citations: Citation[] = [
  {
    id: 'smith2020',
    authors: ['Smith, J. Q.'],
    year: 2020,
    title: 'A study of things',
    journal: 'Journal of Studies',
    volume: '12',
    pages: '34-56',
    doi: '10.1234/abc',
  },
  {
    id: 'doe2018',
    authors: ['Doe, J.'],
    year: 2018,
    title: 'A book',
    publisher: 'Big Press',
  },
];

console.log(toBibtex(citations));
