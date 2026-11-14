import { PASSAGES, passageText } from './passages.mjs';
import {
  choiceSet,
  hash,
  nameAt,
  numericChoices,
  rngFrom,
  seal,
  sealCreative,
  shuffle,
  skillFields,
} from './util.mjs';
import {
  TABLES,
  addClock,
  cellLabel,
  comparePhrase,
  elapsedMinutes,
  evalExpr,
  expandedForm,
  foldChoiceLabel,
  foldHoles,
  formatMoney,
  formatTime,
  matrixAnswerCell,
  matrixCells,
  placeDigit,
  reduceFraction,
  roundNumber,
  seriesNext,
} from '../../src/lib/verify.mjs';

const COLORS = [
  ['blue', '#2f6fed'],
  ['red', '#e23b3b'],
  ['gold', '#c98404'],
  ['green', '#1f9d57'],
  ['purple', '#7a45d6'],
  ['orange', '#ef7b2d'],
];
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hex'];
const SIZES = ['small', 'medium', 'large'];

function fractionDistractors(num, den, correct) {
  const pool = [
    `${den}/${Math.max(num, 1)}`,
    `${Math.max(1, num - 1)}/${den}`,
    `${num}/${den + 1}`,
    `1/${den}`,
    `${num + 1}/${den}`,
    `${den}/${den}`,
    `${num}/${Math.max(1, den - 1)}`,
    '1/1',
  ];
  const unique = [...new Set(pool)].filter((item) => item !== correct && !item.includes('/0'));
  if (unique.length < 3) throw new Error(`Not enough fraction distractors for ${correct}`);
  return unique.slice(0, 3);
}

function cell(shape, color, size = 'medium', count = 1, rotation = 0) {
  return { shape, colorName: color[0], color: color[1], size, count, rotation };
}

function rngFor(prompt) {
  return rngFrom(hash(prompt));
}

