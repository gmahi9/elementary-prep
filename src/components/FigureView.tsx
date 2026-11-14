import { choiceToSvg, figureToSvg } from '../lib/figureSvg.mjs';

export function FigureView({ figure }: { figure: { kind: string; alt?: string } }) {
  const svg = figureToSvg(figure);
  if (!svg) return null;
  return (
    <div className="figure" role="img" aria-label={figure.alt || 'Practice figure'}>
      <span dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

export function ChoiceArt({ figure }: { figure: unknown }) {
  const svg = choiceToSvg(figure);
  if (!svg) return null;
  return <span className="choice-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
