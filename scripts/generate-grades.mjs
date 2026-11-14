import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TABLES,
  assertQuestion,
  cellLabel,
  expectedChoice,
  foldChoiceLabel,
  foldHoles,
  matrixAnswerCell,
  matrixCells,
} from '../src/lib/verify.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../seeds/questions');

const COLORS = [
  ['blue', '#2f6fed'],
  ['red', '#e23b3b'],
  ['green', '#2f9e6b'],
  ['gold', '#e2a308'],
  ['purple', '#7a45d6'],
];
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'hex', 'star'];
const SIZES = ['small', 'medium', 'large'];
const NAMES = ['Nora', 'Owen', 'Pia', 'Quinn', 'Rosa', 'Sam', 'Tara', 'Uma', 'Vik', 'Willa', 'Nico', 'Lila', 'Omar', 'Hana', 'Bea', 'Luis', 'Mina', 'Theo', 'Asha', 'Jo', 'Ida', 'Rex', 'Cleo', 'Wes'];

const lessons = {
  kCount: link('Khan Academy: Counting', 'https://www.khanacademy.org/math/cc-kindergarten-math/cc-kindergarten-counting'),
  kAdd: link('Khan Academy: Add within 5', 'https://www.khanacademy.org/math/cc-kindergarten-math/cc-kindergarten-add-subtract'),
  kShape: link('Khan Academy: Shapes', 'https://www.khanacademy.org/math/cc-kindergarten-math/cc-kindergarten-geometry'),
  g1Add: link('Khan Academy: Addition and subtraction', 'https://www.khanacademy.org/math/cc-1st-grade-math/cc-1st-add-subtract'),
  g1Place: link('Khan Academy: Place value', 'https://www.khanacademy.org/math/cc-1st-grade-math/cc-1st-place-value'),
  g1Measure: link('Khan Academy: Length and time', 'https://www.khanacademy.org/math/cc-1st-grade-math/cc-1st-measurement-geometry'),
  g2Add: link('Khan Academy: Add and subtract within 100', 'https://www.khanacademy.org/math/cc-2nd-grade-math/cc-2nd-add-subtract-100'),
  g2Place: link('Khan Academy: Numbers to 1,000', 'https://www.khanacademy.org/math/cc-2nd-grade-math/cc-2nd-place-value'),
  g2Money: link('Khan Academy: Money and time', 'https://www.khanacademy.org/math/cc-2nd-grade-math/x3184e0ec:money-and-time'),
  g4Mul: link('Khan Academy: Multiplication', 'https://www.khanacademy.org/math/cc-fourth-grade-math/imp-multiplication-and-division-2'),
  g4Frac: link('Khan Academy: Equivalent fractions', 'https://www.khanacademy.org/math/cc-fourth-grade-math/comparing-fractions-and-equivalent-fractions'),
  g4Dec: link('Khan Academy: Decimals', 'https://www.khanacademy.org/math/cc-fourth-grade-math/imp-decimals'),
  g5Frac: link('Khan Academy: Fraction operations', 'https://www.khanacademy.org/math/cc-fifth-grade-math/imp-fractions-3'),
  g5Dec: link('Khan Academy: Decimal place value', 'https://www.khanacademy.org/math/cc-fifth-grade-math/imp-decimals'),
  g5Vol: link('Khan Academy: Volume', 'https://www.khanacademy.org/math/cc-fifth-grade-math/5th-volume'),
  g5Plane: link('Khan Academy: Coordinate plane', 'https://www.khanacademy.org/math/cc-fifth-grade-math/cc-5th-place-value-decimals-top/cc-5th-coordinate-plane'),
  count: link('Math is Fun: Counting', 'https://www.mathsisfun.com/numbers/counting.html'),
  shapes: link('Math is Fun: Shapes', 'https://www.mathsisfun.com/geometry/shapes.html'),
  frac: link('Math is Fun: Fractions', 'https://www.mathsisfun.com/fractions.html'),
  dec: link('Math is Fun: Decimals', 'https://www.mathsisfun.com/decimals.html'),
  vol: link('Math is Fun: Volume of a cuboid', 'https://www.mathsisfun.com/geometry/cuboids.html'),
  plane: link('Math is Fun: Cartesian coordinates', 'https://www.mathsisfun.com/data/cartesian-coordinates.html'),
  money: link('Math is Fun: Money', 'https://www.mathsisfun.com/money/index.html'),
  time: link('Math is Fun: Time', 'https://www.mathsisfun.com/time.html'),
  kcc: link('Common Core K.CC.B.4', 'https://www.thecorestandards.org/Math/Content/K/CC/B/4/'),
  koa: link('Common Core K.OA.A.2', 'https://www.thecorestandards.org/Math/Content/K/OA/A/2/'),
  kg: link('Common Core K.G.A.2', 'https://www.thecorestandards.org/Math/Content/K/G/A/2/'),
  oa1: link('Common Core 1.OA.C.6', 'https://www.thecorestandards.org/Math/Content/1/OA/C/6/'),
  nbt1: link('Common Core 1.NBT.B.2', 'https://www.thecorestandards.org/Math/Content/1/NBT/B/2/'),
  nbt2: link('Common Core 2.NBT.B.5', 'https://www.thecorestandards.org/Math/Content/2/NBT/B/5/'),
  md2: link('Common Core 2.MD.C.8', 'https://www.thecorestandards.org/Math/Content/2/MD/C/8/'),
  nf4: link('Common Core 4.NF.A.1', 'https://www.thecorestandards.org/Math/Content/4/NF/A/1/'),
  nf4b: link('Common Core 4.NF.C.6', 'https://www.thecorestandards.org/Math/Content/4/NF/C/6/'),
  nf5: link('Common Core 5.NF.A.1', 'https://www.thecorestandards.org/Math/Content/5/NF/A/1/'),
  nbt5: link('Common Core 5.NBT.B.7', 'https://www.thecorestandards.org/Math/Content/5/NBT/B/7/'),
  md5: link('Common Core 5.MD.C.5', 'https://www.thecorestandards.org/Math/Content/5/MD/C/5/'),
  g5: link('Common Core 5.G.A.1', 'https://www.thecorestandards.org/Math/Content/5/G/A/1/'),
  rfk: link('Common Core RF.K.2', 'https://www.thecorestandards.org/ELA-Literacy/RF/K/2/'),
  l1: link('Common Core L.1.1', 'https://www.thecorestandards.org/ELA-Literacy/L/1/1/'),
  l2: link('Common Core L.2.1', 'https://www.thecorestandards.org/ELA-Literacy/L/2/1/'),
  l4: link('Common Core L.4.4', 'https://www.thecorestandards.org/ELA-Literacy/L/4/4/'),
  l5: link('Common Core L.5.4', 'https://www.thecorestandards.org/ELA-Literacy/L/5/4/'),
  ri: link('Common Core RI.2.1', 'https://www.thecorestandards.org/ELA-Literacy/RI/2/1/'),
  cube: link('ReadWriteThink: Cube Creator', 'https://www.readwritethink.org/classroom-resources/student-interactives/cube-creator'),
  pbs: link('PBS LearningMedia: Literacy', 'https://www.pbslearningmedia.org/subjects/english-language-arts-and-literacy/'),
};

function link(label, href) {
  return { label, href };
}

function why(lines) {
  const text = lines.map((line, index) => `Step ${index + 1}: ${line}`).join(' ');
  if (text.length < 40) throw new Error(`Short explanation: ${text}`);
  return text;
}

function kid(grade, index) {
  return NAMES[(grade * 5 + index) % NAMES.length];
}

function paint(shape, colorName, color, extra = {}) {
  return {
    shape,
    colorName,
    color,
    count: extra.count ?? 1,
    rotation: extra.rotation ?? 0,
    size: extra.size ?? 'medium',
  };
}

function choiceSet(answer, alts, salt) {
  const wanted = String(answer);
  const pool = [];
  for (const alt of alts) {
    const text = String(alt);
    if (text !== wanted && text !== '' && !pool.includes(text)) pool.push(text);
  }
  if (pool.length < 3) throw new Error(`Need 3 distractors for ${wanted}; got ${pool.join(', ')}`);
  const picks = pool.slice(0, 3);
  const answerIndex = Math.abs(salt) % 4;
  const choices = [];
  let offset = 0;
  for (let index = 0; index < 4; index += 1) {
    choices.push(index === answerIndex ? wanted : picks[offset++]);
  }
  return { choices, answerIndex };
}

function solved(verify, extra = {}) {
  const value = expectedChoice({ id: 'draft', choices: [], answerIndex: 0, ...extra, verify });
  if (value == null) throw new Error(`No recomputed answer for ${verify.kind}`);
  return String(value);
}

function near(answer) {
  const value = Number(answer);
  if (!Number.isInteger(value)) return [];
  return [value + 1, value - 1, value + 2, value + 10, value * 2, value + 5]
    .filter((item) => item !== value && item >= 0)
    .map(String);
}

class Bank {
  constructor(grade, prompts) {
    this.grade = grade;
    this.prefix = grade === 0 ? 'gk' : `g${grade}`;
    this.prompts = prompts;
    this.counts = {};
    this.byTopic = new Map();
    this.list = [];
  }

  add(question) {
    let prompt = question.prompt.trim().replace(/\s+/g, ' ');
    let key = prompt.toLowerCase();
    if (this.prompts.has(key)) {
      const room = ['Kindergarten', 'First grade', 'Second grade', '', 'Fourth grade', 'Fifth grade'][this.grade];
      prompt = `${room}: ${prompt}`;
      key = prompt.toLowerCase();
      if (this.prompts.has(key)) throw new Error(`Prompt already used: ${prompt}`);
    }
    this.prompts.add(key);
    question.prompt = prompt;
    const topic = question.topic;
    const number = (this.counts[topic] || 0) + 1;
    this.counts[topic] = number;
    const item = {
      ...question,
      id: `${this.prefix}-${topic}-${String(number).padStart(4, '0')}`,
      grade: this.grade,
      scored: question.scored !== false,
    };
    if (!item.scored) {
      if (!item.rubric || item.rubric.length < 4) throw new Error(`Rubric missing on ${item.id}`);
      if (!item.explanation || item.explanation.length < 40) throw new Error(`Explanation missing on ${item.id}`);
    } else {
      assertQuestion(item);
      if (!item.choices.includes(item.choices[item.answerIndex])) throw new Error(`Answer missing on ${item.id}`);
    }
    if (item.figure && !item.figure.alt) throw new Error(`Figure alt missing on ${item.id}`);
    if (!this.byTopic.has(topic)) this.byTopic.set(topic, []);
    this.byTopic.get(topic).push(item);
    this.list.push(item);
  }
}

function put(bank, partial, answer, alts) {
  const salt = partial.prompt.length + (bank.counts[partial.topic] || 0);
  const picked = choiceSet(answer, alts, salt);
  bank.add({ difficulty: ((bank.counts[partial.topic] || 0) % 3) + 1, scored: true, ...partial, ...picked });
}

function mathLinks(grade) {
  if (grade === 0) return [lessons.kAdd, lessons.koa];
  if (grade === 1) return [lessons.g1Add, lessons.oa1];
  if (grade === 2) return [lessons.g2Add, lessons.nbt2];
  if (grade === 4) return [lessons.g4Mul, lessons.nf4];
  return [lessons.g5Frac, lessons.nf5];
}

function buildSums(bank, topic, label, skill, low, high, cap) {
  let made = 0;
  for (let left = low; left <= high && made < cap; left += 1) {
    for (let right = 1; right <= high && made < cap; right += 1) {
      const total = left + right;
      if (bank.grade === 0 && total > 5) continue;
      if (bank.grade === 1 && total > 20) continue;
      if (bank.grade === 2 && total > 100) continue;
      const name = kid(bank.grade, made);
      const thing = ['stickers', 'shells', 'blocks', 'cards', 'marbles'][made % 5];
      const expr = `${left}+${right}`;
      const answer = solved({ kind: 'expr', expr });
      put(bank, {
        section: 'iready',
        topic,
        topicLabel: label,
        prompt: `${name} has ${left} ${thing} and gets ${right} more. How many ${thing} does ${name} have in all?`,
        explanation: why([
          `${name} starts with ${left} ${thing}.`,
          `Add the ${right} new ${thing}.`,
          `${left} + ${right} = ${answer}.`,
        ]),
        skill,
        skillLabel: label,
        links: mathLinks(bank.grade),
        verify: { kind: 'expr', expr },
      }, answer, near(answer));
      made += 1;
    }
  }
}

