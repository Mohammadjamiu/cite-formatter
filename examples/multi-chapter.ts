/**
 * Multi-chapter IEEE — number citations continuously across chapters.
 * This is the bug the numberMap parameter exists to solve:
 * per-chapter numbering would silently restart [1] in each chapter.
 */
import { compileCitations, type Citation } from 'cite-formatter';

const citations: Citation[] = [
  { id: 'a', authors: ['Smith, J.'], year: 2020, title: 'A paper', journal: 'Journal of Things', volume: '5', pages: '10-20' },
  { id: 'b', authors: ['Jones, A.'], year: 2021, title: 'B paper', journal: 'Other Journal', volume: '1', pages: '1-9' },
  { id: 'c', authors: ['Doe, R.'], year: 2019, title: 'C paper', journal: 'Old Journal' },
];

const chapter1Content = 'A [CITE:a] and B [CITE:b] are foundational.';
const chapter2Content = 'We revisit A [CITE:a] and add C [CITE:c].';

const ch1 = compileCitations({
  content: chapter1Content,
  citations,
  format: 'ieee',
});

console.log('Chapter 1 content:', ch1.content);
console.log('Chapter 1 references:');
ch1.references.forEach((r) => console.log(' ', r));

const ch2 = compileCitations({
  content: chapter2Content,
  citations,
  format: 'ieee',
  numberMap: ch1.numberMap, // ← continues from chapter 1
});

console.log('\nChapter 2 content:', ch2.content);
console.log('Chapter 2 references:');
ch2.references.forEach((r) => console.log(' ', r));
