import type { GradeNumber, SectionId } from './types';

export interface SectionInfo {
  id: SectionId;
  label: string;
  hint: string;
  tips: string[];
}

export const sections: SectionInfo[] = [
  {
    id: 'cogat',
    label: 'CogAT',
    hint: 'Reasoning',
    tips: [
      'Say the pattern out loud before you tap an answer.',
      'For analogies, ask how the first two words go together.',
      'Cover the choices and make your own guess first.',
    ],
  },
  {
    id: 'iready',
    label: 'i-Ready',
    hint: 'Math',
    tips: [
      'Estimate first. Does the answer make sense?',
      'In a word problem, find what you know and what is asked.',
      'A quick picture or number line is a smart tool.',
    ],
  },
  {
    id: 'map',
    label: 'MAP',
    hint: 'Reading',
    tips: [
      'Read the passage, then the question, then look back.',
      'The best answer is supported by the text.',
      'For a new word, try each meaning in the sentence.',
    ],
  },
  {
    id: 'torrance',
    label: 'Torrance',
    hint: 'Creative',
    tips: [
      'There is no single right answer. List many ideas.',
      'Try different kinds of ideas, not copies of one idea.',
      'Add details to the idea you like best.',
    ],
  },
];

export const grades: { id: GradeNumber; label: string }[] = [
  { id: 0, label: 'K' },
  { id: 1, label: '1' },
  { id: 2, label: '2' },
  { id: 3, label: '3' },
  { id: 4, label: '4' },
  { id: 5, label: '5' },
];

export function gradeShort(grade: GradeNumber): string {
  return grade === 0 ? 'K' : String(grade);
}