function buildDifferences(bank, cap) {
  let made = 0;
  const high = bank.grade === 0 ? 5 : bank.grade === 1 ? 20 : bank.grade === 2 ? 90 : 40;
  for (let whole = 2; whole <= high && made < cap; whole += bank.grade === 2 ? 3 : 1) {
    const part = 1 + (made % Math.max(1, whole - 1));
    if (part >= whole) continue;
    const name = kid(bank.grade, made + 7);
    const expr = `${whole}-${part}`;
    const answer = solved({ kind: 'expr', expr });
    const thing = ['apples', 'crayons', 'tokens', 'books'][made % 4];
    put(bank, {
      section: 'iready',
      topic: 'add-subtract',
      topicLabel: 'Add and subtract',
      prompt: `${name} had ${whole} ${thing} and gave away ${part}. How many ${thing} are left?`,
      explanation: why([
        `Start with ${whole}.`,
        `Take away ${part}.`,
        `${whole} - ${part} = ${answer}.`,
      ]),
      skill: bank.grade === 0 ? 'K.OA.A.2' : bank.grade === 1 ? '1.OA.C.6' : '2.NBT.B.5',
      skillLabel: 'Add and subtract',
      links: mathLinks(bank.grade),
      verify: { kind: 'expr', expr },
    }, answer, near(answer));
    made += 1;
  }
}

function buildProducts(bank, cap) {
  let made = 0;
  const pairs = bank.grade === 5
    ? [[12, 13], [14, 11], [15, 12], [16, 8], [18, 6], [20, 7], [24, 5], [25, 4], [23, 3], [19, 6], [17, 8], [21, 4]]
    : [[12, 3], [13, 4], [14, 5], [15, 6], [16, 4], [18, 3], [21, 4], [24, 3], [25, 4], [32, 3], [36, 2], [42, 2], [11, 8], [13, 6], [17, 3]];
  for (const [left, right] of pairs) {
    if (made >= cap) break;
    const name = kid(bank.grade, made + 2);
    const expr = `${left}*${right}`;
    const answer = solved({ kind: 'expr', expr });
    put(bank, {
      section: 'iready',
      topic: 'multiply',
      topicLabel: 'Multiplication',
      prompt: `${name} fills ${left} trays with ${right} muffins on each tray. How many muffins is that?`,
      explanation: why([
        `Each tray has ${right} muffins.`,
        `There are ${left} trays, so multiply.`,
        `${left} × ${right} = ${answer}.`,
      ]),
      skill: bank.grade === 5 ? '5.NBT.B.5' : '4.NBT.B.5',
      skillLabel: 'Multiplication',
      links: [lessons.g4Mul, lessons.nbt5],
      verify: { kind: 'expr', expr },
    }, answer, near(answer));
    made += 1;
  }
}

function buildSeries(bank, cap) {
  const specs = [];
  const starts = bank.grade === 0 ? [1, 2, 3, 4] : bank.grade === 1 ? [2, 4, 5, 8] : [3, 6, 7, 9, 11];
  const steps = bank.grade === 0 ? [1] : bank.grade === 1 ? [2, 5] : [3, 4, 6];
  for (const start of starts) {
    for (const step of steps) specs.push({ op: 'add', start, step });
  }
  if (bank.grade >= 2) {
    specs.push({ op: 'mul', start: 2, step: 2 }, { op: 'mul', start: 3, step: 2 }, { op: 'mul', start: 1, step: 3 });
  }
  specs.slice(0, cap).forEach((spec, index) => {
    const terms = [];
    let value = spec.start;
    for (let i = 0; i < 4; i += 1) {
      terms.push(value);
      value = spec.op === 'add' ? value + spec.step : value * spec.step;
    }
    const verify = { kind: 'series', op: spec.op, terms };
    const answer = solved(verify);
    const name = kid(bank.grade, index);
    put(bank, {
      section: 'cogat',
      topic: 'number-series',
      topicLabel: 'Number series',
      prompt: `${name} reads this number pattern: ${terms.join(', ')}. What number comes next?`,
      explanation: why([
        `Look at how the numbers change.`,
        spec.op === 'add' ? `Each number grows by ${spec.step}.` : `Each number is multiplied by ${spec.step}.`,
        `The next number is ${answer}.`,
      ]),
      skill: bank.grade === 0 ? 'K.CC.A.2' : '4.OA.C.5',
      skillLabel: 'Number patterns',
      links: bank.grade === 0 ? [lessons.kCount, lessons.kcc] : [lessons.g4Mul, lessons.oa1],
      verify,
    }, answer, near(answer));
  });
}

function buildMaps(bank, cap) {
  const rules = [
    { op: 'add', k: 3, pairs: [[2, 5], [4, 7]], input: 6 },
    { op: 'add', k: 10, pairs: [[1, 11], [5, 15]], input: 8 },
    { op: 'mul', k: 2, pairs: [[3, 6], [4, 8]], input: 7 },
    { op: 'mul', k: 3, pairs: [[2, 6], [5, 15]], input: 4 },
    { op: 'mul', k: 4, pairs: [[2, 8], [3, 12]], input: 5 },
    { op: 'sub', k: 2, pairs: [[9, 7], [6, 4]], input: 8 },
    { op: 'add', k: 5, pairs: [[3, 8], [7, 12]], input: 9 },
    { op: 'mul', k: 5, pairs: [[2, 10], [3, 15]], input: 6 },
  ];
  rules.slice(0, cap).forEach((rule, index) => {
    const verify = { kind: 'num-map', ...rule };
    const answer = solved(verify);
    const name = kid(bank.grade, index + 3);
    const shown = rule.pairs.map(([input, output]) => `${input} becomes ${output}`).join(' and ');
    put(bank, {
      section: 'cogat',
      topic: 'number-analogies',
      topicLabel: 'Number analogies',
      prompt: `${name} uses one rule. ${shown}. Using that same rule, what does ${rule.input} become?`,
      explanation: why([
        `Check the rule on the pairs that are already filled.`,
        rule.op === 'mul' ? `Each number is multiplied by ${rule.k}.` : rule.op === 'add' ? `Each number increases by ${rule.k}.` : `Each number decreases by ${rule.k}.`,
        `${rule.input} becomes ${answer}.`,
      ]),
      skill: '4.OA.A.3',
      skillLabel: 'Number rules',
      links: [lessons.g1Add, lessons.oa1],
      verify,
    }, answer, near(answer));
  });
}

function buildCompare(bank, cap) {
  const pairs = [[2, 5], [3, 8], [4, 1], [6, 9], [7, 2], [1, 10], [8, 3], [11, 19], [14, 9], [20, 16], [25, 32], [40, 27], [18, 41], [12, 30]];
  pairs.slice(0, cap).forEach(([left, right], index) => {
    const greater = index % 2 === 0;
    const verify = { kind: greater ? 'max' : 'min', values: [left, right] };
    const answer = solved(verify);
    const name = kid(bank.grade, index + 1);
    put(bank, {
      section: 'iready',
      topic: 'compare',
      topicLabel: 'Compare numbers',
      prompt: greater
        ? `${name} looks at ${left} and ${right}. Which number is greater?`
        : `${name} looks at ${left} and ${right}. Which number is less?`,
      explanation: why([
        `Read both numbers: ${left} and ${right}.`,
        greater ? 'The greater number is farther along the count.' : 'The lesser number comes first when you count.',
        `The answer is ${answer}.`,
      ]),
      skill: bank.grade === 0 ? 'K.CC.C.6' : '1.NBT.B.3',
      skillLabel: 'Compare numbers',
      links: bank.grade === 0 ? [lessons.kCount, lessons.kcc] : [lessons.g1Place, lessons.nbt1],
      verify,
    }, answer, [String(left), String(right), String(left + right), String(Math.abs(left - right))].filter((item, pos, list) => list.indexOf(item) === pos));
  });
}

function buildShapes(bank, cap) {
  const named = [
    ['triangle', 3],
    ['square', 4],
    ['rectangle', 4],
    ['pentagon', 5],
    ['hexagon', 6],
    ['octagon', 8],
  ];
  named.slice(0, cap).forEach(([shape, sides], index) => {
    const name = kid(bank.grade, index);
    const verify = { kind: 'sides', shape };
    const answer = solved(verify);
    put(bank, {
      section: 'iready',
      topic: 'shapes',
      topicLabel: 'Shapes',
      prompt: `${name} traces a ${shape}. How many sides does ${name} trace?`,
      explanation: why([
        `A ${shape} is a flat shape.`,
        `Count each straight side once.`,
        `There are ${answer} sides.`,
      ]),
      skill: bank.grade === 0 ? 'K.G.A.2' : '2.G.A.1',
      skillLabel: 'Shapes and sides',
      links: [lessons.kShape, lessons.shapes],
      figure: { kind: 'shape', shape, alt: `A ${shape}` },
      verify,
    }, answer, near(answer).concat(['0', '1', '12']));
  });
  const keys = [
    ['three-sides', 'triangle'],
    ['four-equal-sides-and-four-right-angles', 'square'],
    ['five-sides', 'pentagon'],
    ['six-sides', 'hexagon'],
    ['no-straight-sides', 'circle'],
    ['exactly-one-pair-of-parallel-sides', 'trapezoid'],
  ];
  keys.forEach((entry, index) => {
    if (bank.counts.shapes >= cap + 6) return;
    const [key, expected] = entry;
    const verify = { kind: 'shape-name', key };
    const answer = solved(verify);
    if (answer !== expected) throw new Error(`Shape name drift ${key}`);
    const name = kid(bank.grade, index + 4);
    const clue = key.split('-').join(' ');
    put(bank, {
      section: 'cogat',
      topic: 'shapes',
      topicLabel: 'Shapes',
      prompt: `${name} asks: which shape matches this clue: ${clue}?`,
      explanation: why([
        `Read the clue: ${clue}.`,
        'Match the clue to the shape name.',
        `The shape is a ${answer}.`,
      ]),
      skill: 'K.G.A.2',
      skillLabel: 'Name shapes',
      links: [lessons.kShape, lessons.kg],
      verify,
    }, answer, ['circle', 'triangle', 'square', 'pentagon', 'hexagon', 'trapezoid', 'rectangle', 'rhombus']);
  });
}

function buildCountPictures(bank, cap) {
  let made = 0;
  for (let count = 1; count <= 8 && made < cap; count += 1) {
    for (let shapeIndex = 0; shapeIndex < SHAPES.length && made < cap; shapeIndex += 2) {
      const shape = SHAPES[shapeIndex];
      const [colorName, color] = COLORS[made % COLORS.length];
      const name = kid(bank.grade, made);
      const cell = paint(shape, colorName, color, { count });
      const answer = String(count);
      const base = shape === 'hex' ? 'hexagon' : shape;
      const plural = count === 1 ? base : `${base}s`;
      const row = String.fromCharCode(65 + (made % 26));
      put(bank, {
        section: 'iready',
        topic: 'counting',
        topicLabel: 'Counting',
        prompt: `${name} set ${colorName} ${plural} in row ${row}. How many are in the picture?`,
        explanation: why([
          'Count each shape once.',
          `The picture shows ${answer} ${colorName} ${plural}.`,
          `The count is ${answer}.`,
        ]),
        skill: 'K.CC.B.4',
        skillLabel: 'Count objects',
        links: [lessons.kCount, lessons.count],
        figure: {
          kind: 'group',
          alt: `${count} ${colorName} ${plural}`,
          items: [cell],
        },
        verify: { kind: 'expr', expr: String(count) },
      }, answer, near(answer));
      made += 1;
    }
  }
}

