/// <reference types="vite/client" />

declare module '*.mjs' {
  export function expectedChoice(q: unknown): string | null;
  export function assertQuestion(q: unknown): void;
  export function evalExpr(expr: string): number;
  export function figureToSvg(figure: unknown): string;
  export function choiceToSvg(choice: unknown): string;
}
