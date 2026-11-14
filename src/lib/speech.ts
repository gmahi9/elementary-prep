import type { Question } from '../types';

const letters = ['A', 'B', 'C', 'D', 'E'];

export function questionSpeech(question: Question): string {
  const parts: string[] = [];
  if (question.passageTitle) parts.push(question.passageTitle);
  if (question.passage) parts.push(question.passage);
  if (question.figure?.alt) parts.push(String(question.figure.alt));
  parts.push(question.prompt);
  if (question.scored) {
    parts.push('Choices.');
    question.choices.forEach((choice, index) => {
      parts.push(`${letters[index]}. ${choice}.`);
    });
  }
  return parts.join(' ');
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): boolean {
  if (!canSpeak()) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