function buildMatrices(bank, cap) {
  let made = 0;
  for (let i = 0; i < SHAPES.length && made < cap; i += 1) {
    for (let j = i + 1; j < SHAPES.length && made < cap; j += 1) {
      for (let c = 0; c < COLORS.length - 1 && made < cap; c += 2) {
        const verify = {
          kind: 'matrix',
          rule: 'col-shape-row-color',
          shapes: [SHAPES[i], SHAPES[j]],
          colorNames: [COLORS[c][0], COLORS[c + 1][0]],
          colors: [COLORS[c][1], COLORS[c + 1][1]],
        };
        const answerCell = matrixAnswerCell(verify);
        const answer = cellLabel(answerCell);
        const wrong = [
          paint(SHAPES[i], COLORS[c + 1][0], COLORS[c + 1][1]),
          paint(SHAPES[j], COLORS[c][0], COLORS[c][1]),
          paint(SHAPES[(j + 2) % SHAPES.length], COLORS[c + 1][0], COLORS[c + 1][1], { count: 2 }),
          paint(SHAPES[j], COLORS[c + 1][0], COLORS[c + 1][1], { rotation: 90 }),
        ].filter((cell) => cellLabel(cell) !== answer);
        const { choices, answerIndex } = choiceSet(answer, wrong.map(cellLabel), made + 4);
        const choiceFigures = choices.map((label) => {
          if (label === answer) return answerCell;
          const found = wrong.find((cell) => cellLabel(cell) === label);
          if (!found) throw new Error(`Matrix choice art missing for ${label}`);
          return found;
        });
        const cells = matrixCells(verify);
        const name = kid(bank.grade, made);
        bank.add({
          section: 'cogat',
          topic: 'figure-matrices',
          topicLabel: 'Figure matrices',
          prompt: `${name} needs the missing picture. Top row: ${cellLabel(cells[0])}, then ${cellLabel(cells[1])}. Bottom row starts with ${cellLabel(cells[2])}. Which picture belongs in the empty box?`,
          explanation: why([
            'Each column keeps the same shape.',
            'Each row keeps the same color.',
            `The empty box needs ${answer}.`,
          ]),
          skill: 'K.G.B.4',
          skillLabel: 'Picture patterns',
          difficulty: 2,
          links: [lessons.kShape, lessons.shapes],
          figure: {
            kind: 'matrix',
            cells,
            alt: `Two by two pattern. ${cellLabel(cells[0])}; ${cellLabel(cells[1])}; ${cellLabel(cells[2])}; empty box.`,
          },
          choiceFigures,
          choices,
          answerIndex,
          verify,
        });
        made += 1;
      }
    }
  }
}

function buildFolds(bank, cap) {
  const catalog = [];
  for (const axes of [['v'], ['h'], ['v', 'h']]) {
    for (const x of [18, 22, 28, 76, 82]) {
      for (const y of [16, 24, 34, 74, 86]) {
        const punch = { x, y };
        const holes = foldHoles(axes, punch);
        catalog.push({ axes, punch, holes, label: foldChoiceLabel(holes) });
      }
    }
  }
  const unique = [];
  const seen = new Set();
  for (const item of catalog) {
    if (seen.has(item.label)) continue;
    seen.add(item.label);
    unique.push(item);
  }
  for (let index = 0; index < cap; index += 1) {
    const item = unique[index];
    const distractors = unique.filter((other) => other.label !== item.label).slice(index, index + 3);
    if (!item || distractors.length < 3) throw new Error('Not enough paper-fold choices');
    const verify = { kind: 'fold', axes: item.axes, punch: item.punch };
    const answer = solved(verify);
    const { choices, answerIndex } = choiceSet(answer, distractors.map((other) => other.label), index + 2);
    const figures = new Map([[item.label, { kind: 'holes', holes: item.holes }]]);
    for (const other of distractors) figures.set(other.label, { kind: 'holes', holes: other.holes });
    const choiceFigures = choices.map((label) => {
      const figure = figures.get(label);
      if (!figure) throw new Error(`Fold art missing for ${label}`);
      return figure;
    });
    const name = kid(bank.grade, index + 6);
    const foldName = item.axes.length === 2 ? 'both the vertical and horizontal lines' : item.axes[0] === 'v' ? 'the vertical line' : 'the horizontal line';
    bank.add({
      section: 'cogat',
      topic: 'paper-folding',
      topicLabel: 'Paper folding',
      prompt: `${name} folds a square on ${foldName}, then punches at ${item.punch.x} across and ${item.punch.y} down. Where are the holes when the paper opens?`,
      explanation: why([
        'A fold makes a matching hole on the other side of that line.',
        `The punch starts at ${item.punch.x} across and ${item.punch.y} down.`,
        `Opened paper shows: ${answer}.`,
      ]),
      skill: '4.G.A.3',
      skillLabel: 'Paper folding',
      difficulty: item.axes.length === 2 ? 3 : 2,
      links: [lessons.kShape, lessons.shapes],
      figure: {
        kind: 'fold',
        axes: item.axes,
        punch: item.punch,
        alt: `A square folded on ${foldName}. The punch is ${item.punch.x} across and ${item.punch.y} down.`,
      },
      choiceFigures,
      choices,
      answerIndex,
      verify,
    });
  }
}

function buildClassify(bank, cap) {
  let made = 0;
  for (const shape of SHAPES) {
    if (made >= cap) break;
    const items = [0, 1, 2].map((index) => paint(shape, COLORS[index][0], COLORS[index][1], { size: SIZES[index] }));
    const answerCell = paint(shape, COLORS[3][0], COLORS[3][1], { size: 'large' });
    const wrong = [1, 2, 3].map((step) => paint(SHAPES[(SHAPES.indexOf(shape) + step) % SHAPES.length], COLORS[4][0], COLORS[4][1], { size: SIZES[step - 1] }));
    addClass(bank, made, 'shape', shape, items, answerCell, wrong, `${kid(bank.grade, made)} sorts picture set ${bank.grade}${made} on the art table`);
    made += 1;
  }
  for (const [colorName, color] of COLORS) {
    if (made >= cap) break;
    const items = [0, 1, 2].map((index) => paint(SHAPES[index], colorName, color, { size: SIZES[index] }));
    const answerCell = paint(SHAPES[4], colorName, color, { size: 'small' });
    const other = COLORS.find((entry) => entry[0] !== colorName);
    const wrong = [0, 1, 2].map((index) => paint(SHAPES[index + 1], other[0], other[1], { size: SIZES[index] }));
    addClass(bank, made, 'colorName', colorName, items, answerCell, wrong, `${kid(bank.grade, made)} groups color set ${bank.grade}${made} from the art bin`);
    made += 1;
  }
}

function addClass(bank, index, property, value, items, answerCell, wrong, lead) {
  const answer = cellLabel(answerCell);
  const alts = wrong.map(cellLabel).filter((label) => label !== answer);
  const { choices, answerIndex } = choiceSet(answer, alts, index + 9);
  const choiceFigures = choices.map((label) => {
    if (label === answer) return answerCell;
    const found = wrong.find((cell) => cellLabel(cell) === label);
    if (!found) throw new Error(`Class art missing for ${label}`);
    return found;
  });
  bank.add({
    section: 'cogat',
    topic: 'figure-classification',
    topicLabel: 'Figure classification',
    prompt: `${lead}. Which other picture belongs with them?`,
    explanation: why([
      'Find what stays the same in the three pictures.',
      property === 'shape' ? `Each picture is a ${value}.` : property === 'colorName' ? `Each picture is ${value}.` : `Each picture is ${value}.`,
      `The matching choice is ${answer}.`,
    ]),
    skill: 'K.G.A.2',
    skillLabel: 'Sort pictures',
    difficulty: 2,
    links: [lessons.kShape, lessons.shapes],
    figure: {
      kind: 'group',
      items,
      alt: `Three pictures that share ${property} ${value}.`,
    },
    choiceFigures,
    choices,
    answerIndex,
    verify: { kind: 'classify', property, value },
  });
}