function cap(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function explainAdd(a, b) {
  const places = ['ones', 'tens', 'hundreds', 'thousands'];
  let carry = 0;
  const bits = [`Add ${a} and ${b}, starting at the ones.`];
  const width = Math.max(String(a).length, String(b).length, 1);
  for (let i = 0; i < width; i += 1) {
    const da = Math.floor(a / 10 ** i) % 10;
    const db = Math.floor(b / 10 ** i) % 10;
    const sum = da + db + carry;
    const write = sum % 10;
    const next = Math.floor(sum / 10);
    const carried = carry ? ` + ${carry} carried` : '';
    if (next) bits.push(`${cap(places[i])}: ${da} + ${db}${carried} = ${sum}. Write ${write} and carry ${next}.`);
    else bits.push(`${cap(places[i])}: ${da} + ${db}${carried} = ${sum}.`);
    carry = next;
  }
  if (carry) bits.push(`The leftover carry is ${carry} in the next place.`);
  bits.push(`The sum is ${a + b}.`);
  return bits.join(' ');
}

function explainSub(a, b) {
  const places = ['ones', 'tens', 'hundreds', 'thousands'];
  const digits = String(a).padStart(4, '0').split('').map(Number);
  const sub = String(b).padStart(4, '0').split('').map(Number);
  const bits = [`Subtract ${b} from ${a}, starting at the ones.`];
  for (let i = 3; i >= 0; i -= 1) {
    const place = places[3 - i];
    if (digits[i] < sub[i]) {
      let j = i - 1;
      while (j >= 0 && digits[j] === 0) {
        digits[j] = 9;
        j -= 1;
      }
      digits[j] -= 1;
      digits[i] += 10;
      bits.push(`${cap(place)}: borrow so ${digits[i]} - ${sub[i]} = ${digits[i] - sub[i]}.`);
    } else if (digits[i] !== 0 || sub[i] !== 0) {
      bits.push(`${cap(place)}: ${digits[i]} - ${sub[i]} = ${digits[i] - sub[i]}.`);
    }
    digits[i] -= sub[i];
  }
  bits.push(`${b} + ${a - b} = ${a}, so the difference is ${a - b}.`);
  return bits.join(' ');
}

function explainMul(a, b) {
  if (a === 0 || b === 0) return `${a} × ${b} = 0 because a factor is 0. Zero groups, or groups of zero, make 0.`;
  if (a === 1) return `1 group of ${b} is ${b}. So ${a} × ${b} = ${b}.`;
  if (b === 1) return `${a} groups of 1 is ${a}. So ${a} × ${b} = ${a}.`;
  const seq = [];
  const groups = a <= 12 ? a : b;
  const size = a <= 12 ? b : a;
  for (let i = 1; i <= groups; i += 1) seq.push(String(size * i));
  return `${a} × ${b} means ${groups} groups of ${size}. Skip count: ${seq.join(', ')}. The product is ${a * b}.`;
}

function explainDiv(total, divisor) {
  const quotient = total / divisor;
  if (total === 0) return `0 ÷ ${divisor} = 0 because there is nothing to put into the groups.`;
  const seq = [];
  for (let i = 1; i <= quotient; i += 1) seq.push(String(divisor * i));
  return `${total} ÷ ${divisor} asks how many groups of ${divisor} are in ${total}. Count by ${divisor}: ${seq.join(', ')}. That is ${quotient} groups.`;
}

function explainRound(n, nearest) {
  const answer = roundNumber(n, nearest);
  if (n % nearest === 0) return `${n} is already a multiple of ${nearest}, so it rounds to ${answer}.`;
  const lower = Math.floor(n / nearest) * nearest;
  const upper = lower + nearest;
  let why;
  if (n - lower < upper - n) why = `${n} is closer to ${lower} than to ${upper}.`;
  else if (upper - n < n - lower) why = `${n} is closer to ${upper} than to ${lower}.`;
  else why = `${n} is exactly halfway between ${lower} and ${upper}, and halfway rounds up.`;
  return `To round ${n} to the nearest ${nearest}, compare it with ${lower} and ${upper}. ${why} ${n} rounds to ${answer}.`;
}

function push(list, partial) {
  list.push(seal(partial));
}

export function buildBank() {
  const questions = [
    ...buildSeries(),
    ...buildPuzzles(),
    ...buildNumMaps(),
    ...buildMatrices(),
    ...buildFolds(),
    ...buildClassify(),
    ...buildPlace(),
    ...buildAddSub(),
    ...buildFacts(),
    ...buildStories(),
    ...buildFractions(),
    ...buildMeasure(),
    ...buildTime(),
    ...buildMoney(),
    ...buildArea(),
    ...buildGeometry(),
    ...buildData(),
    ...buildReading(),
    ...buildGrammar(),
    ...buildCreative(),
  ];
  return questions;
}

function buildSeries() {
  const made = [];
  const seen = new Set();
  const addSpec = (verify) => {
    const key = `${verify.op}:${verify.terms.join(',')}`;
    if (seen.has(key)) return;
    const next = seriesNext(verify);
    if (next < 0 || next > 400) return;
    seen.add(key);
    const prompt = `What number comes next? ${verify.terms.join(', ')}, ____`;
    const step = verify.terms[1] - verify.terms[0];
    const explanation = explainSeries(verify, next);
    push(made, {
      prefix: 'ns',
      section: 'cogat',
      topic: 'number-series',
      topicLabel: 'Number series',
      prompt,
      choices: numericChoices(next, [next + step, next - step, next + 1, verify.terms[0], next * 2], rngFor(prompt)),
      explanation,
      difficulty: verify.op === 'add' || verify.op === 'sub' ? 1 : verify.op === 'mul' ? 2 : 3,
      verify,
      ...skillFields('3.OA.D.9'),
    });
  };
  for (let start = 2; start <= 28 && made.length < 18; start += 3) {
    for (const step of [2, 3, 4, 5, 10]) {
      const terms = [start];
      for (let i = 0; i < 4; i += 1) terms.push(terms.at(-1) + step);
      addSpec({ kind: 'series', op: 'add', terms });
      if (made.length >= 18) break;
    }
  }
  for (let start = 40; start <= 120 && made.filter((q) => q.verify.op === 'sub').length < 12; start += 7) {
    for (const step of [2, 3, 4, 5]) {
      const terms = [start];
      for (let i = 0; i < 4; i += 1) terms.push(terms.at(-1) - step);
      if (terms.at(-1) > 0) addSpec({ kind: 'series', op: 'sub', terms });
    }
  }
  const muls = [[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [2, 5], [3, 5]];
  for (const [start, ratio] of muls) {
    const terms = [start];
    for (let i = 0; i < 3; i += 1) terms.push(terms.at(-1) * ratio);
    if (terms.at(-1) * ratio <= 400) addSpec({ kind: 'series', op: 'mul', terms });
  }
  for (let start = 1; start <= 12; start += 2) {
    for (const first of [2, 3, 4]) {
      const terms = [start];
      let diff = first;
      for (let i = 0; i < 4; i += 1) {
        terms.push(terms.at(-1) + diff);
        diff += 1;
      }
      addSpec({ kind: 'series', op: 'add-grow', terms });
    }
  }
  for (let start = 3; start <= 20; start += 4) {
    for (const [s0, s1] of [[1, 10], [2, 8], [5, 1], [3, 10], [4, 2]]) {
      const terms = [start];
      for (let i = 0; i < 4; i += 1) terms.push(terms.at(-1) + (i % 2 === 0 ? s0 : s1));
      addSpec({ kind: 'series', op: 'alt-add', terms });
    }
  }
  return made.slice(0, 56);
}

function explainSeries(verify, next) {
  const terms = verify.terms;
  if (verify.op === 'add') {
    const step = terms[1] - terms[0];
    return `Each number is ${step} more than the one before it. ${terms.at(-1)} + ${step} = ${next}. The next number is ${next}.`;
  }
  if (verify.op === 'sub') {
    const step = terms[0] - terms[1];
    return `Each number is ${step} less than the one before it. ${terms.at(-1)} - ${step} = ${next}. The next number is ${next}.`;
  }
  if (verify.op === 'mul') {
    const ratio = terms[1] / terms[0];
    return `Each number is multiplied by ${ratio}. ${terms.at(-1)} × ${ratio} = ${next}. The next number is ${next}.`;
  }
  if (verify.op === 'add-grow') {
    const first = terms[1] - terms[0];
    const diffs = [];
    for (let i = 1; i < terms.length; i += 1) diffs.push(terms[i] - terms[i - 1]);
    const nextDiff = diffs.at(-1) + 1;
    return `The jumps grow by 1 each time: ${diffs.join(', ')}. The next jump is ${nextDiff}. ${terms.at(-1)} + ${nextDiff} = ${next}.`;
  }
  const s0 = terms[1] - terms[0];
  const s1 = terms[2] - terms[1];
  return `The pattern takes turns. First add ${s0}, then add ${s1}, and then repeat. After ${terms.at(-1)}, the next jump gives ${next}.`;
}

function buildPuzzles() {
  const made = [];
  const facts = [];
  for (let a = 2; a <= 10; a += 1) {
    for (let b = 2; b <= 10; b += 1) facts.push([a, b, a * b]);
  }
  facts.slice(0, 24).forEach(([a, b, product], index) => {
    const name = nameAt(index);
    const prompt = `${name} thinks of a number. The number times ${b} is ${product}. What is the number?`;
    push(made, {
      prefix: 'np',
      section: 'cogat',
      topic: 'number-puzzles',
      topicLabel: 'Number puzzles',
      prompt,
      choices: numericChoices(a, [b, product, a + 1, a - 1, product - b], rngFor(prompt)),
      explanation: `The puzzle is □ × ${b} = ${product}. ${explainDiv(product, b)} The missing number is ${a}.`,
      difficulty: product <= 30 ? 1 : 2,
      verify: { kind: 'expr', expr: `${product}/${b}` },
      ...skillFields('3.OA.A.4'),
    });
  });
  for (let i = 0; i < 16; i += 1) {
    const a = 20 + i * 7;
    const b = 15 + (i % 5) * 6;
    const sum = a + b;
    const prompt = `What number makes this true? ${a} + □ = ${sum}`;
    push(made, {
      prefix: 'np',
      section: 'cogat',
      topic: 'number-puzzles',
      topicLabel: 'Number puzzles',
      prompt,
      choices: numericChoices(b, [a, sum, b + 10, b - 1], rngFor(prompt)),
      explanation: `The box is the missing part of an addition. ${sum} - ${a} = ${b}. ${explainSub(sum, a)}`,
      difficulty: 1,
      verify: { kind: 'expr', expr: `${sum}-${a}` },
      ...skillFields('3.OA.A.4'),
    });
  }
  for (let i = 0; i < 16; i += 1) {
    const whole = 40 + i * 9;
    const part = 12 + (i % 6) * 4;
    const prompt = `What number makes this true? □ - ${part} = ${whole - part}`;
    const answer = whole;
    push(made, {
      prefix: 'np',
      section: 'cogat',
      topic: 'number-puzzles',
      topicLabel: 'Number puzzles',
      prompt,
      choices: numericChoices(answer, [part, whole - part, answer - 10, answer + part], rngFor(prompt)),
      explanation: `If you subtract ${part} and land on ${whole - part}, add ${part} back. ${explainAdd(whole - part, part)}`,
      difficulty: 2,
      verify: { kind: 'expr', expr: `${whole - part}+${part}` },
      ...skillFields('3.OA.D.8'),
    });
  }
  return made;
}

function buildNumMaps() {
  const made = [];
  const plans = [];
  for (let k = 2; k <= 9; k += 1) {
    plans.push(['mul', k, [2, 3, 4], 6]);
    plans.push(['mul', k, [2, 5, 7], 8]);
  }
  for (let k = 2; k <= 12; k += 1) {
    plans.push(['add', k, [3, 6, 9], 12]);
    plans.push(['add', k, [4, 8, 11], 15]);
  }
  for (let k = 2; k <= 9; k += 1) {
    plans.push(['sub', k, [12, 15, 18], 20]);
    plans.push(['sub', k, [11, 14, 17], 21]);
  }
  for (const [op, k, shown, ask] of plans) {
    const map = (input) => (op === 'mul' ? input * k : op === 'add' ? input + k : input - k);
    if (shown.some((input) => map(input) <= 0) || map(ask) <= 0 || map(ask) > 160) continue;
    const pairs = shown.map((input) => [input, map(input)]);
    const output = map(ask);
    const prompt = `${pairs.map(([left, right]) => `${left} goes to ${right}`).join(', ')}. What does ${ask} go to if the same rule is used?`;
    const word = op === 'mul' ? `multiplied by ${k}` : op === 'add' ? `increased by ${k}` : `decreased by ${k}`;
    push(made, {
      prefix: 'na',
      section: 'cogat',
      topic: 'number-analogies',
      topicLabel: 'Number analogies',
      prompt,
      choices: numericChoices(output, [ask + k + 1, ask, output + k, Math.abs(output - k), output + 2], rngFor(prompt)),
      explanation: `The first pair shows the rule: ${pairs[0][0]} goes to ${pairs[0][1]}, so each number is ${word}. ${pairs[1][0]} goes to ${pairs[1][1]}, which matches. ${ask} goes to ${output}.`,
      difficulty: op === 'add' ? 1 : 2,
      verify: { kind: 'num-map', op, k, input: ask, pairs },
      ...skillFields('3.OA.D.9'),
    });
  }
  return made;
}

function buildMatrices() {
  const made = [];
  for (let i = 0; i < SHAPES.length; i += 1) {
    for (let c = 0; c < COLORS.length; c += 2) {
      const verify = {
        kind: 'matrix',
        rule: 'col-shape-row-color',
        shapes: [SHAPES[i], SHAPES[(i + 2) % SHAPES.length]],
        colorNames: [COLORS[c][0], COLORS[(c + 1) % COLORS.length][0]],
        colors: [COLORS[c][1], COLORS[(c + 1) % COLORS.length][1]],
      };
      const question = matrixQuestion(verify, 1);
      if (question) made.push(question);
      if (made.length >= 12) break;
    }
    if (made.length >= 12) break;
  }
  const countStarts = made.length;
  for (let i = 0; i < SHAPES.length && made.length - countStarts < 8; i += 1) {
    const verify = {
      kind: 'matrix',
      rule: 'count-col-color-row',
      shape: SHAPES[i],
      counts: i % 2 === 0 ? [1, 3] : [2, 4],
      colorNames: [COLORS[i % COLORS.length][0], COLORS[(i + 3) % COLORS.length][0]],
      colors: [COLORS[i % COLORS.length][1], COLORS[(i + 3) % COLORS.length][1]],
    };
    const question = matrixQuestion(verify, 2);
    if (question) made.push(question);
  }
  for (const shape of ['triangle', 'star', 'diamond', 'hex']) {
    const verify = {
      kind: 'matrix',
      rule: 'rotate-col-color-row',
      shape,
      rotations: [0, 90],
      colorNames: [COLORS[4][0], COLORS[1][0]],
      colors: [COLORS[4][1], COLORS[1][1]],
    };
    if (shape === 'star') {
      verify.colorNames = [COLORS[2][0], COLORS[3][0]];
      verify.colors = [COLORS[2][1], COLORS[3][1]];
    }
    if (shape === 'diamond') {
      verify.colorNames = [COLORS[0][0], COLORS[5][0]];
      verify.colors = [COLORS[0][1], COLORS[5][1]];
      verify.rotations = [0, 45];
    }
    if (shape === 'hex') {
      verify.rotations = [0, 30];
      verify.colorNames = [COLORS[3][0], COLORS[4][0]];
      verify.colors = [COLORS[3][1], COLORS[4][1]];
    }
    const question = matrixQuestion(verify, 3);
    if (question) made.push(question);
  }
  return made;
}

function matrixQuestion(verify, difficulty) {
  const shown = matrixCells(verify);
  const answer = matrixAnswerCell(verify);
  const distractors = [
    { ...answer, colorName: shown[0].colorName, color: shown[0].color },
    { ...answer, shape: shown[0].shape, count: shown[0].count ?? 1, rotation: shown[0].rotation ?? 0 },
    { ...answer, count: (answer.count ?? 1) + 2, rotation: ((answer.rotation ?? 0) + 90) % 360 },
    { ...answer, shape: SHAPES[(SHAPES.indexOf(answer.shape) + 1) % SHAPES.length], count: 1, rotation: 0 },
  ];
  const picked = [];
  const labels = new Set();
  for (const item of [answer, ...distractors]) {
    const label = cellLabel(item);
    if (labels.has(label)) continue;
    labels.add(label);
    picked.push(item);
    if (picked.length === 4) break;
  }
  if (picked.length < 4) return null;
  const prompt = `Which picture completes the empty box? Top row: ${cellLabel(shown[0])} and ${cellLabel(shown[1])}. Bottom row starts with ${cellLabel(shown[2])}.`;
  const mixed = shuffle(picked.map((item) => ({ label: cellLabel(item), figure: item })), rngFor(prompt));
  const ruleText = verify.rule === 'col-shape-row-color'
    ? `Across a row, the shape changes and the color stays the same. Down a column, the color changes and the shape stays the same.`
    : verify.rule === 'count-col-color-row'
      ? `Across a row, the number of shapes changes and the color stays the same. Down a column, the color changes.`
      : `Across a row, the shape turns and the color stays the same. Down a column, the color changes.`;
  return seal({
    prefix: 'mx',
    section: 'cogat',
    topic: 'figure-matrices',
    topicLabel: 'Figure matrices',
    prompt,
    figure: {
      kind: 'matrix',
      cells: shown,
      alt: `A two by two pattern. ${cellLabel(shown[0])}; ${cellLabel(shown[1])}; ${cellLabel(shown[2])}; empty box.`,
    },
    choices: mixed.map((item) => item.label),
    choiceFigures: mixed.map((item) => item.figure),
    explanation: `${ruleText} The empty box is ${cellLabel(answer)}.`,
    difficulty,
    verify,
    ...skillFields('G3.REASON.MATRIX'),
  });
}

function buildFolds() {
  const made = [];
  const punches = [];
  for (const x of [64, 72, 78, 86]) {
    for (const y of [18, 28, 38, 66, 76, 86]) punches.push({ x, y });
  }
  for (const axes of [['v'], ['h'], ['v', 'h']]) {
    for (const punch of punches) {
      if (made.length >= 18) return made;
      const question = foldQuestion(axes, punch);
      if (question) made.push(question);
    }
  }
  return made;
}

function foldQuestion(axes, punch) {
  const correct = foldHoles(axes, punch);
  const sets = axes.length === 2
    ? [foldHoles(['v'], punch), foldHoles(['h'], punch), [punch]]
    : [[punch], foldHoles(axes[0] === 'v' ? ['h'] : ['v'], punch), foldHoles(['v', 'h'], punch)];
  const labels = [foldChoiceLabel(correct), ...sets.map((holes) => foldChoiceLabel(holes))];
  if (new Set(labels).size !== 4) return null;
  const axisName = axes.length === 2 ? 'the vertical and horizontal dashed lines' : axes[0] === 'v' ? 'the vertical dashed line' : 'the horizontal dashed line';
  const prompt = `A square is folded on ${axisName}. One punch goes through the layers at ${punch.x} across and ${punch.y} down on a 100 by 100 square. Where are the holes when the paper opens?`;
  const figures = [{ kind: 'holes', holes: correct }, ...sets.map((holes) => ({ kind: 'holes', holes }))];
  const mixed = shuffle(labels.map((label, index) => ({ label, figure: figures[index] })), rngFor(prompt));
  const mirror = axes.length === 2
    ? 'The paper was folded both ways, so the punch shows up in all four matching spots.'
    : axes[0] === 'v'
      ? 'The vertical fold mirrors the hole from left to right.'
      : 'The horizontal fold mirrors the hole from top to bottom.';
  return seal({
    prefix: 'pf',
    section: 'cogat',
    topic: 'paper-folding',
    topicLabel: 'Paper folding',
    prompt,
    figure: {
      kind: 'fold',
      axes,
      punch,
      alt: `A square paper with ${axisName}. The red punch mark is ${punch.x} across and ${punch.y} down.`,
    },
    choices: mixed.map((item) => item.label),
    choiceFigures: mixed.map((item) => item.figure),
    explanation: `${mirror} Opening the paper shows ${foldChoiceLabel(correct)}.`,
    difficulty: axes.length === 2 ? 3 : 2,
    verify: { kind: 'fold', axes, punch },
    ...skillFields('G3.REASON.FOLD'),
  });
}

function buildClassify() {
  const made = [];
  for (let i = 0; i < SHAPES.length; i += 1) {
    const shape = SHAPES[i];
    const groupColors = [COLORS[i % COLORS.length], COLORS[(i + 1) % COLORS.length], COLORS[(i + 2) % COLORS.length]];
    const extra = COLORS[(i + 3) % COLORS.length];
    const items = groupColors.map((color, index) => cell(shape, color, SIZES[index]));
    const answer = cell(shape, extra, 'large');
    const wrong = [
      cell(SHAPES[(i + 1) % SHAPES.length], extra, 'medium'),
      cell(SHAPES[(i + 2) % SHAPES.length], groupColors[0], 'small'),
      cell(SHAPES[(i + 3) % SHAPES.length], groupColors[1], 'large'),
    ];
    made.push(classifyQuestion('shape', shape, items, [answer, ...wrong], `Every figure is a ${shape}. Color and size change, so the rule is the shape.`));
  }
  for (let i = 0; i < COLORS.length; i += 1) {
    const color = COLORS[i];
    const items = [0, 1, 2].map((offset) => cell(SHAPES[(i + offset) % SHAPES.length], color, SIZES[offset]));
    const answer = cell(SHAPES[(i + 3) % SHAPES.length], color, 'large');
    const wrong = [
      cell(SHAPES[(i + 3) % SHAPES.length], COLORS[(i + 1) % COLORS.length], 'large'),
      cell(SHAPES[(i + 4) % SHAPES.length], COLORS[(i + 2) % COLORS.length], 'small'),
      cell(SHAPES[i % SHAPES.length], COLORS[(i + 3) % COLORS.length], 'medium'),
    ];
    made.push(classifyQuestion('colorName', color[0], items, [answer, ...wrong], `Every figure is ${color[0]}. The shape and size change, so the rule is the color.`));
  }
  return made;
}

function classifyQuestion(property, value, items, optionCells, because) {
  const prompt = `These figures follow a rule: ${items.map((item) => cellLabel(item)).join('; ')}. Which other figure follows the same rule?`;
  const mixed = shuffle(optionCells.map((item) => ({ label: cellLabel(item), figure: item })), rngFor(prompt));
  const answer = optionCells.find((item) => item[property] === value);
  return seal({
    prefix: 'fc',
    section: 'cogat',
    topic: 'figure-classification',
    topicLabel: 'Figure classification',
    prompt,
    figure: {
      kind: 'group',
      items,
      alt: `Three figures that follow one rule: ${items.map((item) => cellLabel(item)).join('; ')}.`,
    },
    choices: mixed.map((item) => item.label),
    choiceFigures: mixed.map((item) => item.figure),
    explanation: `${because} The figure that belongs is ${cellLabel(answer)}.`,
    difficulty: 2,
    verify: { kind: 'classify', property, value },
    ...skillFields('G3.REASON.CLASSIFY'),
  });
}

function buildPlace() {
  const made = [];
  const numbers = [];
  for (let n = 120; n <= 980 && numbers.length < 24; n += 17) {
    const hundreds = Math.floor(n / 100);
    const tens = Math.floor(n / 10) % 10;
    const ones = n % 10;
    if (new Set([hundreds, tens, ones]).size === 3 && tens !== 0 && ones !== 0) numbers.push(n);
  }
  numbers.forEach((n, index) => {
    const place = ['ones', 'tens', 'hundreds'][index % 3];
    const digit = placeDigit(n, place);
    const prompt = `What is the ${place} digit in ${n}?`;
    push(made, {
      prefix: 'pv',
      section: 'iready',
      topic: 'place-value',
      topicLabel: 'Place value',
      prompt,
      choices: numericChoices(digit, [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10, 0], rngFor(prompt)),
      explanation: `${n} breaks apart as ${expandedForm(n)}. The ${place} digit is ${digit}.`,
      difficulty: 1,
      verify: { kind: 'place-digit', number: n, place },
      ...skillFields('3.NBT.A.1'),
    });
  });
  numbers.slice(0, 12).forEach((n, index) => {
    const place = index % 2 === 0 ? 'tens' : 'hundreds';
    const value = placeDigit(n, place) * (place === 'tens' ? 10 : 100);
    const prompt = `In ${n}, what is the value of the ${place} digit?`;
    push(made, {
      prefix: 'pv',
      section: 'iready',
      topic: 'place-value',
      topicLabel: 'Place value',
      prompt,
      choices: numericChoices(value, [placeDigit(n, place), value * 10, n, value + 10], rngFor(prompt)),
      explanation: `The ${place} digit in ${n} is ${placeDigit(n, place)}. A digit in the ${place} place is worth ${place === 'tens' ? '10 times itself' : '100 times itself'}, so the value is ${value}.`,
      difficulty: 2,
      verify: { kind: 'place-value', number: n, place },
      ...skillFields('3.NBT.A.1'),
    });
  });
  numbers.slice(0, 12).forEach((n) => {
    const prompt = `Which expression is ${n} in expanded form?`;
    const correct = expandedForm(n);
    const hundreds = Math.floor(n / 100) * 100;
    const tens = Math.floor(n / 10) % 10 * 10;
    const ones = n % 10;
    const distractors = [`${hundreds} + ${ones}`, `${tens} + ${ones}`, `${hundreds + 100} + ${tens} + ${ones}`].filter((item) => item !== correct);
    push(made, {
      prefix: 'pv',
      section: 'iready',
      topic: 'place-value',
      topicLabel: 'Place value',
      prompt,
      choices: choiceSet(correct, distractors.slice(0, 3).concat([`${hundreds} + ${tens}`]).filter((item, pos, arr) => item !== correct && arr.indexOf(item) === pos).slice(0, 3), rngFor(prompt)),
      explanation: `${n} has ${Math.floor(n / 100)} hundreds, ${Math.floor(n / 10) % 10} tens, and ${ones} ones. Expanded form writes those values with plus signs: ${correct}.`,
      difficulty: 2,
      verify: { kind: 'expanded', number: n },
      ...skillFields('3.NBT.A.1'),
    });
  });
  const rounders = [124, 135, 148, 152, 167, 175, 186, 203, 248, 255, 261, 274, 309, 345, 350, 367, 412, 449, 455, 480, 506, 555, 562, 590];
  rounders.forEach((n, index) => {
    const nearest = index % 2 === 0 ? 10 : 100;
    const prompt = `Round ${n} to the nearest ${nearest}.`;
    const answer = roundNumber(n, nearest);
    push(made, {
      prefix: 'pv',
      section: 'iready',
      topic: 'place-value',
      topicLabel: 'Place value',
      prompt,
      choices: numericChoices(answer, [n, answer + nearest, Math.abs(answer - nearest), Math.floor(n / nearest) * nearest, Math.ceil(n / nearest) * nearest], rngFor(prompt)),
      explanation: explainRound(n, nearest),
      difficulty: nearest === 10 ? 1 : 2,
      verify: { kind: 'round', number: n, nearest },
      ...skillFields('3.NBT.A.1'),
    });
  });
  const compareSets = [
    [248, 284, 428, 244],
    [305, 350, 309, 390],
    [617, 671, 716, 167],
    [804, 840, 480, 408],
    [129, 192, 219, 291],
    [560, 506, 650, 605],
    [733, 737, 773, 377],
    [941, 914, 491, 419],
  ];
  compareSets.forEach((values) => {
    const prompt = `Which number is the greatest: ${values.join(', ')}?`;
    push(made, {
      prefix: 'pv',
      section: 'iready',
      topic: 'place-value',
      topicLabel: 'Place value',
      prompt,
      choices: shuffle(values.map(String), rngFor(prompt)),
      explanation: `Compare hundreds first, then tens, then ones. The greatest number in this list is ${Math.max(...values)}.`,
      difficulty: 1,
      verify: { kind: 'max', values },
      ...skillFields('3.NBT.A.1'),
    });
  });
  return made;
}

function buildAddSub() {
  const made = [];
  let n = 0;
  while (made.filter((q) => q.prompt.includes('+') || q.prompt.includes('more') || q.prompt.includes('altogether') || q.prompt.includes('in all') || q.prompt.includes('now')).length < 36) {
    n += 1;
    const a = 120 + ((n * 37) % 540);
    const b = 16 + ((n * 23) % 280);
    if (a + b > 980) continue;
    const name = nameAt(n);
    const object = ['stickers', 'shells', 'cards', 'beads', 'stamps', 'blocks', 'leaves', 'buttons'][n % 8];
    const frames = [
      [`${name} has ${a} ${object}. ${name} gets ${b} more. How many ${object} are there now?`, `${name} starts with ${a} and adds ${b}.`],
      [`There are ${a} ${object} in a bin and ${b} ${object} in a bag. How many ${object} are there in all?`, `Join the two groups: ${a} and ${b}.`],
      [`A book has ${a} pages of photos and ${b} pages of drawings. How many pages is that altogether?`, `Add the photo pages and the drawing pages.`],
    ];
    const [prompt, lead] = frames[n % frames.length];
    if (made.some((question) => question.prompt === prompt)) continue;
    push(made, {
      prefix: 'as',
      section: 'iready',
      topic: 'add-subtract',
      topicLabel: 'Add and subtract',
      prompt,
      choices: numericChoices(a + b, [a + b + 10, a + b - 10, Math.abs(a - b), a + b + 1, a + b - 1], rngFor(prompt)),
      explanation: `${lead} ${explainAdd(a, b)}`,
      difficulty: String(a + b).length > 3 || (a % 10) + (b % 10) >= 10 ? 2 : 1,
      verify: { kind: 'expr', expr: `${a}+${b}` },
      ...skillFields('3.NBT.A.2'),
    });
  }
  n = 0;
  while (made.filter((q) => q.verify.expr.includes('-')).length < 28) {
    n += 1;
    const big = 260 + ((n * 41) % 680);
    const small = 25 + ((n * 19) % 220);
    if (small >= big) continue;
    const name = nameAt(n + 5);
    const object = ['tickets', 'marbles', 'crayons', 'seeds', 'points', 'pages', 'yards', 'cans'][n % 8];
    const frames = [
      [`${name} had ${big} ${object} and gave away ${small}. How many ${object} are left?`, `${name} starts with ${big} and takes away ${small}.`],
      [`A shelf held ${big} ${object}. ${small} were used. How many ${object} are still on the shelf?`, `Start at ${big} and subtract ${small}.`],
    ];
    const [prompt, lead] = frames[n % frames.length];
    if (made.some((question) => question.prompt === prompt)) continue;
    push(made, {
      prefix: 'as',
      section: 'iready',
      topic: 'add-subtract',
      topicLabel: 'Add and subtract',
      prompt,
      choices: numericChoices(big - small, [big + small, big - small + 10, Math.abs(big - small - 10), big - small + 1], rngFor(prompt)),
      explanation: `${lead} ${explainSub(big, small)}`,
      difficulty: big % 10 < small % 10 ? 2 : 1,
      verify: { kind: 'expr', expr: `${big}-${small}` },
      ...skillFields('3.NBT.A.2'),
    });
  }
  for (let i = 0; i < 16; i += 1) {
    const a = 140 + i * 17;
    const b = 25 + i * 9;
    const prompt = `What is ${a} + ${b}?`;
    push(made, {
      prefix: 'as',
      section: 'iready',
      topic: 'add-subtract',
      topicLabel: 'Add and subtract',
      prompt,
      choices: numericChoices(a + b, [a + b + 10, a - b, a + b - 10, a + b + 100], rngFor(prompt)),
      explanation: explainAdd(a, b),
      difficulty: (a % 10) + (b % 10) >= 10 ? 2 : 1,
      verify: { kind: 'expr', expr: `${a}+${b}` },
      ...skillFields('3.NBT.A.2'),
    });
    const big = 800 - i * 13;
    const small = 45 + i * 11;
    const prompt2 = `What is ${big} - ${small}?`;
    push(made, {
      prefix: 'as',
      section: 'iready',
      topic: 'add-subtract',
      topicLabel: 'Add and subtract',
      prompt: prompt2,
      choices: numericChoices(big - small, [big + small, big - small + 10, big - small - 10, small], rngFor(prompt2)),
      explanation: explainSub(big, small),
      difficulty: 2,
      verify: { kind: 'expr', expr: `${big}-${small}` },
      ...skillFields('3.NBT.A.2'),
    });
  }
  return made;
}

function buildFacts() {
  const made = [];
  const pairs = [];
  for (let a = 0; a <= 10; a += 1) {
    for (let b = 0; b <= 10; b += 1) pairs.push([a, b]);
  }
  pairs.forEach(([a, b], index) => {
    if (made.length >= 48) return;
    if (index % 2 === 1 && a !== b) return;
    const stems = [
      `What is ${a} × ${b}?`,
      `${a} groups of ${b} equals what number?`,
      `An array has ${a} rows and ${b} columns. How many squares are in the array?`,
    ];
    const prompt = stems[index % stems.length];
    if (a === 0 && prompt.startsWith('An array')) return;
    push(made, {
      prefix: 'md',
      section: 'iready',
      topic: 'mult-div',
      topicLabel: 'Multiplication and division',
      prompt,
      choices: numericChoices(a * b, [a + b, Math.abs(a * b - a), a * b + b, Math.abs(a * b - 1), a * (b + 1)], rngFor(prompt)),
      explanation: explainMul(a, b),
      difficulty: a <= 2 || b <= 2 || a * b <= 20 ? 1 : a * b <= 50 ? 2 : 3,
      verify: { kind: 'expr', expr: `${a}*${b}` },
      ...skillFields(prompt.includes('groups') || prompt.includes('array') ? '3.OA.A.1' : '3.OA.C.7'),
    });
  });
  for (let a = 1; a <= 10; a += 1) {
    for (let b = 1; b <= 10; b += 1) {
      if (made.filter((q) => q.verify.expr.includes('/')).length >= 24) break;
      if ((a * b) % 2 === 1 && a !== b) continue;
      const total = a * b;
      const prompt = `What is ${total} ÷ ${b}?`;
      if (made.some((question) => question.prompt === prompt)) continue;
      push(made, {
        prefix: 'md',
        section: 'iready',
        topic: 'mult-div',
        topicLabel: 'Multiplication and division',
        prompt,
        choices: numericChoices(a, [b, total, a + 1, Math.max(0, a - 1), b + 1], rngFor(prompt)),
        explanation: explainDiv(total, b),
        difficulty: total <= 20 ? 1 : 2,
        verify: { kind: 'expr', expr: `${total}/${b}` },
        ...skillFields('3.OA.C.7'),
      });
    }
  }
  return made;
}

function buildStories() {
  const made = [];
  const things = ['apples', 'stickers', ' muffins'.trim(), 'books', 'flowers', 'pencils', 'oranges', 'cards', 'shells', 'toys'];
  for (let i = 0; i < 18; i += 1) {
    const groups = 2 + (i % 8);
    const each = 2 + ((i * 3) % 8);
    const name = nameAt(i);
    const thing = things[i % things.length];
    const prompt = `${name} makes ${groups} equal rows with ${each} ${thing} in each row. How many ${thing} is that?`;
    push(made, {
      prefix: 'wp',
      section: 'iready',
      topic: 'word-problems',
      topicLabel: 'Word problems',
      prompt,
      choices: numericChoices(groups * each, [groups + each, groups * each + each, groups * each - groups, groups * (each + 1)], rngFor(prompt)),
      explanation: `Equal rows are a multiplication story. ${explainMul(groups, each)}`,
      difficulty: groups * each > 40 ? 2 : 1,
      verify: { kind: 'expr', expr: `${groups}*${each}` },
      ...skillFields('3.OA.A.3'),
    });
  }
  for (let i = 0; i < 16; i += 1) {
    const groups = 2 + (i % 6);
    const each = 3 + (i % 7);
    const total = groups * each;
    const name = nameAt(i + 3);
    const thing = things[(i + 3) % things.length];
    const prompt = `${name} has ${total} ${thing} and puts the same number in each of ${groups} bags. How many ${thing} go in each bag?`;
    push(made, {
      prefix: 'wp',
      section: 'iready',
      topic: 'word-problems',
      topicLabel: 'Word problems',
      prompt,
      choices: numericChoices(each, [groups, total, each + 1, Math.max(1, each - 1)], rngFor(prompt)),
      explanation: `Sharing into equal bags is division. ${explainDiv(total, groups)}`,
      difficulty: 2,
      verify: { kind: 'expr', expr: `${total}/${groups}` },
      ...skillFields('3.OA.A.3'),
    });
  }
  for (let i = 0; i < 18; i += 1) {
    const groups = 3 + (i % 6);
    const each = 4 + (i % 5);
    const removed = 2 + (i % 7);
    const total = groups * each;
    if (removed >= total) continue;
    const name = nameAt(i + 8);
    const thing = things[(i + 1) % things.length];
    const prompt = `${name} fills ${groups} boxes with ${each} ${thing} in each box, then gives away ${removed}. How many ${thing} are left?`;
    push(made, {
      prefix: 'wp',
      section: 'iready',
      topic: 'word-problems',
      topicLabel: 'Word problems',
      prompt,
      choices: numericChoices(total - removed, [total, total + removed, groups * removed, total - removed - 1], rngFor(prompt)),
      explanation: `First multiply to find how many there were: ${groups} × ${each} = ${total}. Then subtract the ones given away: ${total} - ${removed} = ${total - removed}.`,
      difficulty: 3,
      verify: { kind: 'expr', expr: `(${groups}*${each})-${removed}` },
      ...skillFields('3.OA.D.8'),
    });
  }
  return made;
}

function buildFractions() {
  const made = [];
  const parts = [
    [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 6], [5, 6], [1, 8], [3, 8], [5, 8], [7, 8], [2, 4], [4, 6], [2, 6], [4, 8], [6, 8],
  ];
  parts.forEach(([num, den], index) => {
    const name = nameAt(index);
    const prompt = `${name} shades ${num} equal part${num === 1 ? '' : 's'} of a shape split into ${den} equal parts. Which fraction is shaded?`;
    const correct = `${num}/${den}`;
    const distractors = fractionDistractors(num, den, correct);
    push(made, {
      prefix: 'fr',
      section: 'iready',
      topic: 'fractions',
      topicLabel: 'Fractions',
      prompt,
      choices: choiceSet(correct, distractors, rngFor(prompt)),
      explanation: `The denominator is the number of equal parts, which is ${den}. The numerator is the number of shaded parts, which is ${num}. The fraction is ${correct}.`,
      difficulty: den <= 4 ? 1 : 2,
      verify: { kind: 'fraction', num, den },
      ...skillFields('3.NF.A.1'),
    });
  });
  const equivalents = [[1, 2, 2, 4], [1, 2, 3, 6], [1, 2, 4, 8], [1, 3, 2, 6], [2, 3, 4, 6], [1, 4, 2, 8], [3, 4, 6, 8], [2, 4, 1, 2], [3, 6, 1, 2], [4, 8, 1, 2]];
  equivalents.forEach(([num, den], index) => {
    const correct = equivalents[index];
    const match = `${correct[2]}/${correct[3]}`;
    const options = [match, `${num}/${den + 1}`, `${num + 1}/${den}`, `${den}/${num === 0 ? 1 : num}`];
    const unique = [...new Set(options)];
    if (unique.length < 4 || unique.filter((choice) => {
      const [a, b] = choice.split('/').map(Number);
      return a * den === b * num;
    }).length !== 1) return;
    const prompt = `Which fraction is equal to ${num}/${den}?`;
    if (made.some((question) => question.prompt === prompt)) return;
    push(made, {
      prefix: 'fr',
      section: 'iready',
      topic: 'fractions',
      topicLabel: 'Fractions',
      prompt,
      choices: shuffle(unique.slice(0, 4), rngFor(prompt)),
      explanation: `${num}/${den} and ${match} name the same amount. Multiply or divide the numerator and denominator by the same number to see the match.`,
      difficulty: 2,
      verify: { kind: 'equivalent', num, den },
      ...skillFields('3.NF.A.3'),
    });
  });
  const reducible = [[2, 4], [2, 6], [2, 8], [3, 6], [4, 6], [4, 8], [6, 8], [3, 9], [4, 4], [6, 6], [8, 8], [2, 2]];
  reducible.forEach(([num, den]) => {
    if (![2, 3, 4, 6, 8].includes(den) && den !== 9) return;
    const correct = reduceFraction(num, den);
    const pool = [`${num}/${den}`, `${Math.max(1, num - 1)}/${den}`, `${num}/${Math.max(num + 1, den - 1)}`, `${num}/${num}`].filter((item) => item !== correct);
    const unique = [...new Set(pool)];
    if (unique.length < 3) return;
    const prompt = `What is ${num}/${den} in simplest form?`;
    push(made, {
      prefix: 'fr',
      section: 'iready',
      topic: 'fractions',
      topicLabel: 'Fractions',
      prompt,
      choices: choiceSet(correct, unique.slice(0, 3), rngFor(prompt)),
      explanation: `Divide the numerator and the denominator by the same number until you cannot anymore. ${num}/${den} simplifies to ${correct}.`,
      difficulty: 2,
      verify: { kind: 'reduce', num, den },
      ...skillFields('3.NF.A.3'),
    });
  });
  const compares = [[1, 4, 3, 4], [2, 6, 5, 6], [1, 8, 5, 8], [3, 8, 7, 8], [1, 3, 2, 3], [2, 8, 2, 4], [1, 2, 1, 4], [2, 3, 2, 6], [3, 4, 3, 8], [1, 2, 2, 4], [4, 8, 1, 2], [2, 6, 1, 3]];
  compares.forEach(([a, b, c, d]) => {
    const left = [a, b];
    const right = [c, d];
    const prompt = `Compare ${a}/${b} and ${c}/${d}. Which statement is true?`;
    const phrase = comparePhrase(left, right);
    const choices = [
      `${a}/${b} is less than ${c}/${d}`,
      `${a}/${b} is greater than ${c}/${d}`,
      `${a}/${b} is equal to ${c}/${d}`,
      `${a}/${b} cannot be compared with ${c}/${d}`,
    ];
    push(made, {
      prefix: 'fr',
      section: 'iready',
      topic: 'fractions',
      topicLabel: 'Fractions',
      prompt,
      choices: shuffle(choices, rngFor(prompt)),
      explanation: b === d
        ? `The denominators match, so compare the numerators. ${phrase}.`
        : a === c
          ? `The numerators match. The larger denominator means smaller pieces, so compare carefully. ${phrase}.`
          : `Write the fractions with a shared idea of size, or cross-multiply. ${phrase}.`,
      difficulty: b === d ? 1 : 3,
      verify: { kind: 'compare-fractions', left, right },
      ...skillFields('3.NF.A.3'),
    });
  });
  const wholes = [[12, 1, 3], [12, 1, 4], [18, 1, 3], [18, 2, 3], [20, 1, 4], [24, 1, 6], [24, 3, 8], [16, 1, 2], [16, 3, 4], [10, 1, 2], [8, 3, 4], [15, 2, 3]];
  wholes.forEach(([whole, num, den], index) => {
    const name = nameAt(index + 4);
    const prompt = `${name} has ${whole} grapes and eats ${num}/${den} of them. How many grapes does ${name} eat?`;
    const answer = (whole * num) / den;
    push(made, {
      prefix: 'fr',
      section: 'iready',
      topic: 'fractions',
      topicLabel: 'Fractions',
      prompt,
      choices: numericChoices(answer, [whole, num, den, answer + 1, whole - answer], rngFor(prompt)),
      explanation: `Split ${whole} into ${den} equal groups. Each group has ${whole / den}. Then take ${num} of those groups: ${answer}.`,
      difficulty: num === 1 ? 2 : 3,
      verify: { kind: 'fraction-of', whole, num, den },
      ...skillFields('3.NF.A.1'),
    });
  });
  const linePoints = [[1, 2], [1, 4], [3, 4], [1, 3], [2, 3], [2, 4], [1, 6], [5, 6]];
  linePoints.forEach(([num, den]) => {
    const prompt = `On a number line from 0 to 1 split into ${den} equal spaces, a point is at ${num} space${num === 1 ? '' : 's'}. Which fraction names the point?`;
    const correct = `${num}/${den}`;
    const distractors = fractionDistractors(num, den, correct);
    push(made, {
      prefix: 'fr',
      section: 'iready',
      topic: 'fractions',
      topicLabel: 'Fractions',
      prompt,
      choices: choiceSet(correct, distractors, rngFor(prompt)),
      explanation: `The number line piece from 0 to 1 is split into ${den} equal spaces, so the denominator is ${den}. The point is ${num} spaces from 0, so the fraction is ${correct}.`,
      difficulty: 2,
      verify: { kind: 'fraction', num, den },
      ...skillFields('3.NF.A.2'),
    });
  });
  return made;
}

function buildMeasure() {
  const made = [];
  const objects = Object.keys(TABLES.UNITS);
  objects.forEach((object, index) => {
    const prompt = `Which unit is the best choice for measuring a ${object}?`;
    const answer = TABLES.UNITS[object];
    const pool = ['centimeters', 'meters', 'grams', 'kilograms', 'milliliters', 'liters'];
    const distractors = pool.filter((unit) => unit !== answer).slice(0, 3);
    push(made, {
      prefix: 'ms',
      section: 'iready',
      topic: 'measurement',
      topicLabel: 'Measurement',
      prompt,
      choices: choiceSet(answer, distractors, rngFor(prompt)),
      explanation: `Think about the size of a ${object}. A small length uses centimeters, a room-sized length uses meters, a light object uses grams, a heavier object uses kilograms, a sip uses milliliters, and a large amount of liquid uses liters. The best unit here is ${answer}.`,
      difficulty: 1,
      verify: { kind: 'unit', object },
      ...skillFields('3.MD.A.2'),
    });
    if (index > 20) return;
  });
  for (let i = 0; i < 14; i += 1) {
    const a = 12 + i * 3;
    const b = 8 + (i % 5) * 2;
    const name = nameAt(i);
    const prompt = `${name} cuts a ribbon that is ${a} centimeters and another that is ${b} centimeters. Placed end to end, how many centimeters long are they?`;
    push(made, {
      prefix: 'ms',
      section: 'iready',
      topic: 'measurement',
      topicLabel: 'Measurement',
      prompt,
      choices: numericChoices(a + b, [a + b + 10, Math.abs(a - b), a * b, a + b - 1], rngFor(prompt)),
      explanation: `End to end means add the lengths. ${explainAdd(a, b)}`,
      difficulty: 1,
      verify: { kind: 'expr', expr: `${a}+${b}` },
      ...skillFields('3.MD.A.2'),
    });
  }
  return made;
}

function buildTime() {
  const made = [];
  const activities = ['soccer', 'piano', 'library time', 'lunch', 'art', 'recess', 'the bus', 'breakfast', 'a bike ride', 'the play', 'choir', 'a picnic', 'math lab', 'reading group'];
  let clockCount = 0;
  for (let h = 1; h <= 12; h += 1) {
    for (const m of [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 7, 13, 48]) {
      if (clockCount >= 18) break;
      if ((h + m) % 3 !== 0) continue;
      const name = nameAt(clockCount);
      const activity = activities[clockCount % activities.length];
      const prompt = `${name} checks the clock before ${activity}. What time does the clock show?`;
      if (made.some((question) => question.prompt === prompt)) continue;
      const answer = formatTime(h, m);
      const distractors = [formatTime(m === 0 ? 12 : Math.max(1, m > 12 ? Math.floor(m / 5) : h), m === 0 ? 0 : (h * 5) % 60), formatTime(h % 12 + 1, m), formatTime(h, (m + 5) % 60)].filter((item) => item !== answer);
      const unique = [...new Set(distractors)].slice(0, 3);
      if (unique.length < 3) continue;
      const hourWord = m === 0 ? `at ${h}` : `between ${h} and ${h === 12 ? 1 : h + 1}`;
      push(made, {
        prefix: 'tm',
        section: 'iready',
        topic: 'time',
        topicLabel: 'Time',
        prompt,
        figure: {
          kind: 'clock',
          h,
          m,
          alt: `An analog clock. The short hour hand is ${hourWord}. The long minute hand is on the ${m} minute mark.`,
        },
        choices: choiceSet(answer, unique, rngFor(prompt + answer)),
        explanation: `The short hand is the hour hand. It is ${hourWord}, so the hour is ${h}. The long hand points at the ${m} minute mark. The time is ${answer}.`,
        difficulty: m % 5 === 0 ? (m % 15 === 0 ? 1 : 2) : 3,
        verify: { kind: 'clock', h, m },
        ...skillFields('3.MD.A.1'),
      });
      clockCount += 1;
    }
  }
  for (let i = 0; i < 12; i += 1) {
    const h = 1 + (i % 8);
    const m = [5, 10, 15, 20, 25, 35, 40, 45, 50][i % 9];
    const add = [10, 15, 20, 25, 30, 35, 40, 45][i % 8];
    const name = nameAt(i + 2);
    const prompt = `${name}'s practice starts at ${formatTime(h, m)} and lasts ${add} minutes. What time does it end?`;
    const answer = addClock(h, m, add);
    push(made, {
      prefix: 'tm',
      section: 'iready',
      topic: 'time',
      topicLabel: 'Time',
      prompt,
      choices: choiceSet(answer, [formatTime(h, m), addClock(h, m, add + 10), addClock(h, m, Math.max(5, add - 10))], rngFor(prompt)),
      explanation: `Start at ${formatTime(h, m)} and move the minute hand ${add} minutes ahead. When the minutes pass 60, the hour moves forward too. The ending time is ${answer}.`,
      difficulty: m + add >= 60 ? 2 : 1,
      verify: { kind: 'time-add', h, m, add },
      ...skillFields('3.MD.A.1'),
    });
  }
  for (let i = 0; i < 10; i += 1) {
    const sh = 1 + (i % 6);
    const sm = [0, 10, 15, 20, 30][i % 5];
    const eh = sh + 1;
    const em = [5, 15, 25, 40, 45, 50][i % 6];
    const minutes = elapsedMinutes(sh, sm, eh, em);
    const prompt = `Recess starts at ${formatTime(sh, sm)} and ends at ${formatTime(eh, em)}. How many minutes long is recess?`;
    push(made, {
      prefix: 'tm',
      section: 'iready',
      topic: 'time',
      topicLabel: 'Time',
      prompt,
      choices: numericChoices(minutes, [minutes + 10, Math.abs(minutes - 10), 60 - sm, eh - sh], rngFor(prompt)),
      explanation: `Count from ${formatTime(sh, sm)} to ${formatTime(eh, em)}. That span is ${minutes} minutes.`,
      difficulty: 2,
      verify: { kind: 'time-elapsed', sh, sm, eh, em },
      ...skillFields('3.MD.A.1'),
    });
  }
  return made;
}

function buildMoney() {
  const made = [];
  const purses = [
    [3, 2, 1, 4],
    [2, 3, 2, 0],
    [1, 4, 1, 3],
    [4, 1, 0, 2],
    [2, 0, 3, 5],
    [1, 2, 4, 1],
    [0, 5, 1, 0],
    [3, 1, 2, 4],
    [2, 2, 2, 2],
    [4, 0, 2, 5],
    [1, 1, 1, 10],
    [0, 3, 4, 4],
  ];
  purses.forEach(([quarters, dimes, nickels, pennies], index) => {
    const cents = quarters * 25 + dimes * 10 + nickels * 5 + pennies;
    const name = nameAt(index);
    const bits = [];
    if (quarters) bits.push(`${quarters} quarter${quarters === 1 ? '' : 's'}`);
    if (dimes) bits.push(`${dimes} dime${dimes === 1 ? '' : 's'}`);
    if (nickels) bits.push(`${nickels} nickel${nickels === 1 ? '' : 's'}`);
    if (pennies) bits.push(`${pennies} penn${pennies === 1 ? 'y' : 'ies'}`);
    const prompt = `${name} has ${bits.join(', ')}. How much money is that?`;
    const expr = [quarters ? `25*${quarters}` : '', dimes ? `10*${dimes}` : '', nickels ? `5*${nickels}` : '', pennies ? `${pennies}` : ''].filter(Boolean).join('+');
    push(made, {
      prefix: 'mn',
      section: 'iready',
      topic: 'money',
      topicLabel: 'Money',
      prompt,
      choices: moneyChoices(cents, rngFor(prompt)),
      explanation: `A quarter is 25 cents, a dime is 10, a nickel is 5, and a penny is 1. ${quarters ? `${quarters} × 25 = ${quarters * 25}. ` : ''}${dimes ? `${dimes} × 10 = ${dimes * 10}. ` : ''}${nickels ? `${nickels} × 5 = ${nickels * 5}. ` : ''}${pennies ? `${pennies} pennies make ${pennies}. ` : ''}The total is ${cents} cents, or ${formatMoney(cents)}.`,
      difficulty: bits.length > 2 ? 2 : 1,
      verify: { kind: 'money', expr },
      ...skillFields('2.MD.C.8'),
    });
  });
  const prices = [35, 42, 58, 65, 73, 80, 25, 49, 15, 90, 64, 37];
  prices.forEach((price, index) => {
    const name = nameAt(index + 1);
    const item = ['eraser', 'pencil pack', 'bookmark', 'sticker sheet', 'apple', 'juice', 'card', 'seed packet', 'ruler', 'notepad', 'glue stick', 'snack'][index];
    const prompt = `${name} buys a ${item} for ${formatMoney(price)} and pays with $1.00. How much change should ${name} get?`;
    const cents = 100 - price;
    push(made, {
      prefix: 'mn',
      section: 'iready',
      topic: 'money',
      topicLabel: 'Money',
      prompt,
      choices: moneyChoices(cents, rngFor(prompt)),
      explanation: `One dollar is 100 cents. Subtract the price: 100 - ${price} = ${cents}. The change is ${formatMoney(cents)}.`,
      difficulty: 2,
      verify: { kind: 'money', expr: `100-${price}` },
      ...skillFields('2.MD.C.8'),
    });
  });
  return made;
}

function moneyChoices(cents, rng) {
  const answer = formatMoney(cents);
  const extras = [cents + 10, Math.max(0, cents - 10), cents + 25, cents + 5, cents + 1]
    .filter((value, index, arr) => value !== cents && arr.indexOf(value) === index)
    .slice(0, 3)
    .map((value) => formatMoney(value));
  return choiceSet(answer, extras, rng);
}

function buildArea() {
  const made = [];
  const rooms = ['garden', 'poster', 'rug', 'card', 'tile mural', 'sandbox', 'photo', 'tray', 'stamp', 'flag', 'mat', 'sign'];
  for (let i = 0; i < 16; i += 1) {
    const l = 2 + (i % 8);
    const w = 2 + ((i * 3) % 6);
    const prompt = `A rectangular ${rooms[i % rooms.length]} is ${l} units long and ${w} units wide. What is its area in square units?`;
    push(made, {
      prefix: 'ap',
      section: 'iready',
      topic: 'area-perimeter',
      topicLabel: 'Area and perimeter',
      prompt,
      figure: { kind: 'rect', l, w, unit: 'units', alt: `A rectangle covered by a grid that is ${l} units by ${w} units.` },
      choices: numericChoices(l * w, [l + w, 2 * (l + w), l * w + l, Math.abs(l * w - w)], rngFor(prompt)),
      explanation: `Area of a rectangle is length times width. ${explainMul(l, w)} You can also count the ${l * w} unit squares.`,
      difficulty: l * w > 30 ? 2 : 1,
      verify: { kind: 'expr', expr: `${l}*${w}` },
      ...skillFields('3.MD.C.7'),
    });
  }
  for (let i = 0; i < 12; i += 1) {
    const l = 3 + (i % 7);
    const w = 2 + (i % 5);
    const prompt = `A rectangle is ${l} centimeters long and ${w} centimeters wide. What is the perimeter in centimeters?`;
    const answer = 2 * (l + w);
    push(made, {
      prefix: 'ap',
      section: 'iready',
      topic: 'area-perimeter',
      topicLabel: 'Area and perimeter',
      prompt,
      choices: numericChoices(answer, [l * w, l + w, answer + 2, Math.abs(answer - 2)], rngFor(prompt)),
      explanation: `Perimeter is the distance around. Add all four sides: ${l} + ${w} + ${l} + ${w}. That is the same as 2 × (${l} + ${w}) = ${answer}.`,
      difficulty: 2,
      verify: { kind: 'expr', expr: `2*(${l}+${w})` },
      ...skillFields('3.MD.D.8'),
    });
  }
  const polygons = [
    [3, 4, 5],
    [6, 6, 6],
    [4, 5, 4, 5],
    [2, 2, 2, 2, 2],
    [8, 3, 8, 3],
    [5, 5, 7],
    [10, 4, 10, 4],
    [7, 7, 7, 7],
  ];
  polygons.forEach((sides, index) => {
    const prompt = `A shape has side lengths of ${sides.join(', ')} centimeters. What is the perimeter?`;
    const expr = sides.join('+');
    push(made, {
      prefix: 'ap',
      section: 'iready',
      topic: 'area-perimeter',
      topicLabel: 'Area and perimeter',
      prompt,
      choices: numericChoices(evalExpr(expr), [sides[0] * sides.length, evalExpr(expr) + sides[0], evalExpr(expr) - sides[0], sides.reduce((m, s) => Math.max(m, s), 0)], rngFor(prompt)),
      explanation: `Add every side once. ${sides.join(' + ')} = ${evalExpr(expr)}. The perimeter is ${evalExpr(expr)} centimeters.`,
      difficulty: sides.length > 4 ? 2 : 1,
      verify: { kind: 'expr', expr },
      ...skillFields('3.MD.D.8'),
    });
  });
  return made;
}

function buildGeometry() {
  const made = [];
  for (const shape of Object.keys(TABLES.SIDES)) {
    if (shape === 'circle') continue;
    const prompt = `How many sides does a ${shape} have?`;
    const answer = TABLES.SIDES[shape];
    push(made, {
      prefix: 'gm',
      section: 'iready',
      topic: 'geometry',
      topicLabel: 'Geometry',
      prompt,
      figure: { kind: 'shape', shape, alt: `A drawing of a ${shape}.` },
      choices: numericChoices(answer, [answer + 1, Math.max(0, answer - 1), answer + 2, 4], rngFor(prompt)),
      explanation: `Count the straight sides of a ${shape}. There are ${answer}.`,
      difficulty: answer > 4 ? 2 : 1,
      verify: { kind: 'sides', shape },
      ...skillFields('3.G.A.1'),
    });
  }
  const prompts = {
    'four-equal-sides-and-four-right-angles': ['Which shape has four equal sides and four right angles?', ['circle', 'pentagon', 'trapezoid']],
    'four-right-angles-and-opposite-sides-equal': ['A quadrilateral has four right angles. Its opposite sides are equal, and not all four sides have to be the same length. Which shape is it?', ['triangle', 'pentagon', 'circle']],
    'four-equal-sides': ['Which shape has four equal sides, even when it does not have right angles?', ['circle', 'pentagon', 'hexagon']],
    'three-sides': ['Which shape has exactly three sides?', ['circle', 'pentagon', 'hexagon']],
    'five-sides': ['Which shape has exactly five sides?', ['triangle', 'circle', 'hexagon']],
    'six-sides': ['Which shape has exactly six sides?', ['triangle', 'pentagon', 'circle']],
    'eight-sides': ['Which shape has exactly eight sides?', ['hexagon', 'pentagon', 'triangle']],
    'no-straight-sides': ['Which shape has no straight sides?', ['triangle', 'hexagon', 'rectangle']],
    'exactly-one-pair-of-parallel-sides': ['Which shape has exactly one pair of parallel sides?', ['triangle', 'circle', 'hexagon']],
  };
  for (const [key, entry] of Object.entries(prompts)) {
    const [prompt, distractors] = entry;
    const answer = TABLES.SHAPE_NAMES[key];
    push(made, {
      prefix: 'gm',
      section: 'iready',
      topic: 'geometry',
      topicLabel: 'Geometry',
      prompt,
      choices: choiceSet(answer, distractors, rngFor(prompt)),
      explanation: `Match the description to the shape name. ${prompt.replace('Which shape', 'The shape')} The name is ${answer}.`,
      difficulty: key.includes('parallel') || key.includes('opposite') ? 3 : 2,
      verify: { kind: 'shape-name', key },
      ...skillFields('3.G.A.1'),
    });
  }
  const splits = [[2, 1], [3, 1], [4, 1], [4, 3], [6, 1], [6, 5], [8, 1], [8, 3], [8, 5], [3, 2]];
  splits.forEach(([den, num], index) => {
    const prompt = `A shape is partitioned into ${den} equal parts, and ${num} part${num === 1 ? ' is' : 's are'} shaded. What fraction of the shape is shaded?`;
    const correct = `${num}/${den}`;
    const distractors = fractionDistractors(num, den, correct);
    push(made, {
      prefix: 'gm',
      section: 'iready',
      topic: 'geometry',
      topicLabel: 'Geometry',
      prompt,
      choices: choiceSet(correct, distractors, rngFor(prompt + index)),
      explanation: `Equal parts tell the denominator, ${den}. Shaded parts tell the numerator, ${num}. The fraction is ${correct}.`,
      difficulty: den > 4 ? 2 : 1,
      verify: { kind: 'fraction', num, den },
      ...skillFields('3.G.A.2'),
    });
  });
  return made;
}

function buildData() {
  const made = [];
  const charts = [
    { title: 'Books read in March', unit: 'books', kind: 'bars', rows: [['Maya', 6], ['Noah', 4], ['Priya', 9], ['Luis', 5]] },
    { title: 'Cans collected', unit: 'cans', kind: 'bars', rows: [['Room 12', 8], ['Room 14', 5], ['Room 15', 11], ['Room 18', 7]] },
    { title: 'Goals scored', unit: 'goals', kind: 'bars', rows: [['Aisha', 3], ['Leo', 7], ['Mei', 4], ['Omar', 6]] },
    { title: 'Miles walked', unit: 'miles', kind: 'bars', rows: [['Hana', 5], ['Theo', 2], ['Ruby', 8], ['Evan', 4]] },
    { title: 'Stickers earned', unit: 'stickers', kind: 'pictograph', key: 2, rows: [['Sam', 8], ['Nina', 4], ['Caleb', 10], ['Zoe', 6]] },
    { title: 'Birds counted', unit: 'birds', kind: 'pictograph', key: 2, rows: [['Pond', 6], ['Oak', 10], ['Garden', 4], ['Roof', 8]] },
    { title: 'Tickets sold', unit: 'tickets', kind: 'bars', rows: [['Monday', 4], ['Tuesday', 9], ['Wednesday', 6], ['Thursday', 12]] },
    { title: 'Flowers planted', unit: 'flowers', kind: 'pictograph', key: 5, rows: [['Red', 10], ['Yellow', 15], ['Purple', 5], ['White', 20]] },
  ];
  charts.forEach((chart) => {
    const rows = chart.rows.map(([label, value]) => ({ label, value }));
    const figure = {
      kind: chart.kind,
      title: chart.title,
      unit: chart.unit,
      rows,
      ...(chart.key ? { key: chart.key } : {}),
      alt: `${chart.kind === 'pictograph' ? 'Picture graph' : 'Bar graph'} titled ${chart.title}. ${chart.key ? `Each symbol stands for ${chart.key} ${chart.unit}. ` : ''}${rows.map((row) => `${row.label}: ${row.value} ${chart.unit}`).join('. ')}.`,
    };
    const top = rows.reduce((best, row) => (row.value > best.value ? row : best), rows[0]);
    const low = rows.reduce((best, row) => (row.value < best.value ? row : best), rows[0]);
    const promptValue = `On the graph "${chart.title}", how many ${chart.unit} does ${top.label} have?`;
    push(made, {
      prefix: 'dt',
      section: 'iready',
      topic: 'data',
      topicLabel: 'Graphs and data',
      prompt: promptValue,
      figure,
      choices: numericChoices(top.value, rows.map((row) => row.value).concat([top.value + chart.key || top.value + 1]), rngFor(promptValue)),
      explanation: `Find the row or bar for ${top.label}. Read its value on the scale${chart.key ? `, remembering each symbol means ${chart.key}` : ''}. ${top.label} has ${top.value} ${chart.unit}.`,
      difficulty: 1,
      verify: { kind: 'table-value', label: top.label },
      ...skillFields('3.MD.B.3'),
    });
    const diff = top.value - low.value;
    const promptDiff = `On the graph "${chart.title}", how many more ${chart.unit} does ${top.label} have than ${low.label}?`;
    push(made, {
      prefix: 'dt',
      section: 'iready',
      topic: 'data',
      topicLabel: 'Graphs and data',
      prompt: promptDiff,
      figure,
      choices: numericChoices(diff, [top.value, low.value, diff + (chart.key || 1), top.value + low.value], rngFor(promptDiff)),
      explanation: `${top.label} has ${top.value} and ${low.label} has ${low.value}. Subtract: ${top.value} - ${low.value} = ${diff}.`,
      difficulty: 2,
      verify: { kind: 'table-diff', a: top.label, b: low.label },
      ...skillFields('3.MD.B.3'),
    });
    const pair = [rows[0].label, rows[1].label];
    const sum = rows[0].value + rows[1].value;
    const promptSum = `On the graph "${chart.title}", how many ${chart.unit} do ${pair[0]} and ${pair[1]} have together?`;
    push(made, {
      prefix: 'dt',
      section: 'iready',
      topic: 'data',
      topicLabel: 'Graphs and data',
      prompt: promptSum,
      figure,
      choices: numericChoices(sum, [rows[0].value, rows[1].value, Math.abs(rows[0].value - rows[1].value), sum + (chart.key || 2)], rngFor(promptSum)),
      explanation: `Add the two amounts. ${rows[0].label} has ${rows[0].value} and ${rows[1].label} has ${rows[1].value}. ${rows[0].value} + ${rows[1].value} = ${sum}.`,
      difficulty: 2,
      verify: { kind: 'table-sum', labels: pair },
      ...skillFields('3.MD.B.3'),
    });
  });
  return made;
}

function buildReading() {
  const made = [];
  for (const passage of PASSAGES) {
    const text = passageText(passage);
    const fiction = passage.genre === 'fiction';
    const shared = { section: 'map', passageTitle: passage.title, passage: text };
    const mainPrompt = `What is the main idea of "${passage.title}"?`;
    push(made, {
      ...shared,
      prefix: 'mi',
      topic: 'main-idea',
      topicLabel: 'Main idea',
      prompt: mainPrompt,
      choices: choiceSet(passage.main.answer, passage.main.distractors, rngFor(mainPrompt)),
      correctText: passage.main.answer,
      explanation: passage.main.explanation,
      difficulty: passage.main.difficulty,
      verify: { kind: 'authored' },
      ...skillFields(fiction ? 'RL.3.2' : 'RI.3.2'),
    });
    const inferPrompt = `Which conclusion is best supported by "${passage.title}"?`;
    push(made, {
      ...shared,
      prefix: 'inf',
      topic: 'inference',
      topicLabel: 'Inference',
      prompt: inferPrompt,
      choices: choiceSet(passage.inference.answer, passage.inference.distractors, rngFor(inferPrompt)),
      correctText: passage.inference.answer,
      explanation: passage.inference.explanation,
      difficulty: passage.inference.difficulty,
      verify: { kind: 'authored' },
      ...skillFields(fiction ? 'RL.3.1' : 'RI.3.1'),
    });
    const vocabPrompt = `In "${passage.title}", what does "${passage.vocab.word}" mean?`;
    push(made, {
      ...shared,
      prefix: 'voc',
      topic: 'vocabulary',
      topicLabel: 'Vocabulary',
      prompt: vocabPrompt,
      choices: choiceSet(passage.vocab.answer, passage.vocab.distractors, rngFor(vocabPrompt)),
      correctText: passage.vocab.answer,
      explanation: passage.vocab.explanation,
      difficulty: passage.vocab.difficulty,
      verify: { kind: 'vocab', word: passage.vocab.word },
      ...skillFields(fiction ? 'RL.3.4' : 'RI.3.4'),
    });
    const evidencePrompt = `In "${passage.title}", ${passage.evidence.ask}`;
    push(made, {
      ...shared,
      prefix: 'ev',
      topic: 'evidence',
      topicLabel: 'Text evidence',
      prompt: evidencePrompt,
      choices: choiceSet(passage.evidence.sentence, passage.evidence.distractors, rngFor(evidencePrompt)),
      correctText: passage.evidence.sentence,
      explanation: passage.evidence.explanation,
      difficulty: passage.evidence.difficulty,
      verify: { kind: 'evidence' },
      ...skillFields(fiction ? 'RL.3.1' : 'RI.3.1'),
    });
  }
  return made;
}

function buildGrammar() {
  const made = [];
  Object.entries(TABLES.PAST).forEach(([verb, past], index) => {
    const prompt = `Which word is the past tense of "${verb}"?`;
    const choices = [past, verb, `${verb}ed`, `${verb}ing`];
    if (new Set(choices).size !== 4) return;
    push(made, {
      prefix: 'gr',
      section: 'map',
      topic: 'grammar',
      topicLabel: 'Grammar and language',
      prompt,
      choices: shuffle(choices, rngFor(prompt + index)),
      explanation: `"${verb}" does not become past tense by only adding -ed. The past tense is "${past}."`,
      difficulty: 2,
      verify: { kind: 'past', verb },
      ...skillFields('L.3.1'),
    });
  });
  Object.entries(TABLES.PLURAL).forEach(([word, plural]) => {
    const prompt = `Which word means more than one ${word}?`;
    const choices = [plural, word, `${word}s`, `${word}'s`].filter((item, index, arr) => arr.indexOf(item) === index);
    if (choices.length < 4) {
      choices.push(`${plural}es`);
    }
    const unique = [...new Set(choices)];
    if (unique.length < 4 || !unique.includes(plural)) return;
    let why = `${word} has a special plural: ${plural}.`;
    if (`${word}s` === plural) why = `For ${word}, add s to mean more than one: ${plural}.`;
    else if (word.endsWith('y') && plural.endsWith('ies')) why = `${word} ends in y after a consonant. Change y to i and add es: ${plural}.`;
    else if (plural.endsWith('ves')) why = `${word} changes its f or fe ending to ves: ${plural}.`;
    else if (['hero', 'tomato', 'potato'].includes(word)) why = `${word} ends in o, and this word adds es: ${plural}.`;
    else if (plural.endsWith('es') && `${word}s` !== plural) why = `${word} ends with a sound that needs es: ${plural}.`;
    push(made, {
      prefix: 'gr',
      section: 'map',
      topic: 'grammar',
      topicLabel: 'Grammar and language',
      prompt,
      choices: shuffle(unique.slice(0, 4), rngFor(prompt)),
      explanation: why,
      difficulty: `${word}s` === plural ? 1 : 2,
      verify: { kind: 'plural', word },
      ...skillFields('L.3.1'),
    });
  });
  const articleWords = [...TABLES.ARTICLE_AN, 'book', 'dog', 'kite', 'pencil', 'nest', 'map', 'ruler', 'clock', 'jar', 'seed', 'boot', 'wagon', 'house', 'tiger'];
  articleWords.forEach((word, index) => {
    const answer = TABLES.ARTICLE_AN.has(word) ? 'an' : 'a';
    const prompt = `${nameAt(index)} needs the article that matches the beginning sound of "${word}." Which word is it?`;
    const silent = word === 'hour' || word === 'honest';
    const why = silent
      ? `${word} starts with a silent h, so the first sound is a vowel sound. Use an.`
      : answer === 'an'
        ? `${word} starts with a vowel sound, so use an.`
        : `${word} starts with a consonant sound, so use a.`;
    push(made, {
      prefix: 'gr',
      section: 'map',
      topic: 'grammar',
      topicLabel: 'Grammar and language',
      prompt,
      choices: choiceSet(answer, answer === 'an' ? ['a', 'and', 'of'] : ['an', 'and', 'of'], rngFor(prompt)),
      explanation: `${why} "And" and "of" are not the article that matches this sound.`,
      difficulty: silent ? 3 : 1,
      verify: { kind: 'article', word },
      ...skillFields('L.3.1'),
    });
  });
  const verbs = ['bark', 'jump', 'play', 'sing', 'walk', 'paint', 'climb', 'laugh', 'draw', 'count', 'help', 'look'];
  const pluralSubjects = ['dogs', 'birds', 'children', 'players', 'rabbits', 'friends'];
  const singularSubjects = ['dog', 'bird', 'child', 'player', 'rabbit', 'friend'];
  verbs.forEach((verb, index) => {
    const plural = index % 2 === 0;
    const subject = (plural ? pluralSubjects : singularSubjects)[index % 6];
    const place = ['at the fence', 'on the stage', 'after lunch', 'by the pond', 'in the gym', 'near the door'][index % 6];
    const prompt = `Choose the form of "${verb}" that agrees with the subject: The ${subject} ____ ${place}.`;
    const answer = plural ? verb : `${verb}s`;
    push(made, {
      prefix: 'gr',
      section: 'map',
      topic: 'grammar',
      topicLabel: 'Grammar and language',
      prompt,
      choices: shuffle([verb, `${verb}s`, `${verb}ing`, `${verb}ed`], rngFor(prompt)),
      explanation: plural
        ? `"${subject}" is plural, so do not add s to the verb. Use ${answer}.`
        : `"${subject}" is one, so add s to the verb. Use ${answer}.`,
      difficulty: 2,
      verify: { kind: 'sv', plural, verb },
      ...skillFields('L.3.1'),
    });
  });
  const lists = [
    ['apples', 'cups', 'napkins'],
    ['pencils', 'erasers', 'clips'],
    ['red', 'blue', 'gold'],
    ['boots', 'hats', 'gloves'],
    ['bread', 'jam', 'pears'],
    ['maps', 'ropes', 'bottles'],
    ['drums', 'flutes', 'bells'],
    ['seals', 'otters', 'crabs'],
    ['roses', 'tulips', 'ferns'],
    ['chalk', 'paper', 'tape'],
    ['soups', 'rolls', 'grapes'],
    ['kites', 'balls', 'rackets'],
  ];
  lists.forEach((items, index) => {
    const prefix = ['We packed ', 'The box held ', 'They listed ', 'The sign named '][index % 4];
    const suffix = '.';
    const correct = `${prefix}${items[0]}, ${items[1]}, and ${items[2]}${suffix}`;
    const prompt = `Which sentence uses commas correctly for this list: ${items.join(', ')}?`;
    const distractors = [
      `${prefix}${items.join(' ')}${suffix}`,
      `${prefix}${items[0]} ${items[1]} and ${items[2]}${suffix}`,
      `${prefix}${items[0]}, ${items[1]} ${items[2]}${suffix}`,
    ];
    push(made, {
      prefix: 'gr',
      section: 'map',
      topic: 'grammar',
      topicLabel: 'Grammar and language',
      prompt,
      choices: choiceSet(correct, distractors, rngFor(prompt)),
      explanation: `Put a comma after each item in a list of three, including before and. ${correct}`,
      difficulty: 2,
      verify: { kind: 'series-comma', items, prefix, suffix },
      ...skillFields('L.3.2'),
    });
  });
  const dates = [
    ['March', 3, 2024, 'spring concert'],
    ['April', 12, 2025, 'science fair'],
    ['May', 8, 2026, 'family picnic'],
    ['June', 21, 2024, 'library visit'],
    ['July', 4, 2026, 'neighborhood parade'],
    ['August', 19, 2025, 'first soccer game'],
    ['September', 2, 2024, 'open house'],
    ['October', 31, 2025, 'story night'],
    ['November', 11, 2026, 'veterans assembly'],
    ['December', 9, 2024, 'winter concert'],
    ['January', 15, 2026, 'spelling bee'],
    ['February', 6, 2025, 'bake sale'],
  ];
  dates.forEach(([month, day, year, event]) => {
    const correct = `${month} ${day}, ${year}`;
    const prompt = `Which choice writes the date of the ${event} correctly?`;
    const distractors = [`${month}, ${day} ${year}`, `${month} ${day} ${year}`, `${day}, ${month} ${year}`];
    push(made, {
      prefix: 'gr',
      section: 'map',
      topic: 'grammar',
      topicLabel: 'Grammar and language',
      prompt,
      choices: choiceSet(correct, distractors, rngFor(prompt)),
      explanation: `Capitalize the month, write the day next, then a comma, then the year. ${correct} is written that way.`,
      difficulty: 1,
      verify: { kind: 'date', month, day, year },
      ...skillFields('L.3.2'),
    });
  });
  return made;
}

function buildCreative() {
  const prompts = [
    ['List many unusual uses for a paper clip. Then pick one idea and add details about who would use it and how.', 1],
    ['How could you change a backpack so it helps on a rainy walk to school? Give several different ideas.', 1],
    ['Suppose clouds were solid enough to sit on. What could people do that they cannot do now?', 2],
    ['Look at a pencil. Ask as many different questions as you can about it. Try not to repeat the same kind of question.', 1],
    ['A circle, two dots, and one line are on your page. What could the picture become? List many ideas, then finish one with extra details.', 2],
    ['Improve a lunch tray so it is easier for a third grader to carry. Think of changes to shape, material, and parts.', 2],
    ['What are many things a brick could be besides part of a wall? Sort your ideas into different kinds.', 1],
    ['Suppose shoes could talk at the end of the day. What might different shoes say, and what problem could their words solve?', 2],
    ['Invent a new playground feature that uses only things already on a playground. Describe how children would use it.', 2],
    ['A cardboard box arrives with no label. What could be inside? Give many ideas, including some that are surprising but still possible.', 1],
    ['How would you redesign a clock so a younger child could learn to read it? Offer more than one design.', 2],
    ['Suppose rain fell in colors. How might a town use that change? Think about art, safety, and science.', 3],
    ['List questions you could ask a bridge if it could answer. Then choose one question and imagine the answer with details.', 2],
    ['Improve a bicycle helmet so it is more comfortable and still safe. Give several kinds of changes.', 2],
    ['What could a forgotten sock become? Push past the first ordinary idea and add a detailed plan for one use.', 1],
    ['Suppose animals left advice instead of footprints. What advice might a squirrel, a crow, and a fish leave, and why?', 3],
    ['Design a class job that does not exist yet but would help your room. Explain the tools and the steps.', 2],
    ['A map shows only smells, not streets. What places could you find, and how would you draw the smells?', 3],
    ['How many ways could you measure the length of the classroom if you had no ruler? Name the methods and one detail for each.', 2],
    ['Improve a storybook so a reader who is learning English gets more help from the pages. Give different kinds of help.', 2],
    ['Suppose gravity took a short nap every day at noon. What would people need to plan for? List many effects.', 3],
    ['A triangle, a square, and a circle want a clubhouse. What could they build together, and what job would each shape have?', 2],
    ['Ask as many questions as you can about a closed door at the end of a hallway. Mix curious, careful, and funny questions.', 1],
    ['Turn a grocery bag into something useful for a picnic. Give several inventions and decorate one of them with details.', 1],
    ['What might a traffic light wish people understood? Write its message, then invent a new signal that could help.', 2],
    ['Suppose homework could be done by building, moving, or singing, not only by writing. Describe activities for a math idea.', 2],
    ['Improve the way a library returns books so the job is faster and kinder to the books. Offer more than one plan.', 2],
    ['A puddle is a window to somewhere else for five minutes. Where does it go, and what do you bring back?', 3],
    ['List unusual uses for a wooden spoon. Include uses at school, at home, and in a made-up place.', 1],
    ['Design a badge that celebrates a kind choice, not a score. What would someone do to earn it, and what would it look like?', 2],
  ];
  return prompts.map(([prompt, difficulty]) => sealCreative({
    prefix: 'cr',
    prompt: `${prompt} This challenge is for ideas, not a single correct answer.`,
    explanation: 'There is no single right answer. Fluency means many ideas. Flexibility means different kinds of ideas. Originality means a surprising idea. Elaboration means details. Use the checklist to notice your own thinking.',
    difficulty,
    rubric: [
      'I listed many ideas.',
      'My ideas are different kinds, not copies of one idea.',
      'At least one idea is unusual.',
      'I added details to my favorite idea.',
    ],
  }));
}