function buildPlace(bank, cap) {
  const numbers = bank.grade === 1 ? [18, 27, 34, 46, 52, 63, 75, 81, 90, 14] : [128, 246, 305, 470, 512, 639, 704, 851, 960, 287, 143, 658];
  numbers.slice(0, cap).forEach((number, index) => {
    const place = bank.grade === 1 ? (index % 2 === 0 ? 'tens' : 'ones') : ['ones', 'tens', 'hundreds'][index % 3];
    const verify = { kind: 'place-digit', number, place };
    const answer = solved(verify);
    const name = kid(bank.grade, index);
    put(bank, {
      section: 'iready',
      topic: 'place-value',
      topicLabel: 'Place value',
      prompt: `${name} writes ${number}. Which digit is in the ${place} place?`,
      explanation: why([
        `In ${number}, find the ${place} place.`,
        'Ones are at the right. Tens are one step left. Hundreds are the next step left.',
        `The ${place} digit is ${answer}.`,
      ]),
      skill: bank.grade === 1 ? '1.NBT.B.2' : '2.NBT.A.1',
      skillLabel: 'Place value',
      links: bank.grade === 1 ? [lessons.g1Place, lessons.nbt1] : [lessons.g2Place, lessons.nbt2],
      verify,
    }, answer, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });
}

function buildRound(bank) {
  const rows = [[47, 10], [132, 100], [260, 100], [85, 10], [349, 100], [64, 10], [915, 100], [28, 10]];
  rows.forEach(([number, nearest], index) => {
    const verify = { kind: 'round', number, nearest };
    const answer = solved(verify);
    const name = kid(bank.grade, index + 2);
    put(bank, {
      section: 'iready',
      topic: 'place-value',
      topicLabel: 'Place value',
      prompt: `${name} rounds ${number} to the nearest ${nearest}. What is the rounded number?`,
      explanation: why([
        `Look at ${number} and the nearest ${nearest}.`,
        nearest === 10 ? 'Check the ones digit to decide whether to round up.' : 'Check the tens digit to decide whether to round up.',
        `${number} rounds to ${answer}.`,
      ]),
      skill: '4.NBT.A.3',
      skillLabel: 'Round numbers',
      links: [lessons.g2Place, lessons.nbt2],
      verify,
    }, answer, near(answer));
  });
}

function buildClocks(bank, cap) {
  const times = [[3, 0], [6, 0], [9, 30], [1, 15], [4, 45], [7, 30], [10, 0], [2, 30], [8, 15], [11, 45], [5, 0], [12, 30]];
  times.slice(0, cap).forEach(([hour, minute], index) => {
    const verify = { kind: 'clock', h: hour, m: minute };
    const answer = solved(verify);
    const name = kid(bank.grade, index);
    const alts = times.filter(([h, m]) => h !== hour || m !== minute).map(([h, m]) => solved({ kind: 'clock', h, m }));
    put(bank, {
      section: 'iready',
      topic: 'time',
      topicLabel: 'Time',
      prompt: `${name} checks the clock in the picture. What time does it show?`,
      explanation: why([
        'The short hand tells the hour.',
        'The long hand tells the minutes.',
        `The clock shows ${answer}.`,
      ]),
      skill: bank.grade <= 1 ? '1.MD.B.3' : '2.MD.C.7',
      skillLabel: 'Tell time',
      links: [lessons.g1Measure, lessons.time],
      figure: { kind: 'clock', h: hour, m: minute, alt: `A clock showing ${answer}` },
      verify,
    }, answer, alts);
  });
}

function buildElapsed(bank, cap) {
  const rows = [[2, 10, 15], [3, 20, 30], [4, 0, 45], [7, 15, 20], [9, 40, 10], [1, 5, 25], [11, 30, 20], [6, 50, 5]];
  rows.slice(0, cap).forEach(([hour, minute, add], index) => {
    const verify = { kind: 'time-add', h: hour, m: minute, add };
    const answer = solved(verify);
    const name = kid(bank.grade, index + 4);
    put(bank, {
      section: 'iready',
      topic: 'time',
      topicLabel: 'Time',
      prompt: `${name} starts reading at ${solved({ kind: 'clock', h: hour, m: minute })} and reads for ${add} minutes. What time is it then?`,
      explanation: why([
        `The start time is ${hour}:${String(minute).padStart(2, '0')}.`,
        `Add ${add} minutes.`,
        `The end time is ${answer}.`,
      ]),
      skill: '3.MD.A.1',
      skillLabel: 'Elapsed time',
      links: [lessons.g2Money, lessons.time],
      verify,
    }, answer, ['1:00', '2:00', '3:30', '4:45', '6:15', '8:20', '10:10', '12:05']);
  });
}

function buildMoney(bank) {
  const coins = [
    ['1 quarter and 1 dime', 35],
    ['2 dimes and 1 nickel', 25],
    ['3 nickels', 15],
    ['1 quarter and 2 pennies', 27],
    ['4 dimes', 40],
    ['1 dime and 3 pennies', 13],
    ['2 quarters', 50],
    ['1 quarter, 1 dime, and 1 nickel', 40],
    ['6 pennies and 1 nickel', 11],
    ['1 dime and 1 nickel and 2 pennies', 17],
    ['3 dimes and 1 penny', 31],
    ['1 quarter and 1 nickel', 30],
  ];
  coins.forEach(([phrase, cents], index) => {
    const verify = { kind: 'money', cents };
    const answer = solved(verify);
    const name = kid(bank.grade, index);
    const alts = [cents + 5, cents - 5, cents + 10, cents + 1].filter((item) => item > 0).map((item) => solved({ kind: 'money', cents: item }));
    put(bank, {
      section: 'iready',
      topic: 'money',
      topicLabel: 'Money',
      prompt: `${name} has ${phrase}. How much money is that?`,
      explanation: why([
        'Add the value of each coin.',
        `The coins make ${cents} cents.`,
        `That is ${answer}.`,
      ]),
      skill: '2.MD.C.8',
      skillLabel: 'Count coins',
      links: [lessons.g2Money, lessons.money],
      verify,
    }, answer, alts);
  });
}

function buildFractions(bank) {
  const sums = [[[1, 4], [1, 4]], [[1, 2], [1, 4]], [[1, 3], [1, 6]], [[2, 5], [1, 5]], [[1, 8], [3, 8]], [[1, 2], [1, 3]], [[3, 10], [1, 10]], [[2, 8], [1, 8]], [[1, 6], [1, 3]], [[3, 4], [1, 8]]];
  const diffs = [[[3, 4], [1, 4]], [[5, 6], [1, 6]], [[1, 2], [1, 6]], [[7, 8], [1, 8]], [[4, 5], [1, 5]], [[2, 3], [1, 6]], [[5, 8], [1, 4]], [[9, 10], [3, 10]]];
  const pairs = bank.grade === 5 ? [...sums, ...diffs] : sums;
  pairs.forEach((pair, index) => {
    const subtracting = bank.grade === 5 && index >= sums.length;
    const verify = { kind: subtracting ? 'fraction-diff' : 'fraction-sum', left: pair[0], right: pair[1] };
    const answer = solved(verify);
    const name = kid(bank.grade, index);
    const sign = subtracting ? '-' : '+';
    const show = (part) => `${part[0]}/${part[1]}`;
    put(bank, {
      section: 'iready',
      topic: 'fractions',
      topicLabel: 'Fractions',
      prompt: `${name} computes ${show(pair[0])} ${sign} ${show(pair[1])}. What is the result in simplest form?`,
      explanation: why([
        subtracting ? 'Subtract the fractions by using a common denominator.' : 'Add the fractions by using a common denominator.',
        'Write the result as a fraction.',
        `In simplest form the result is ${answer}.`,
      ]),
      skill: bank.grade === 5 ? '5.NF.A.1' : '4.NF.B.3',
      skillLabel: 'Fraction operations',
      links: bank.grade === 5 ? [lessons.g5Frac, lessons.nf5] : [lessons.g4Frac, lessons.frac],
      verify,
    }, answer, ['1/2', '1/3', '1/4', '2/3', '3/4', '3/5', '5/6', '7/8', '1/8', '2/5', '4/5', '5/8']);
  });
  const equivalents = [[1, 2, '2/4'], [1, 3, '2/6'], [2, 3, '4/6'], [3, 4, '6/8'], [1, 4, '2/8'], [2, 5, '4/10']];
  equivalents.forEach(([num, den, shown], index) => {
    const foils = ['1/5', '3/5', '2/7', '5/6', '3/8', '7/9'].filter((choice) => {
      const [a, b] = choice.split('/').map(Number);
      return a * den !== b * num;
    });
    const { choices, answerIndex } = choiceSet(shown, foils, index + 3);
    bank.add({
      section: 'iready',
      topic: 'fractions',
      topicLabel: 'Fractions',
      prompt: `${kid(bank.grade, index + 3)} looks for a fraction equal to ${num}/${den}. Which choice is equivalent?`,
      explanation: why([
        `An equivalent fraction names the same amount as ${num}/${den}.`,
        'Multiply the numerator and denominator by the same number.',
        `${shown} is equal to ${num}/${den}.`,
      ]),
      skill: '4.NF.A.1',
      skillLabel: 'Equivalent fractions',
      difficulty: 2,
      links: [lessons.g4Frac, lessons.nf4],
      choices,
      answerIndex,
      verify: { kind: 'equivalent', num, den },
    });
  });
}

function buildDecimals(bank) {
  const adds = bank.grade === 5 ? [[125, 40], [250, 125], [375, 50], [60, 15], [210, 135], [480, 25], [305, 190], [640, 275]] : [[13, 14], [21, 6], [32, 5], [41, 7], [15, 18], [24, 13], [36, 8], [47, 6], [18, 21], [27, 12]];
  adds.forEach(([left, right], index) => {
    const scale = bank.grade === 5 ? 100 : 10;
    const verify = { kind: 'decimal-add', left, right, scale };
    const answer = solved(verify);
    const show = (part) => (part / scale).toFixed(scale === 100 ? 2 : 1);
    const name = kid(bank.grade, index);
    put(bank, {
      section: 'iready',
      topic: 'decimals',
      topicLabel: 'Decimals',
      prompt: `${name} adds ${show(left)} and ${show(right)}. What is the sum?`,
      explanation: why([
        'Line up the decimal points.',
        `Add ${show(left)} and ${show(right)}.`,
        `The sum is ${answer}.`,
      ]),
      skill: bank.grade === 5 ? '5.NBT.B.7' : '4.NF.C.6',
      skillLabel: 'Add decimals',
      links: bank.grade === 5 ? [lessons.g5Dec, lessons.nbt5] : [lessons.g4Dec, lessons.dec],
      verify,
    }, answer, [show(left + right + (scale === 100 ? 10 : 1)), show(Math.max(0, left + right - (scale === 100 ? 10 : 1))), show(left), show(right), '0.5', '1.0', '9.9']);
  });
  if (bank.grade === 5) {
    [[250, 125], [480, 255], [90, 40], [375, 150], [640, 215], [305, 80]].forEach(([left, right], index) => {
      const verify = { kind: 'decimal-sub', left, right, scale: 100 };
      const answer = solved(verify);
      const show = (part) => (part / 100).toFixed(2);
      put(bank, {
        section: 'iready',
        topic: 'decimals',
        topicLabel: 'Decimals',
        prompt: `${kid(bank.grade, index + 8)} subtracts ${show(right)} from ${show(left)}. What is the difference?`,
        explanation: why([
          'Line up the decimal points.',
          `Subtract ${show(right)} from ${show(left)}.`,
          `The difference is ${answer}.`,
        ]),
        skill: '5.NBT.B.7',
        skillLabel: 'Subtract decimals',
        links: [lessons.g5Dec, lessons.dec],
        verify,
      }, answer, [show(left), show(right), '0.25', '1.10', '3.00', '4.40']);
    });
  }
}

function buildVolume(bank) {
  const boxes = [[2, 3, 4], [5, 2, 2], [4, 4, 3], [6, 2, 3], [3, 3, 3], [8, 2, 2], [5, 4, 2], [7, 2, 1], [6, 5, 2], [4, 3, 5], [9, 2, 2], [3, 5, 4]];
  boxes.forEach(([length, width, height], index) => {
    const expr = `(${length}*${width})*${height}`;
    const answer = solved({ kind: 'expr', expr });
    const name = kid(bank.grade, index);
    put(bank, {
      section: 'iready',
      topic: 'volume',
      topicLabel: 'Volume',
      prompt: `${name} packs a box that is ${length} units long, ${width} units wide, and ${height} units tall. What is the volume in cubic units?`,
      explanation: why([
        'Volume of a rectangular box is length times width times height.',
        `Multiply ${length} × ${width} × ${height}.`,
        `The volume is ${answer} cubic units.`,
      ]),
      skill: '5.MD.C.5',
      skillLabel: 'Volume',
      links: [lessons.g5Vol, lessons.vol],
      verify: { kind: 'expr', expr },
    }, answer, near(answer));
  });
}

function buildPoints(bank) {
  const points = [[1, 2], [3, 1], [4, 4], [0, 5], [2, 6], [5, 0], [6, 3], [3, 5], [7, 2], [2, 8], [8, 1], [4, 7]];
  points.forEach(([x, y], index) => {
    const verify = { kind: 'point', x, y };
    const answer = solved(verify);
    const name = kid(bank.grade, index);
    const alts = [[y, x], [x + 1, y], [x, y + 1], [0, x], [y, 0], [x + 1, y + 1], [Math.max(0, x - 1), y]].map(([px, py]) => solved({ kind: 'point', x: px, y: py }));
    put(bank, {
      section: 'iready',
      topic: 'coordinate-plane',
      topicLabel: 'Coordinate plane',
      prompt: `${name} starts at the origin, moves ${x} units right, then ${y} units up. Which ordered pair names that point?`,
      explanation: why([
        'The first number tells how far right from the origin.',
        'The second number tells how far up.',
        `The point is ${answer}.`,
      ]),
      skill: '5.G.A.1',
      skillLabel: 'Coordinate plane',
      links: [lessons.g5Plane, lessons.plane],
      verify,
    }, answer, alts);
  });
}

function buildArea(bank) {
  const rects = [[3, 2], [4, 3], [5, 4], [6, 2], [7, 3], [8, 4], [5, 5], [9, 2]];
  rects.forEach(([length, width], index) => {
    const expr = `${length}*${width}`;
    const answer = solved({ kind: 'expr', expr });
    const name = kid(bank.grade, index + 1);
    put(bank, {
      section: 'iready',
      topic: 'area',
      topicLabel: 'Area',
      prompt: `${name} tiles a rectangle that is ${length} units long and ${width} units wide. What is the area in square units?`,
      explanation: why([
        'Area of a rectangle is length times width.',
        `Multiply ${length} × ${width}.`,
        `The area is ${answer} square units.`,
      ]),
      skill: bank.grade >= 4 ? '4.MD.A.3' : '3.MD.C.7',
      skillLabel: 'Area',
      links: [lessons.g4Mul, lessons.shapes],
      figure: { kind: 'rect', l: length, w: width, unit: 'units', alt: `A ${length} by ${width} rectangle` },
      verify: { kind: 'expr', expr },
    }, answer, near(answer));
  });
}

function buildData(bank) {
  const charts = [
    ['Books read', 'books', [['Ana', 2], ['Bo', 5], ['Cy', 3]]],
    ['Goals scored', 'goals', [['Mia', 4], ['Ned', 1], ['Oli', 6]]],
    ['Birds seen', 'birds', [['Dot', 3], ['Eli', 3], ['Fay', 8]]],
    ['Cans recycled', 'cans', [['Gus', 6], ['Hana', 2], ['Ian', 4]]],
    ['Miles walked', 'miles', [['Jin', 1], ['Kai', 4], ['Lux', 2]]],
    ['Stars earned', 'stars', [['Noa', 5], ['Paz', 2], ['Rue', 7]]],
  ];
  charts.forEach(([title, unit, rows], index) => {
    const figure = {
      kind: 'bars',
      title,
      unit,
      rows: rows.map(([label, value]) => ({ label, value })),
      alt: `Bar graph titled ${title}. ${rows.map(([label, value]) => `${label} has ${value}`).join('; ')}.`,
    };
    const [top] = [...rows].sort((a, b) => b[1] - a[1]);
    const verify = { kind: 'table-value', label: top[0] };
    const answer = solved(verify, { figure });
    const name = kid(bank.grade, index);
    put(bank, {
      section: 'iready',
      topic: 'data',
      topicLabel: 'Graphs and data',
      prompt: `${name} reads the bar graph titled ${title}. How many ${unit} does ${top[0]} have?`,
      explanation: why([
        `Find the bar for ${top[0]}.`,
        `Read the value of that bar.`,
        `${top[0]} has ${answer} ${unit}.`,
      ]),
      skill: '2.MD.D.10',
      skillLabel: 'Bar graphs',
      links: [lessons.g1Measure, lessons.count],
      figure,
      verify,
    }, answer, near(answer));
  });
}

function buildRhymes(bank) {
  const rows = [
    ['cat', 'hat', 'at', ['dog', 'sun', 'cup']],
    ['log', 'frog', 'og', ['pen', 'map', 'hill']],
    ['pin', 'fin', 'in', ['cat', 'dog', 'cup']],
    ['bug', 'rug', 'ug', ['hat', 'sun', 'tree']],
    ['cake', 'lake', 'ake', ['dog', 'moon', 'fish']],
    ['star', 'car', 'ar', ['cup', 'hen', 'log']],
    ['bell', 'shell', 'ell', ['dog', 'sun', 'map']],
    ['rock', 'sock', 'ock', ['pen', 'fish', 'tree']],
    ['king', 'ring', 'ing', ['cat', 'dog', 'sun']],
    ['boat', 'goat', 'oat', ['pin', 'cup', 'map']],
    ['tree', 'bee', 'ee', ['log', 'hat', 'sun']],
    ['fish', 'dish', 'ish', ['car', 'pen', 'log']],
    ['mouse', 'house', 'ouse', ['bell', 'cup', 'star']],
    ['light', 'night', 'ight', ['frog', 'bell', 'cake']],
    ['snow', 'glow', 'ow', ['pin', 'cat', 'bug']],
    ['train', 'rain', 'ain', ['sock', 'bell', 'fish']],
    ['book', 'hook', 'ook', ['car', 'star', 'king']],
    ['jump', 'bump', 'ump', ['hat', 'bee', 'lake']],
  ];
  rows.forEach(([word, answer, ending, foils], index) => {
    const name = kid(0, index);
    const { choices, answerIndex } = choiceSet(answer, foils, index + 1);
    bank.add({
      section: 'cogat',
      topic: 'rhymes',
      topicLabel: 'Rhymes',
      prompt: `${name} needs a word that rhymes with ${word}. Which word rhymes with ${word}?`,
      explanation: why([
        `Say ${word} and listen to the ending.`,
        `A rhyme ends with the same sound, "${ending}".`,
        `${answer} rhymes with ${word}.`,
      ]),
      skill: 'RF.K.2',
      skillLabel: 'Rhyming words',
      difficulty: 1,
      links: [lessons.rfk, lessons.pbs],
      choices,
      answerIndex,
      verify: { kind: 'rhyme', ending },
    });
  });
}

function buildAnalogies(bank) {
  const rows = [
    ['glove', 'hand', 'sock', 'foot', 'A glove covers a hand, and a sock covers a foot.'],
    ['beak', 'bird', 'fin', 'fish', 'A beak is a bird part, and a fin is a fish part.'],
    ['teacher', 'school', 'doctor', 'hospital', 'A teacher works at a school, and a doctor works at a hospital.'],
    ['cub', 'lion', 'calf', 'cow', 'A cub is a young lion, and a calf is a young cow.'],
    ['petal', 'flower', 'feather', 'bird', 'A petal is part of a flower, and a feather is part of a bird.'],
    ['author', 'book', 'painter', 'picture', 'An author makes a book, and a painter makes a picture.'],
    ['pilot', 'airplane', 'captain', 'ship', 'A pilot flies an airplane, and a captain leads a ship.'],
    ['seed', 'plant', 'egg', 'bird', 'A seed grows into a plant, and an egg can hold a baby bird.'],
    ['finger', 'hand', 'toe', 'foot', 'A finger is part of a hand, and a toe is part of a foot.'],
    ['whisper', 'quiet', 'shout', 'loud', 'A whisper is quiet, and a shout is loud.'],
    ['begin', 'start', 'end', 'finish', 'Begin means start, and end means finish.'],
    ['tiny', 'small', 'huge', 'large', 'Tiny means small, and huge means large.'],
    ['chilly', 'cold', 'scorching', 'hot', 'Chilly means cold, and scorching means hot.'],
    ['wheel', 'wagon', 'sail', 'boat', 'A wheel helps a wagon move, and a sail helps a boat move.'],
    ['page', 'book', 'drawer', 'desk', 'A page is part of a book, and a drawer is part of a desk.'],
    ['key', 'lock', 'lid', 'jar', 'A key opens a lock, and a lid covers a jar.'],
    ['branch', 'tree', 'sleeve', 'coat', 'A branch is part of a tree, and a sleeve is part of a coat.'],
    ['rain', 'wet', 'sun', 'bright', 'Rain makes things wet, and the sun makes the day bright.'],
  ];
  const frames = [
    (a, b, c, name) => `${name} says ${a} goes with ${b}. In the same way, ${c} goes with ____.`,
    (a, b, c, name) => `${name} finishes the pair: ${a} is to ${b} as ${c} is to ____.`,
    (a, b, c, name) => `On ${name}'s analogy card, ${a} matches ${b}. What matches ${c}?`,
  ];
  rows.forEach(([a, b, c, answer, reason], index) => {
    const name = kid(bank.grade, index);
    const frame = frames[bank.grade % frames.length];
    put(bank, {
      section: 'cogat',
      topic: 'verbal-analogies',
      topicLabel: 'Verbal analogies',
      prompt: frame(a, b, c, name),
      explanation: why([
        `Look at how ${a} and ${b} go together.`,
        reason,
        `So ${c} goes with ${answer}.`,
      ]),
      skill: bank.grade === 0 ? 'L.K.5' : `L.${bank.grade}.5`,
      skillLabel: 'Word relationships',
      links: [lessons.pbs, lessons.cube],
      verify: { kind: 'authored' },
    }, answer, ['house', 'water', 'pencil', 'cloud', 'window', 'garden', 'music', a, b]);
  });
}

function buildGrammar(bank, cap) {
  const plurals = Object.entries(TABLES.PLURAL);
  plurals.slice(0, cap).forEach(([word, plural], index) => {
    const foils = plurals.map(([, other]) => other).filter((other) => other !== plural);
    const name = kid(bank.grade, index);
    put(bank, {
      section: 'map',
      topic: 'grammar',
      topicLabel: 'Grammar',
      prompt: `${name} is writing about more than one ${word}. Which word should ${name} use?`,
      explanation: why([
        `The sentence needs the plural of ${word}.`,
        'A plural means more than one.',
        `The plural is ${plural}.`,
      ]),
      skill: bank.grade === 1 ? 'L.1.1' : 'L.2.1',
      skillLabel: 'Plural nouns',
      links: bank.grade === 1 ? [lessons.l1, lessons.pbs] : [lessons.l2, lessons.pbs],
      verify: { kind: 'plural', word },
    }, plural, foils);
  });
  const verbs = Object.entries(TABLES.PAST).slice(0, Math.max(8, cap - 8));
  verbs.forEach(([verb, past], index) => {
    const foils = Object.values(TABLES.PAST).filter((other) => other !== past);
    const name = kid(bank.grade, index + 2);
    put(bank, {
      section: 'map',
      topic: 'grammar',
      topicLabel: 'Grammar',
      prompt: `${name} tells about yesterday and needs the past tense of ${verb}. Which word is the past tense?`,
      explanation: why([
        `Yesterday needs the past tense of ${verb}.`,
        'The past tense tells what already happened.',
        `The past tense is ${past}.`,
      ]),
      skill: bank.grade === 1 ? 'L.1.1' : 'L.2.1',
      skillLabel: 'Past tense verbs',
      links: bank.grade === 1 ? [lessons.l1, lessons.cube] : [lessons.l2, lessons.cube],
      verify: { kind: 'past', verb },
    }, past, foils);
  });
}

function buildRoots(bank) {
  const roots = ['geo', 'tele', 'photo', 'aqua', 'bio', 'therm', 'aud', 'graph', 'scope', 'chron', 'port', 'rupt', 'struct', 'dict', 'tract', 'ject', 'vis', 'meter', 'cycl', 'phon'];
  const meanings = ['earth', 'far', 'light', 'water', 'life', 'heat', 'hear', 'write', 'see', 'time', 'carry', 'break', 'build', 'say', 'pull', 'throw', 'see', 'measure', 'circle', 'sound'];
  roots.forEach((root, index) => {
    const name = kid(bank.grade, index);
    const prompt = bank.grade === 4
      ? `${name} studies the root ${root}. What does ${root} mean?`
      : `${name} reads a word built on the root ${root}. Which meaning belongs to ${root}?`;
    const { choices, answerIndex } = choiceSet(meanings[index], meanings.filter((item) => item !== meanings[index]), index + 5);
    bank.add({
      section: 'map',
      topic: 'roots',
      topicLabel: 'Greek and Latin roots',
      prompt,
      explanation: why([
        `Find the root ${root} inside the longer word.`,
        `That root has one meaning to remember.`,
        `${root} means ${meanings[index]}.`,
      ]),
      skill: bank.grade === 5 ? 'L.5.4' : 'L.4.4',
      skillLabel: 'Greek and Latin roots',
      difficulty: 2,
      links: bank.grade === 5 ? [lessons.l5, lessons.pbs] : [lessons.l4, lessons.pbs],
      choices,
      answerIndex,
      verify: { kind: 'root', root },
    });
  });
}

function buildReading(bank) {
  const packs = stories(bank.grade);
  packs.forEach((story) => {
    const passage = story.sentences.join(' ');
    story.sentences.forEach((sentence, index) => {
      const foils = story.foils[index];
      put(bank, {
        section: 'map',
        topic: 'evidence',
        topicLabel: 'Text evidence',
        prompt: `${story.ask[index]}`,
        passageTitle: story.title,
        passage,
        explanation: why([
          'Read the question, then look back at the passage.',
          'The answer must be a sentence that is written there.',
          `The passage says: ${sentence}`,
        ]),
        skill: bank.grade === 0 ? 'RI.K.1' : `RI.${bank.grade}.1`,
        skillLabel: 'Find evidence',
        links: [lessons.ri, lessons.pbs],
        verify: { kind: 'evidence' },
      }, sentence, foils);
    });
    const { choices, answerIndex } = choiceSet(story.vocab.meaning, story.vocab.foils, story.title.length);
    bank.add({
      section: 'map',
      topic: 'vocabulary',
      topicLabel: 'Vocabulary',
      prompt: story.vocab.prompt,
      passageTitle: story.title,
      passage,
      explanation: why([
        `Find the word "${story.vocab.word}" in the passage.`,
        'Use the sentences around it to check the meaning.',
        `${story.vocab.word} means ${story.vocab.meaning}.`,
      ]),
      skill: bank.grade === 0 ? 'L.K.4' : `L.${bank.grade}.4`,
      skillLabel: 'Vocabulary in context',
      difficulty: 2,
      links: [lessons.pbs, lessons.cube],
      choices,
      answerIndex,
      verify: { kind: 'vocab', word: story.vocab.word },
    });
    put(bank, {
      section: 'map',
      topic: 'inference',
      topicLabel: 'Inference',
      prompt: story.infer.prompt,
      passageTitle: story.title,
      passage,
      explanation: why(story.infer.steps),
      skill: bank.grade === 0 ? 'RI.K.1' : `RI.${bank.grade}.1`,
      skillLabel: 'Make an inference',
      difficulty: 2,
      links: [lessons.ri, lessons.cube],
      verify: { kind: 'authored' },
    }, story.infer.answer, story.infer.foils);
  });
}

function stories(grade) {
  if (grade === 0) {
    return [
      story('The Red Wagon', [
        'Nora pulled a red wagon.',
        'The wagon held two blocks.',
        'A blue ball fell out.',
      ], [
        ['Which sentence tells what Nora pulled?', ['Nora pushed a green cart.', 'The wagon held nine blocks.', 'A yellow kite flew away.']],
        ['Which sentence tells what the wagon held?', ['The wagon held nine blocks.', 'Nora lost her hat.', 'A blue bird sang.']],
        ['Which sentence tells what fell?', ['A green hat fell in.', 'The blocks flew away.', 'Nora sat on a bench.']],
      ], vocab('wagon', 'a cart you can pull', ['a kind of soup', 'a number', 'a loud sound'], 'In the story, what is a wagon?'), infer('Why did the blue ball need to be picked up?', 'It fell out of the wagon.', ['It was time for a nap.', 'The wagon was brand new.', 'Nora wanted a kite.'], ['The passage says a blue ball fell out.', 'Something that falls needs to be picked up.', 'The best clue is the ball falling.'])),
      story('Snack Time', [
        'Pia set three cups on the table.',
        'Each cup had milk.',
        'Sam drank from the blue cup.',
      ], [
        ['Which sentence tells how many cups Pia set down?', ['Pia set eight cups on the table.', 'The cups were full of juice.', 'Sam drank from a green mug.']],
        ['Which sentence tells what was in the cups?', ['Each cup had water.', 'Pia hid the cups.', 'Sam washed a plate.']],
        ['Which sentence tells what Sam did?', ['Sam drank from the red cup.', 'Pia drank all the milk.', 'The cups fell down.']],
      ], vocab('cups', 'containers you can drink from', ['animals', 'songs', 'clouds'], 'What are cups in this story?'), infer('What did Sam drink?', 'Milk', ['Juice', 'Water', 'Soup'], ['Each cup had milk.', 'Sam drank from the blue cup.', 'So Sam drank milk.'])),
      story('Park Walk', [
        'Quinn saw a brown dog.',
        'The dog chased a red ball.',
        'Quinn clapped and smiled.',
      ], [
        ['Which sentence tells what Quinn saw?', ['Quinn saw a white cat.', 'The dog chased a blue hat.', 'Quinn sat and frowned.']],
        ['Which sentence tells what the dog chased?', ['The dog chased a blue hat.', 'Quinn threw a stick.', 'A bird built a nest.']],
        ['Which sentence tells how Quinn felt at the end?', ['Quinn cried and hid.', 'The dog went to sleep.', 'Quinn lost a shoe.']],
      ], vocab('chased', 'ran after', ['painted', 'counted', 'folded'], 'What does chased mean here?'), infer('How did Quinn feel about the dog?', 'Happy', ['Afraid', 'Hungry', 'Sleepy'], ['Quinn clapped and smiled.', 'Clapping and smiling show a happy feeling.', 'Quinn felt happy.'])),
      story('Leaf Pile', [
        'Rosa found a yellow leaf.',
        'Owen found a red leaf.',
        'They put both leaves in a basket.',
      ], [
        ['Which sentence tells what Rosa found?', ['Rosa found a blue rock.', 'Owen found a green leaf.', 'They threw the leaves away.']],
        ['Which sentence tells what Owen found?', ['Owen found a green leaf.', 'Rosa found a stick.', 'The basket was empty.']],
        ['Which sentence tells where the leaves went?', ['They put both leaves in a pocket.', 'They left the leaves on the path.', 'A bird took the basket.']],
      ], vocab('basket', 'a container that can hold things', ['a color', 'a season', 'a song'], 'What is a basket in this story?'), infer('How many leaves went into the basket?', '2', ['1', '3', '4'], ['Rosa found one leaf and Owen found one leaf.', 'They put both leaves in the basket.', 'Both means 2 leaves.'])),
      story('Bedtime Book', [
        'Tara opened a picture book.',
        'The book showed a sleeping cat.',
        'Tara whispered, Good night.',
      ], [
        ['Which sentence tells what Tara opened?', ['Tara opened a paint box.', 'The book showed a running dog.', 'Tara shouted hello.']],
        ['Which sentence tells what the book showed?', ['The book showed a running dog.', 'Tara closed her eyes first.', 'A bell rang twice.']],
        ['Which sentence tells what Tara whispered?', ['Tara whispered, Good morning.', 'Tara sang a loud song.', 'The cat jumped down.']],
      ], vocab('whispered', 'said very softly', ['shouted', 'drew', 'counted'], 'What does whispered mean?'), infer('What time of day is it most likely?', 'Night', ['Morning', 'Lunch', 'Recess'], ['The book showed a sleeping cat.', 'Tara whispered good night.', 'Good night fits bedtime.'])),
    ];
  }
  if (grade === 1) {
    return [
      story('Library Card', [
        'Abby checked out two books about frogs.',
        'She read one book on the bus.',
        'She saved the other book for bedtime.',
      ], [
        ['Which sentence tells how many frog books Abby checked out?', ['Abby checked out five books about birds.', 'She read both books on the bus.', 'She returned the books before lunch.']],
        ['Which sentence tells where Abby read one book?', ['She read one book in the cafeteria.', 'She lost her library card.', 'The bus was late on Monday.']],
        ['Which sentence tells when Abby planned to read the other book?', ['She saved the other book for breakfast.', 'She gave both books away.', 'The frogs lived in a pond.']],
      ], vocab('checked', 'borrowed from the library', ['painted', 'counted', 'threw'], 'In this story, what does checked out mean?'), infer('Did Abby finish both books on the bus?', 'No', ['Yes', 'The story does not mention books.', 'She read three books on the bus.'], ['She checked out two books.', 'She read one book on the bus and saved the other.', 'So she did not finish both on the bus.'])),
      story('Class Garden', [
        'Ben planted bean seeds in a cup.',
        'He watered the cup each morning.',
        'A green sprout came up on Friday.',
      ], [
        ['Which sentence tells what Ben planted?', ['Ben planted flower bulbs in a pot.', 'He watered the cup once a week.', 'A yellow flower came up on Monday.']],
        ['Which sentence tells when Ben watered?', ['He watered the cup each night.', 'Ben forgot the cup.', 'The class ate the beans.']],
        ['Which sentence tells what happened on Friday?', ['A red bloom came up on Friday.', 'The cup tipped over.', 'Ben planted seeds on Friday.']],
      ], vocab('sprout', 'a new plant just starting to grow', ['a watering can', 'a school day', 'a kind of soil'], 'What is a sprout?'), infer('What helped the seed start growing?', 'Water each morning', ['A cold closet', 'No soil', 'Leaving town'], ['Ben planted bean seeds.', 'He watered the cup each morning.', 'The water and planting led to the sprout.'])),
      story('Rainy Recess', [
        'Cora heard rain on the roof.',
        'The class stayed inside to build with blocks.',
        'Cora made a tower taller than her chair.',
      ], [
        ['Which sentence tells what Cora heard?', ['Cora heard bells in the hall.', 'The class went outside to run.', 'Cora made a tower shorter than her shoe.']],
        ['Which sentence tells what the class did?', ['The class stayed inside to read maps.', 'Cora opened every window.', 'The roof leaked onto the rug.']],
        ['Which sentence tells how tall the tower was?', ['Cora made a tower shorter than her shoe.', 'The chair was outside.', 'Blocks were put away unused.']],
      ], vocab('tower', 'a tall structure', ['a quiet song', 'a small seed', 'a rainy cloud'], 'What does tower mean here?'), infer('Why did the class stay inside?', 'It was raining.', ['It was too sunny.', 'The blocks were lost.', 'Cora wanted lunch.'], ['Cora heard rain on the roof.', 'Then the class stayed inside.', 'The rain is why they stayed in.'])),
      story('Pet Visit', [
        'Dev brought a photo of his puppy.',
        'The puppy in the photo had one white paw.',
        'The class wrote the name Pip under the photo.',
      ], [
        ['Which sentence tells what Dev brought?', ['Dev brought a photo of his kitten.', 'The puppy had two black ears only.', 'The class wrote the name Max under the photo.']],
        ['Which sentence tells about the puppy\'s paw?', ['The puppy in the photo had one black ear.', 'Dev hid the photo.', 'The class drew a map.']],
        ['Which sentence tells the name under the photo?', ['The class wrote the name Max under the photo.', 'Dev wrote nothing.', 'Pip was the teacher\'s name on the door.']],
      ], vocab('photo', 'a picture made by a camera', ['a leash', 'a treat', 'a bowl'], 'What is a photo?'), infer('What is the puppy\'s name?', 'Pip', ['Max', 'Dev', 'Spot'], ['The class wrote the name Pip under the photo.', 'The photo is of the puppy.', 'The name under it is Pip.'])),
      story('Measure the Desk', [
        'Eva lined up six paper clips along her pencil.',
        'The pencil was longer than her eraser.',
        'She recorded 6 on her chart.',
      ], [
        ['Which sentence tells how Eva measured?', ['Eva lined up ten cubes along her pencil.', 'The pencil was shorter than her eraser.', 'She recorded 12 on her chart.']],
        ['Which sentence compares the pencil and the eraser?', ['The pencil was shorter than her eraser.', 'Eva lost the paper clips.', 'The chart was blank.']],
        ['Which sentence tells the number Eva recorded?', ['She recorded 12 on her chart.', 'She recorded nothing.', 'The pencil snapped in half.']],
      ], vocab('recorded', 'wrote down', ['erased', 'painted', 'threw'], 'What does recorded mean here?'), infer('How many paper clips long was the pencil?', '6', ['5', '10', '12'], ['Eva lined up six paper clips.', 'She recorded 6.', 'The pencil measured 6 paper clips.'])),
    ];
  }
  if (grade === 2) {
    return [
      story('Market Day', [
        'Finn counted 24 apples in one crate.',
        'He moved 10 apples to a smaller basket.',
        'The crate still held the rest of the apples.',
      ], [
        ['Which sentence tells how many apples started in the crate?', ['Finn counted 40 apples in one crate.', 'He moved 3 apples to a smaller basket.', 'The basket was heavier than the crate.']],
        ['Which sentence tells where Finn moved some apples?', ['He moved 10 apples to a red wagon.', 'Finn ate an apple first.', 'The crate was empty at the start.']],
        ['Which sentence tells what the crate held at the end?', ['The crate held nothing.', 'The basket still held the rest of the apples.', 'Finn closed the market.']],
      ], vocab('crate', 'a box that holds things', ['a coin', 'a recipe', 'a song'], 'What is a crate in this story?'), infer('How many apples stayed in the crate?', '14', ['10', '24', '34'], ['The crate started with 24 apples.', 'Finn moved 10 away.', '24 minus 10 is 14.'])),
      story('Science Notes', [
        'Gia observed a melting ice cube.',
        'She wrote that the puddle grew for ten minutes.',
        'Then she drew the cup and labeled the water.',
      ], [
        ['Which sentence tells what Gia observed?', ['Gia observed a boiling pot.', 'She wrote that the puddle shrank for ten minutes.', 'Then she hid the cup.']],
        ['Which sentence tells what she wrote?', ['She wrote that the puddle grew for two hours.', 'Gia left the page blank.', 'The ice cube stayed frozen.']],
        ['Which sentence tells what she drew?', ['Then she drew the window and labeled the snow.', 'She tore the page.', 'The water was labeled juice.']],
      ], vocab('observed', 'watched carefully', ['guessed', 'forgot', 'mixed'], 'What does observed mean?'), infer('What was Gia studying?', 'An ice cube melting', ['A plant growing', 'A magnet', 'A rock collection'], ['She observed a melting ice cube.', 'She wrote about the puddle and labeled the water.', 'She was studying melting ice.'])),
      story('Trail Map', [
        'Hugo followed the blue trail marks.',
        'The map key said blue marks meant the short loop.',
        'He finished back at the wooden sign.',
      ], [
        ['Which sentence tells which marks Hugo followed?', ['Hugo followed the red trail marks.', 'The map key said blue marks meant the long loop.', 'He finished at the parking lot only.']],
        ['Which sentence tells what the map key said?', ['The map key said yellow marks meant the short loop.', 'Hugo ignored the map.', 'The wooden sign was missing.']],
        ['Which sentence tells where Hugo finished?', ['He finished back at the creek.', 'He stopped halfway and camped.', 'The short loop was closed.']],
      ], vocab('key', 'the part of a map that explains the marks', ['a metal door opener', 'a song', 'a backpack'], 'What does key mean in this story?'), infer('Which loop did Hugo walk?', 'The short loop', ['The long loop', 'No loop', 'A loop with red marks'], ['He followed blue marks.', 'The key said blue marks meant the short loop.', 'So he walked the short loop.'])),
      story('Postcard', [
        'Ivy wrote a postcard to her aunt.',
        'The postcard described a lighthouse and a sandy path.',
        'Ivy put a stamp in the corner before mailing it.',
      ], [
        ['Which sentence tells who Ivy wrote to?', ['Ivy wrote a postcard to her coach.', 'The postcard described a castle and a snowy path.', 'Ivy forgot the stamp.']],
        ['Which sentence tells what the postcard described?', ['The postcard described a farm and a muddy road.', 'Ivy called her aunt instead.', 'The lighthouse was inland.']],
        ['Which sentence tells what Ivy did before mailing it?', ['Ivy put a sticker in the center before mailing it.', 'She mailed it without writing.', 'The corner stayed blank.']],
      ], vocab('stamp', 'a small sticker that pays for mail', ['a lighthouse lamp', 'a sandy shoe', 'a pencil'], 'What is a stamp here?'), infer('Did Ivy plan to send the postcard?', 'Yes', ['No', 'She threw it away.', 'The story never says.'], ['She wrote the postcard to her aunt.', 'She put a stamp on it before mailing it.', 'Mailing it means she planned to send it.'])),
      story('Classroom Jobs', [
        'Jules watered the fern by the window.',
        'The soil was dry before he started.',
        'After watering, the soil looked dark.',
      ], [
        ['Which sentence tells what Jules watered?', ['Jules watered the cactus by the door.', 'The soil was muddy before he started.', 'After watering, the soil looked pale.']],
        ['Which sentence tells about the soil at the start?', ['The soil was soaked before he started.', 'Jules skipped the fern.', 'The window was closed all year.']],
        ['Which sentence tells how the soil looked afterward?', ['After watering, the soil looked dusty.', 'Jules emptied the watering can outside.', 'The fern lost every leaf.']],
      ], vocab('soil', 'the dirt a plant grows in', ['a window', 'a job chart', 'a watering can'], 'What is soil?'), infer('Why did the soil change color?', 'Jules watered it.', ['The fern was moved.', 'The window broke.', 'Someone painted it.'], ['The soil was dry at first.', 'After watering, it looked dark.', 'The water changed how it looked.'])),
    ];
  }
  if (grade === 4) {
    return [
      story('Field Notes', [
        'Priya recorded the temperature at 8:00 a.m. and again at noon.',
        'The noon reading was 9 degrees higher.',
        'She concluded the morning had been cooler.',
      ], [
        ['Which sentence tells when Priya recorded the temperature?', ['Priya recorded the temperature at 6:00 a.m. and again at night.', 'The noon reading was 2 degrees lower.', 'She concluded the morning had been warmer.']],
        ['Which sentence compares the two readings?', ['The noon reading was 9 degrees lower.', 'Priya lost her thermometer.', 'She measured rainfall instead.']],
        ['Which sentence tells her conclusion?', ['She concluded the morning had been warmer.', 'She refused to decide.', 'The thermometer broke at noon.']],
      ], vocab('concluded', 'decided from the evidence', ['guessed without looking', 'erased', 'copied a chart'], 'What does concluded mean here?'), infer('Which reading was warmer?', 'The noon reading', ['The 8:00 a.m. reading', 'Both were the same.', 'Neither was recorded.'], ['The noon reading was 9 degrees higher.', 'Higher temperature means warmer.', 'Noon was warmer.'])),
      story('Museum Label', [
        'The label explained that the clay pot was made about 800 years ago.',
        'A crack ran from the rim to the base.',
        'Visitors were asked not to touch the glass case.',
      ], [
        ['Which sentence tells the age of the pot?', ['The label explained that the clay pot was made about 80 years ago.', 'A crack ran across the lid only.', 'Visitors were asked to lift the pot.']],
        ['Which sentence describes the crack?', ['A painted bird covered the crack.', 'The pot was brand new.', 'The base was missing entirely.']],
        ['Which sentence tells the rule for visitors?', ['Visitors were asked to open the glass case.', 'The label was blank.', 'Cameras were required.']],
      ], vocab('rim', 'the top edge', ['the bottom', 'the stand', 'the ticket'], 'What is the rim of the pot?'), infer('Why should visitors not touch the case?', 'To protect the old pot', ['The pot is a toy.', 'The case is empty.', 'Touching makes the pot newer.'], ['The pot is about 800 years old and cracked.', 'It is kept in a glass case.', 'Not touching protects it.'])),
      story('Team Data', [
        'The chart showed that Team North scored 18 points in the first half.',
        'Team South scored 11 points in that same half.',
        'A caption reminded readers to compare the bars, not the colors.',
      ], [
        ['Which sentence tells Team North\'s first-half score?', ['The chart showed that Team North scored 30 points in the first half.', 'Team South scored 21 points in that same half.', 'A caption told readers to ignore the bars.']],
        ['Which sentence tells Team South\'s score?', ['Team South scored 18 points in the second half.', 'Team North did not play.', 'The chart had no numbers.']],
        ['Which sentence tells how to read the chart?', ['A caption reminded readers to compare the colors, not the bars.', 'The caption was missing.', 'Readers were told to guess.']],
      ], vocab('caption', 'words that explain a picture or chart', ['the winning team', 'a point', 'a uniform'], 'What is a caption?'), infer('Which team had more points in the first half?', 'Team North', ['Team South', 'The teams tied.', 'The chart does not say.'], ['Team North scored 18 and Team South scored 11.', '18 is more than 11.', 'Team North had more points.'])),
      story('Word Study', [
        'Mateo underlined the root in transportation.',
        'He wrote that the root had to do with carrying.',
        'His partner checked the meaning in a student dictionary.',
      ], [
        ['Which sentence tells what Mateo underlined?', ['Mateo underlined the ending in transportation.', 'He wrote that the root had to do with flying.', 'His partner closed the dictionary.']],
        ['Which sentence tells what he wrote?', ['He wrote that the root had to do with painting.', 'Mateo skipped the word.', 'The dictionary was for science only.']],
        ['Which sentence tells what his partner did?', ['His partner checked the spelling on a poster only.', 'His partner erased the root.', 'The dictionary was left at home.']],
      ], vocab('root', 'a word part that carries meaning', ['a plant only', 'a book cover', 'a period'], 'What does root mean in this word study?'), infer('Where did the partner look up the meaning?', 'In a student dictionary', ['On a sports chart', 'In a math book', 'Nowhere'], ['The partner checked the meaning.', 'The sentence names a student dictionary.', 'That is where the partner looked.'])),
      story('Creek Sample', [
        'The class collected one water sample from the shady bank.',
        'The sample was clearer than the sample from the muddy bend.',
        'They recorded both results before leaving.',
      ], [
        ['Which sentence tells where the first sample came from?', ['The class collected one water sample from the sunny dock.', 'The sample was darker than the sample from the muddy bend.', 'They recorded nothing.']],
        ['Which sentence compares the two samples?', ['The sample was muddier than the sample from the rocky shore.', 'They tested soil instead.', 'The bend was dry.']],
        ['Which sentence tells when they recorded the results?', ['They recorded both results after a week at school.', 'They forgot the bottles.', 'Only one result was kept.']],
      ], vocab('sample', 'a small part taken for study', ['the whole creek', 'a boat', 'a bridge'], 'What is a sample here?'), infer('Which sample was clearer?', 'The sample from the shady bank', ['The sample from the muddy bend', 'They were the same.', 'Neither sample was water.'], ['The shady-bank sample was clearer than the muddy-bend sample.', 'The sentence makes the comparison directly.', 'The shady bank sample was clearer.'])),
    ];
  }
  return [
    story('Lab Report', [
      'Amina measured a box that was 5 centimeters long, 4 centimeters wide, and 3 centimeters tall.',
      'She multiplied the three edge lengths to find the volume.',
      'Her report said the box could hold 60 cubic centimeters.',
    ], [
      ['Which sentence tells the three edge lengths?', ['Amina measured a box that was 8 centimeters long, 2 centimeters wide, and 1 centimeter tall.', 'She added the three edge lengths to find the area.', 'Her report said the box could hold 20 cubic centimeters.']],
      ['Which sentence tells how she found the volume?', ['She multiplied the three edge lengths to find the perimeter.', 'She only measured the height.', 'The report skipped the method.']],
      ['Which sentence tells the volume she reported?', ['Her report said the box could hold 45 cubic centimeters.', 'She refused to write a number.', 'The box was a cylinder.']],
    ], vocab('volume', 'the space inside a solid', ['the distance around', 'the color', 'the weight only'], 'What does volume mean in this report?'), infer('Does 5 × 4 × 3 match the reported volume?', 'Yes', ['No', 'She reported area.', 'The story gives no numbers.'], ['The edges are 5, 4, and 3.', '5 × 4 × 3 = 60.', 'The report says 60 cubic centimeters, so it matches.'])),
    story('Editorial', [
      'Luis argued that the town should repair the library roof before buying new benches.',
      'He cited a leak over the history section.',
      'The final paragraph asked readers to write to the council.',
    ], [
      ['Which sentence tells what Luis wanted repaired first?', ['Luis argued that the town should buy new benches before repairing the roof.', 'He cited a leak over the gym.', 'The final paragraph asked readers to stay home.']],
      ['Which sentence gives his evidence?', ['He cited a broken window in the lobby.', 'He offered no example.', 'The history section was brand new.']],
      ['Which sentence tells the call to action?', ['The final paragraph asked readers to ignore the council.', 'The essay had no ending.', 'Readers were told to buy benches.']],
    ], vocab('cited', 'gave as evidence', ['hid', 'painted', 'guessed'], 'What does cited mean here?'), infer('What problem supports Luis\'s argument?', 'A leak over the history section', ['A need for new paint only', 'A missing playground', 'No problem is named'], ['He wants the roof repaired first.', 'He cites a leak over the history section.', 'That leak is the supporting problem.'])),
    story('Coordinate Clue', [
      'The map key placed the origin at the old oak.',
      'The picnic blanket was 4 units east and 2 units north of the oak.',
      'The clue wrote that spot as the ordered pair (4, 2).',
    ], [
      ['Which sentence tells where the origin was?', ['The map key placed the origin at the stone bridge.', 'The picnic blanket was 2 units east and 4 units north of the oak.', 'The clue wrote that spot as the ordered pair (2, 4).']],
      ['Which sentence describes the blanket\'s move from the oak?', ['The picnic blanket was 4 units west and 2 units south of the oak.', 'The oak was not on the map.', 'No units were given.']],
      ['Which sentence tells the ordered pair?', ['The clue wrote that spot as the ordered pair (2, 4).', 'The clue used a fraction.', 'The blanket had no pair.']],
    ], vocab('origin', 'the starting point (0, 0)', ['the highest point', 'a picnic food', 'a compass only'], 'What is the origin on this map?'), infer('If east is the first coordinate, is (4, 2) reasonable?', 'Yes', ['No', 'The story uses (2, 4).', 'Coordinates are not mentioned.'], ['The blanket is 4 units east and 2 units north.', 'East is the first number and north is the second.', '(4, 2) matches that move.'])),
    story('Root Hunt', [
      'Noor circled the root aud in auditorium.',
      'She explained that aud has to do with hearing.',
      'Her example sentence described a room where an audience listens.',
    ], [
      ['Which sentence tells which root Noor circled?', ['Noor circled the root geo in auditorium.', 'She explained that aud has to do with light.', 'Her example sentence described a room where an audience cooks.']],
      ['Which sentence tells the meaning she gave?', ['She explained that aud has to do with carrying.', 'Noor skipped the meaning.', 'The word was telephone.']],
      ['Which sentence tells what the example described?', ['Her example sentence described a room where an audience marches away.', 'She gave no example.', 'The audience was a sports score.']],
    ], vocab('audience', 'people who listen or watch', ['a building material', 'a math rule', 'a kind of map'], 'What is an audience here?'), infer('Which meaning fits the root Noor circled?', 'Hearing', ['Earth', 'Light', 'Water'], ['She circled aud.', 'She explained that aud has to do with hearing.', 'The meaning is hearing.'])),
    story('Decimal Shop', [
      'A notebook cost $2.40 and a pencil cost $0.35.',
      'Theo paid with three one-dollar bills.',
      'The receipt showed a total of $2.75 before any change.',
    ], [
      ['Which sentence tells the two prices?', ['A notebook cost $3.40 and a pencil cost $0.55.', 'Theo paid with one five-dollar bill.', 'The receipt showed a total of $3.75 before any change.']],
      ['Which sentence tells how Theo paid?', ['Theo paid with three quarters.', 'He paid with a check.', 'The receipt was blank.']],
      ['Which sentence tells the total on the receipt?', ['The receipt showed a total of $2.40 before any change.', 'The receipt showed only the tax.', 'Theo owed nothing.']],
    ], vocab('receipt', 'a record of what was paid', ['a notebook cover', 'a pencil case', 'a dollar bill'], 'What is a receipt?'), infer('How much change should Theo get from $3.00?', '$0.25', ['$0.35', '$2.40', '$0.75'], ['The total is $2.75.', 'He paid $3.00.', '$3.00 - $2.75 = $0.25.'])),
  ];
}

function story(title, sentences, asks, vocabItem, infer) {
  return {
    title,
    sentences,
    ask: asks.map((item) => item[0]),
    foils: asks.map((item) => item[1]),
    vocab: vocabItem,
    infer,
  };
}

function vocab(word, meaning, foils, prompt) {
  return { word, meaning, foils, prompt };
}

function infer(prompt, answer, foils, steps) {
  return { prompt, answer, foils, steps };
}

function buildCreative(bank) {
  const prompts = [
    ['paper cup', 'a picnic'],
    ['shoebox', 'a rainy afternoon'],
    ['wooden spoon', 'a puppet show'],
    ['envelope', 'a class mailbox'],
  ];
  prompts.forEach(([thing, event], index) => {
    const name = kid(bank.grade, index);
    bank.add({
      section: 'torrance',
      topic: 'creative',
      topicLabel: 'Creative challenges',
      prompt: `${name}, list many unusual uses for a ${thing} during ${event}. Pick one idea and add details about who uses it and how. This challenge is for ideas, not a single correct answer.`,
      choices: [],
      answerIndex: -1,
      explanation: 'There is no single right answer. Step 1: List many ideas. Step 2: Make the ideas different kinds, not copies. Step 3: Add details to the idea you like best.',
      skill: `G${bank.grade}.CREATE`,
      skillLabel: 'Creative thinking',
      difficulty: 1,
      links: [lessons.cube, lessons.pbs],
      scored: false,
      rubric: [
        'I listed many ideas.',
        'My ideas are different kinds, not copies of one idea.',
        'At least one idea is unusual.',
        'I added details to my favorite idea.',
      ],
    });
  });
}

function buildOrder(bank) {
  const exprs = ['(8+2)*3', '(6*4)+5', '20-(3*4)', '(15-5)/2', '7*(3+1)', '(9*2)-4', '18/(2+1)', '(4+6)*5'];
  exprs.forEach((expr, index) => {
    const answer = solved({ kind: 'expr', expr });
    const name = kid(bank.grade, index);
    put(bank, {
      section: 'iready',
      topic: 'operations',
      topicLabel: 'Operations',
      prompt: `${name} evaluates ${expr.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ')}. What is the value?`,
      explanation: why([
        'Do the work inside parentheses first.',
        'Then multiply or divide before adding or subtracting.',
        `${expr} equals ${answer}.`,
      ]),
      skill: '5.OA.A.1',
      skillLabel: 'Order of operations',
      links: [lessons.g5Frac, lessons.nbt5],
      verify: { kind: 'expr', expr },
    }, answer, near(answer));
  });
}

function padTo(bank, goal) {
  const things = ['beads', 'cards', 'seeds', 'tiles', 'tokens', 'stickers'];
  const spots = ['the red bowl', 'the blue tray', 'the green bin', 'the yellow cup', 'the picnic mat', 'the reading rug', 'the window ledge', 'the class shelf'];
  let guard = 0;
  while (bank.list.filter((question) => question.scored).length < goal) {
    if (guard > 600) throw new Error(`Could not fill grade ${bank.grade}`);
    const thing = things[guard % things.length];
    const spot = spots[guard % spots.length];
    const name = kid(bank.grade, guard);
    let expr = '';
    let prompt = '';
    let topic = 'add-subtract';
    let label = 'Add and subtract';
    let skill = '2.NBT.B.5';
    if (bank.grade === 0) {
      const left = guard % 5;
      const right = 1 + (Math.floor(guard / 5) % 4);
      if (left + right > 5) {
        guard += 1;
        continue;
      }
      expr = `${left}+${right}`;
      prompt = `${name} finds ${left} ${thing} in ${spot}, then finds ${right} more. How many ${thing} is that in all?`;
      skill = 'K.OA.A.2';
    } else if (bank.grade === 1) {
      const left = 4 + (guard % 9);
      const right = 2 + (Math.floor(guard / 9) % 7);
      const total = left + right;
      if (guard % 2 === 0) {
        expr = `${left}+${right}`;
        prompt = `${name} collects ${left} ${thing} from ${spot} and ${right} ${thing} from a friend. How many ${thing} does ${name} have?`;
      } else {
        expr = `${total}-${right}`;
        prompt = `${name} has ${total} ${thing} in ${spot} and gives ${right} away. How many ${thing} remain?`;
      }
      skill = '1.OA.C.6';
    } else if (bank.grade === 2) {
      const left = 25 + (guard % 40);
      const right = 12 + (Math.floor(guard / 8) % 30);
      expr = `${left}+${right}`;
      prompt = `${name} counts ${left} ${thing} already in ${spot} and adds ${right} more. What is the new total?`;
      skill = '2.NBT.B.5';
    } else if (bank.grade === 4) {
      const left = 12 + (guard % 14);
      const right = 3 + (Math.floor(guard / 7) % 6);
      expr = `${left}*${right}`;
      topic = 'multiply';
      label = 'Multiplication';
      skill = '4.NBT.B.5';
      prompt = `${name} sets ${left} rows of ${right} ${thing} on ${spot}. How many ${thing} are there?`;
    } else {
      const left = 13 + (guard % 16);
      const right = 6 + (Math.floor(guard / 6) % 7);
      expr = `(${left}*${right})+${(guard % 5) + 1}`;
      topic = 'operations';
      label = 'Operations';
      skill = '5.OA.A.1';
      prompt = `${name} has ${left} bags with ${right} ${thing} in each bag, then finds ${(guard % 5) + 1} extra ${thing} on ${spot}. How many ${thing} is that?`;
    }
    const answer = solved({ kind: 'expr', expr });
    try {
      put(bank, {
        section: 'iready',
        topic,
        topicLabel: label,
        prompt,
        explanation: why([
          `Start with the amounts in the story.`,
          `The expression is ${expr.replaceAll('*', ' × ')}.`,
          `The result is ${answer}.`,
        ]),
        skill,
        skillLabel: label,
        links: mathLinks(bank.grade),
        verify: { kind: 'expr', expr },
      }, answer, near(answer));
    } catch (error) {
      if (!String(error.message || error).includes('Prompt already used')) throw error;
    }
    guard += 1;
  }
}

function buildGrade(grade, prompts) {
  const bank = new Bank(grade, prompts);
  if (grade === 0) {
    buildSums(bank, 'add-subtract', 'Add and subtract', 'K.OA.A.2', 0, 4, 16);
    buildDifferences(bank, 10);
    buildCountPictures(bank, 16);
    buildCompare(bank, 8);
    buildShapes(bank, 6);
    buildSeries(bank, 8);
    buildRhymes(bank);
    buildAnalogies(bank);
    buildMatrices(bank, 12);
    buildClassify(bank, 8);
    buildReading(bank);
    buildCreative(bank);
  } else if (grade === 1) {
    buildSums(bank, 'add-subtract', 'Add and subtract', '1.OA.C.6', 2, 12, 24);
    buildDifferences(bank, 12);
    buildPlace(bank, 10);
    buildCompare(bank, 8);
    buildClocks(bank, 8);
    buildShapes(bank, 6);
    buildSeries(bank, 10);
    buildMaps(bank, 4);
    buildAnalogies(bank);
    buildMatrices(bank, 10);
    buildFolds(bank, 6);
    buildClassify(bank, 6);
    buildGrammar(bank, 12);
    buildReading(bank);
    buildData(bank);
    buildCreative(bank);
  } else if (grade === 2) {
    buildSums(bank, 'add-subtract', 'Add and subtract', '2.NBT.B.5', 10, 40, 16);
    buildDifferences(bank, 12);
    buildPlace(bank, 12);
    buildMoney(bank);
    buildClocks(bank, 6);
    buildElapsed(bank, 6);
    buildArea(bank);
    buildSeries(bank, 10);
    buildMaps(bank, 6);
    buildAnalogies(bank);
    buildMatrices(bank, 10);
    buildFolds(bank, 6);
    buildClassify(bank, 6);
    buildGrammar(bank, 10);
    buildReading(bank);
    buildData(bank);
    buildCreative(bank);
  } else if (grade === 4) {
    buildProducts(bank, 12);
    buildArea(bank);
    buildRound(bank);
    buildFractions(bank);
    buildDecimals(bank);
    buildSeries(bank, 8);
    buildMaps(bank, 6);
    buildAnalogies(bank);
    buildMatrices(bank, 8);
    buildFolds(bank, 6);
    buildClassify(bank, 6);
    buildRoots(bank);
    buildReading(bank);
    buildData(bank);
    buildCreative(bank);
  } else if (grade === 5) {
    buildProducts(bank, 10);
    buildOrder(bank);
    buildFractions(bank);
    buildDecimals(bank);
    buildVolume(bank);
    buildPoints(bank);
    buildSeries(bank, 6);
    buildMaps(bank, 4);
    buildAnalogies(bank);
    buildMatrices(bank, 8);
    buildFolds(bank, 6);
    buildClassify(bank, 6);
    buildRoots(bank);
    buildReading(bank);
    buildCreative(bank);
  }
  padTo(bank, 210);
  const scored = bank.list.filter((question) => question.scored).length;
  if (scored < 200) throw new Error(`Grade ${grade} has only ${scored} scored questions`);
  const areas = {
    quantitative: bank.list.filter((question) => question.scored && ['number-series', 'number-analogies', 'compare'].includes(question.topic)).length,
    verbal: bank.list.filter((question) => question.scored && ['verbal-analogies', 'rhymes', 'roots', 'grammar'].includes(question.topic)).length,
    nonverbal: bank.list.filter((question) => question.scored && ['figure-matrices', 'paper-folding', 'figure-classification'].includes(question.topic)).length,
    math: bank.list.filter((question) => question.scored && question.section === 'iready').length,
    reading: bank.list.filter((question) => question.scored && question.section === 'map').length,
  };
  if (areas.math < 40 || areas.reading < 20 || areas.nonverbal < 8) {
    throw new Error(`Grade ${grade} coverage is thin: ${JSON.stringify(areas)}`);
  }
  if (grade !== 0 && areas.verbal < 12) throw new Error(`Grade ${grade} needs more verbal items`);
  if (grade === 0 && areas.verbal < 20) throw new Error('Kindergarten needs more verbal items');
  return bank;
}

function loadGrade3Prompts() {
  const prompts = new Set();
  const dir = join(root, 'grade-3');
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const list = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const question of list) prompts.add(question.prompt.trim().toLowerCase().replace(/\s+/g, ' '));
  }
  return prompts;
}

const prompts = loadGrade3Prompts();
const summary = {};
for (const grade of [0, 1, 2, 4, 5]) {
  rmSync(join(root, `grade-${grade}`), { recursive: true, force: true });
  const bank = buildGrade(grade, prompts);
  const dir = join(root, `grade-${grade}`);
  mkdirSync(dir, { recursive: true });
  for (const [topic, list] of bank.byTopic) {
    writeFileSync(join(dir, `${topic}.json`), `${JSON.stringify(list, null, 2)}\n`);
  }
  const sections = {};
  for (const question of bank.list) {
    sections[question.section] = (sections[question.section] || 0) + 1;
  }
  summary[grade] = { total: bank.list.length, scored: bank.list.filter((question) => question.scored).length, sections };
}

console.log(JSON.stringify(summary, null, 2));
