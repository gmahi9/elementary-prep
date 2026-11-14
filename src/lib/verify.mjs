const PLACE = { ones: 1, tens: 10, hundreds: 100, thousands: 1000 };

const PAST = {
  go: 'went',
  see: 'saw',
  eat: 'ate',
  run: 'ran',
  come: 'came',
  give: 'gave',
  take: 'took',
  sing: 'sang',
  sit: 'sat',
  write: 'wrote',
  ride: 'rode',
  fly: 'flew',
  grow: 'grew',
  know: 'knew',
  draw: 'drew',
  drink: 'drank',
  swim: 'swam',
  throw: 'threw',
  catch: 'caught',
  teach: 'taught',
  think: 'thought',
  bring: 'brought',
  buy: 'bought',
  find: 'found',
  make: 'made',
  say: 'said',
  tell: 'told',
  feel: 'felt',
  sleep: 'slept',
  keep: 'kept',
  leave: 'left',
  meet: 'met',
  hold: 'held',
  hear: 'heard',
  stand: 'stood',
  speak: 'spoke',
  break: 'broke',
  choose: 'chose',
  wear: 'wore',
  begin: 'began',
  is: 'was',
  are: 'were',
  do: 'did',
  have: 'had',
};

const PLURAL = {
  cat: 'cats',
  dog: 'dogs',
  book: 'books',
  bus: 'buses',
  box: 'boxes',
  wish: 'wishes',
  dish: 'dishes',
  baby: 'babies',
  city: 'cities',
  story: 'stories',
  puppy: 'puppies',
  berry: 'berries',
  leaf: 'leaves',
  knife: 'knives',
  wolf: 'wolves',
  child: 'children',
  mouse: 'mice',
  foot: 'feet',
  tooth: 'teeth',
  man: 'men',
  woman: 'women',
  goose: 'geese',
  hero: 'heroes',
  tomato: 'tomatoes',
  potato: 'potatoes',
  class: 'classes',
  bench: 'benches',
  fox: 'foxes',
};

const ARTICLE_AN = new Set(['apple', 'egg', 'igloo', 'orange', 'umbrella', 'hour', 'honest', 'elephant', 'island', 'owl', 'idea', 'apron', 'ant', 'engine', 'eraser', 'insect', 'octopus', 'uncle']);

const UNITS = {
  pencil: 'centimeters',
  crayon: 'centimeters',
  eraser: 'centimeters',
  classroom: 'meters',
  hallway: 'meters',
  'soccer field': 'meters',
  'paper clip': 'grams',
  grape: 'grams',
  strawberry: 'grams',
  dog: 'kilograms',
  cat: 'kilograms',
  bicycle: 'kilograms',
  spoon: 'milliliters',
  'medicine cup': 'milliliters',
  bathtub: 'liters',
  bucket: 'liters',
  'water bottle': 'liters',
};

const SIDES = {
  triangle: 3,
  quadrilateral: 4,
  pentagon: 5,
  hexagon: 6,
  octagon: 8,
  square: 4,
  rectangle: 4,
  rhombus: 4,
  trapezoid: 4,
};

const SHAPE_NAMES = {
  'four-equal-sides-and-four-right-angles': 'square',
  'four-right-angles-and-opposite-sides-equal': 'rectangle',
  'four-equal-sides': 'rhombus',
  'three-sides': 'triangle',
  'five-sides': 'pentagon',
  'six-sides': 'hexagon',
  'eight-sides': 'octagon',
  'no-straight-sides': 'circle',
  'exactly-one-pair-of-parallel-sides': 'trapezoid',
};

export function evalExpr(input) {
  const s = String(input).replace(/\s+/g, '');
  if (!s || !/^[0-9+\-*/()]+$/.test(s)) {
    throw new Error(`Bad expression: ${input}`);
  }
  let i = 0;
  const parseExpr = () => {
    let value = parseTerm();
    while (s[i] === '+' || s[i] === '-') {
      const op = s[i++];
      const right = parseTerm();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  };
  const parseTerm = () => {
    let value = parseFactor();
    while (s[i] === '*' || s[i] === '/') {
      const op = s[i++];
      const right = parseFactor();
      if (op === '*') value *= right;
      else {
        if (right === 0 || value % right !== 0) {
          throw new Error(`Non-integer division: ${input}`);
        }
        value /= right;
      }
    }
    return value;
  };
  const parseFactor = () => {
    if (s[i] === '(') {
      i += 1;
      const value = parseExpr();
      if (s[i] !== ')') throw new Error(`Missing parenthesis: ${input}`);
      i += 1;
      return value;
    }
    if (!/[0-9]/.test(s[i] || '')) throw new Error(`Missing number: ${input}`);
    let n = 0;
    while (/[0-9]/.test(s[i] || '')) {
      n = n * 10 + Number(s[i]);
      i += 1;
    }
    return n;
  };
  const value = parseExpr();
  if (i !== s.length) throw new Error(`Unused characters: ${input}`);
  if (!Number.isInteger(value)) throw new Error(`Not an integer: ${input}`);
  return value;
}

export function placeDigit(number, place) {
  const unit = PLACE[place];
  if (!unit) throw new Error(`Unknown place: ${place}`);
  return Math.floor(number / unit) % 10;
}

export function roundNumber(number, nearest) {
  if (nearest !== 10 && nearest !== 100) throw new Error(`Bad nearest: ${nearest}`);
  return Math.round(number / nearest) * nearest;
}

export function expandedForm(number) {
  const n = Math.trunc(number);
  if (n < 0 || n > 9999) throw new Error(`Out of range: ${number}`);
  const parts = [];
  const thousands = Math.floor(n / 1000) * 1000;
  const hundreds = Math.floor(n / 100) % 10 * 100;
  const tens = Math.floor(n / 10) % 10 * 10;
  const ones = n % 10;
  if (thousands) parts.push(String(thousands));
  if (hundreds) parts.push(String(hundreds));
  if (tens) parts.push(String(tens));
  if (ones) parts.push(String(ones));
  return parts.length ? parts.join(' + ') : '0';
}

export function formatMoney(cents) {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`Bad cents: ${cents}`);
  const dollars = Math.floor(cents / 100);
  const rest = cents % 100;
  return `$${dollars}.${String(rest).padStart(2, '0')}`;
}

export function formatTime(h, m) {
  let hour = ((h % 12) + 12) % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(m).padStart(2, '0')}`;
}

export function addClock(h, m, add) {
  if (h < 1 || h > 12 || m < 0 || m > 59 || add < 0) throw new Error('Bad time');
  const total = (h % 12) * 60 + m + add;
  const nh = Math.floor(total / 60) % 12;
  const nm = total % 60;
  return formatTime(nh === 0 ? 12 : nh, nm);
}

export function elapsedMinutes(sh, sm, eh, em) {
  const start = (sh % 12) * 60 + sm;
  let end = (eh % 12) * 60 + em;
  if (end < start) end += 12 * 60;
  return end - start;
}

function fmtFrac(pair) {
  return `${pair[0]}/${pair[1]}`;
}

export function comparePhrase(left, right) {
  const cross = left[0] * right[1] - right[0] * left[1];
  const rel = cross < 0 ? 'less than' : cross > 0 ? 'greater than' : 'equal to';
  return `${fmtFrac(left)} is ${rel} ${fmtFrac(right)}`;
}

export function reduceFraction(num, den) {
  if (den === 0) throw new Error('Zero denominator');
  const g = gcd(Math.abs(num), Math.abs(den));
  return `${num / g}/${den / g}`;
}

export function fractionOf(whole, num, den) {
  if (den === 0 || (whole * num) % den !== 0) throw new Error('Fraction of a set does not divide evenly');
  return (whole * num) / den;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

export function seriesNext(verify) {
  const terms = verify.terms;
  if (!Array.isArray(terms) || terms.length < 3) throw new Error('Series needs at least 3 terms');
  const op = verify.op;
  if (op === 'add' || op === 'sub') {
    const step = terms[1] - terms[0];
    for (let i = 1; i < terms.length; i += 1) {
      if (terms[i] - terms[i - 1] !== step) throw new Error('Series step does not hold');
    }
    if (op === 'add' && step <= 0) throw new Error('Add series step must be positive');
    if (op === 'sub' && step >= 0) throw new Error('Subtract series step must be negative');
    return terms[terms.length - 1] + step;
  }
  if (op === 'mul') {
    if (terms[0] === 0) throw new Error('Cannot multiply a series from 0');
    const ratio = terms[1] / terms[0];
    if (!Number.isInteger(ratio) || ratio < 2) throw new Error('Multiply series ratio is not an integer >= 2');
    for (let i = 1; i < terms.length; i += 1) {
      if (terms[i] !== terms[i - 1] * ratio) throw new Error('Multiply series does not hold');
    }
    return terms[terms.length - 1] * ratio;
  }
  if (op === 'add-grow') {
    const first = terms[1] - terms[0];
    if (first <= 0) throw new Error('Growing series must increase');
    for (let i = 1; i < terms.length; i += 1) {
      if (terms[i] - terms[i - 1] !== first + (i - 1)) throw new Error('Growing series does not hold');
    }
    return terms[terms.length - 1] + first + (terms.length - 1);
  }
  if (op === 'alt-add') {
    if (terms.length < 4) throw new Error('Alternating series needs 4 terms');
    const s0 = terms[1] - terms[0];
    const s1 = terms[2] - terms[1];
    if (s0 === s1) throw new Error('Alternating steps must differ');
    for (let i = 1; i < terms.length; i += 1) {
      const expect = i % 2 === 1 ? s0 : s1;
      if (terms[i] - terms[i - 1] !== expect) throw new Error('Alternating series does not hold');
    }
    const nextStep = terms.length % 2 === 1 ? s0 : s1;
    return terms[terms.length - 1] + nextStep;
  }
  throw new Error(`Unknown series op: ${op}`);
}

export function pluralShape(shape, count) {
  if (count === 1) {
    if (shape === 'hex') return 'hexagon';
    return shape;
  }
  if (shape === 'hex') return 'hexagons';
  if (shape === 'diamond') return 'diamonds';
  return `${shape}s`;
}

export function cellLabel(cell) {
  const count = cell.count ?? 1;
  const size = cell.size || 'medium';
  const rot = cell.rotation ? ` turned ${cell.rotation} degrees` : '';
  return `${count} ${size} ${cell.colorName} ${pluralShape(cell.shape, count)}${rot}`;
}

export function matrixCells(verify) {
  const paint = (shape, colorName, color, count = 1, rotation = 0, size = 'medium') => ({
    shape,
    colorName,
    color,
    count,
    rotation,
    size,
  });
  if (verify.rule === 'col-shape-row-color') {
    const [s0, s1] = verify.shapes;
    const [c0, c1] = verify.colorNames;
    const [h0, h1] = verify.colors;
    return [
      paint(s0, c0, h0),
      paint(s1, c0, h0),
      paint(s0, c1, h1),
      null,
    ];
  }
  if (verify.rule === 'count-col-color-row') {
    const [n0, n1] = verify.counts;
    const [c0, c1] = verify.colorNames;
    const [h0, h1] = verify.colors;
    return [
      paint(verify.shape, c0, h0, n0),
      paint(verify.shape, c0, h0, n1),
      paint(verify.shape, c1, h1, n0),
      null,
    ];
  }
  if (verify.rule === 'rotate-col-color-row') {
    const [r0, r1] = verify.rotations;
    const [c0, c1] = verify.colorNames;
    const [h0, h1] = verify.colors;
    return [
      paint(verify.shape, c0, h0, 1, r0),
      paint(verify.shape, c0, h0, 1, r1),
      paint(verify.shape, c1, h1, 1, r0),
      null,
    ];
  }
  throw new Error(`Unknown matrix rule: ${verify.rule}`);
}

export function matrixAnswerCell(verify) {
  const shown = matrixCells(verify);
  if (verify.rule === 'col-shape-row-color') {
    return {
      shape: verify.shapes[1],
      colorName: verify.colorNames[1],
      color: verify.colors[1],
      count: 1,
      rotation: 0,
      size: 'medium',
    };
  }
  if (verify.rule === 'count-col-color-row') {
    return {
      shape: verify.shape,
      colorName: verify.colorNames[1],
      color: verify.colors[1],
      count: verify.counts[1],
      rotation: 0,
      size: 'medium',
    };
  }
  if (verify.rule === 'rotate-col-color-row') {
    return {
      shape: verify.shape,
      colorName: verify.colorNames[1],
      color: verify.colors[1],
      count: 1,
      rotation: verify.rotations[1],
      size: 'medium',
    };
  }
  throw new Error(`Unknown matrix rule: ${verify.rule} / ${shown.length}`);
}

function sameCell(a, b) {
  if (!a || !b) return a === b;
  return a.shape === b.shape
    && a.colorName === b.colorName
    && a.color === b.color
    && (a.count ?? 1) === (b.count ?? 1)
    && (a.rotation ?? 0) === (b.rotation ?? 0)
    && (a.size || 'medium') === (b.size || 'medium');
}

export function foldHoles(axes, punch) {
  let holes = [{ x: punch.x, y: punch.y }];
  if (axes.includes('v')) {
    holes = holes.flatMap((p) => [p, { x: 100 - p.x, y: p.y }]);
  }
  if (axes.includes('h')) {
    holes = holes.flatMap((p) => [p, { x: p.x, y: 100 - p.y }]);
  }
  const unique = new Map();
  for (const hole of holes) {
    unique.set(`${hole.x},${hole.y}`, hole);
  }
  return [...unique.values()];
}

function zone(p) {
  const col = p.x <= 30 ? 'far left' : p.x < 48 ? 'left of the fold' : p.x > 70 ? 'far right' : p.x > 52 ? 'right of the fold' : 'on the center line';
  const row = p.y <= 30 ? 'upper' : p.y < 48 ? 'high' : p.y >= 70 ? 'lower' : p.y > 52 ? 'low' : 'middle';
  return `${row} ${col}`;
}

export function foldChoiceLabel(holes) {
  const parts = holes.map(zone).sort();
  if (holes.length === 1) return `Only one hole: ${parts[0]}`;
  if (holes.length === 2) return `Two holes: ${parts[0]} and ${parts[1]}`;
  return `${holes.length} holes: ${parts.join('; ')}`;
}

function tableValue(figure, label) {
  const row = figure.rows.find((item) => item.label === label);
  if (!row) throw new Error(`Missing row ${label}`);
  if (figure.kind === 'pictograph') {
    if (row.value % figure.key !== 0) throw new Error('Pictograph value is not a multiple of the key');
    return row.value;
  }
  return row.value;
}

function svForm(plural, verb) {
  if (!/^[a-z]+$/.test(verb)) throw new Error(`Bad verb ${verb}`);
  return plural ? verb : `${verb}s`;
}

function seriesComma(items) {
  if (!Array.isArray(items) || items.length !== 3) throw new Error('Series comma needs 3 items');
  return `${items[0]}, ${items[1]}, and ${items[2]}`;
}

export function expectedChoice(q) {
  const verify = q.verify;
  if (!verify || verify.kind === 'authored' || verify.kind === 'evidence' || verify.kind === 'vocab') {
    return null;
  }
  switch (verify.kind) {
    case 'expr':
      return String(evalExpr(verify.expr));
    case 'place-digit':
      return String(placeDigit(verify.number, verify.place));
    case 'place-value':
      return String(placeDigit(verify.number, verify.place) * PLACE[verify.place]);
    case 'round':
      return String(roundNumber(verify.number, verify.nearest));
    case 'expanded':
      return expandedForm(verify.number);
    case 'max':
      return String(Math.max(...verify.values));
    case 'min':
      return String(Math.min(...verify.values));
    case 'compare-fractions':
      return comparePhrase(verify.left, verify.right);
    case 'fraction':
      return `${verify.num}/${verify.den}`;
    case 'reduce':
      return reduceFraction(verify.num, verify.den);
    case 'fraction-of':
      return String(fractionOf(verify.whole, verify.num, verify.den));
    case 'equivalent': {
      const matches = q.choices.filter((choice) => {
        const parts = String(choice).match(/^(\d+)\/(\d+)$/);
        if (!parts) return false;
        return Number(parts[1]) * verify.den === Number(parts[2]) * verify.num;
      });
      if (matches.length !== 1) throw new Error(`Equivalent fraction was not unique for ${q.id || q.prompt}`);
      return matches[0];
    }
    case 'time-add':
      return addClock(verify.h, verify.m, verify.add);
    case 'time-elapsed':
      return String(elapsedMinutes(verify.sh, verify.sm, verify.eh, verify.em));
    case 'clock':
      return formatTime(verify.h, verify.m);
    case 'money':
      return formatMoney(verify.expr ? evalExpr(verify.expr) : verify.cents);
    case 'series':
      return String(seriesNext(verify));
    case 'num-map': {
      for (const [input, output] of verify.pairs) {
        const got = mapNumber(verify.op, verify.k, input);
        if (got !== output) throw new Error(`Number analogy pair ${input} → ${output} does not match ${verify.op} ${verify.k}`);
      }
      return String(mapNumber(verify.op, verify.k, verify.input));
    }
    case 'table-value':
      return String(tableValue(q.figure, verify.label));
    case 'table-diff':
      return String(tableValue(q.figure, verify.a) - tableValue(q.figure, verify.b));
    case 'table-sum':
      return String(verify.labels.reduce((sum, label) => sum + tableValue(q.figure, label), 0));
    case 'unit':
      if (!UNITS[verify.object]) throw new Error(`Unknown unit object ${verify.object}`);
      return UNITS[verify.object];
    case 'past':
      if (!PAST[verify.verb]) throw new Error(`Unknown verb ${verify.verb}`);
      return PAST[verify.verb];
    case 'plural':
      if (!PLURAL[verify.word]) throw new Error(`Unknown plural ${verify.word}`);
      return PLURAL[verify.word];
    case 'article':
      return ARTICLE_AN.has(verify.word) ? 'an' : 'a';
    case 'sv':
      return svForm(verify.plural, verify.verb);
    case 'series-comma':
      return `${verify.prefix}${seriesComma(verify.items)}${verify.suffix}`;
    case 'date':
      return `${verify.month} ${verify.day}, ${verify.year}`;
    case 'sides':
      if (SIDES[verify.shape] == null) throw new Error(`Unknown shape ${verify.shape}`);
      return String(SIDES[verify.shape]);
    case 'shape-name':
      if (!SHAPE_NAMES[verify.key]) throw new Error(`Unknown shape key ${verify.key}`);
      return SHAPE_NAMES[verify.key];
    case 'matrix':
      return cellLabel(matrixAnswerCell(verify));
    case 'fold':
      return foldChoiceLabel(foldHoles(verify.axes, verify.punch));
    case 'classify':
      return classifyExpected(q);
    case 'fraction-sum':
      return fractionCombine(verify.left, verify.right, 1);
    case 'fraction-diff':
      return fractionCombine(verify.left, verify.right, -1);
    case 'decimal-add':
      return decimalCombine(verify, 1);
    case 'decimal-sub':
      return decimalCombine(verify, -1);
    case 'point':
      return pointLabel(verify.x, verify.y);
    case 'rhyme':
      return uniqueEnding(q, verify.ending);
    case 'root':
      return rootMeaning(q, verify.root);
    default:
      throw new Error(`Unknown verify kind ${verify.kind}`);
  }
}

const ROOTS = {
  geo: 'earth',
  tele: 'far',
  photo: 'light',
  aqua: 'water',
  bio: 'life',
  therm: 'heat',
  aud: 'hear',
  graph: 'write',
  scope: 'see',
  chron: 'time',
  port: 'carry',
  rupt: 'break',
  struct: 'build',
  dict: 'say',
  tract: 'pull',
  ject: 'throw',
  vis: 'see',
  meter: 'measure',
  cycl: 'circle',
  phon: 'sound',
};

function fractionCombine(left, right, sign) {
  if (!pairOk(left) || !pairOk(right)) throw new Error('Bad fraction pair');
  const num = left[0] * right[1] + sign * right[0] * left[1];
  if (num < 0) throw new Error('Negative fraction');
  return reduceFraction(num, left[1] * right[1]);
}

function pairOk(pair) {
  return Array.isArray(pair) && pair.length === 2 && Number.isInteger(pair[0]) && Number.isInteger(pair[1]) && pair[1] > 0 && pair[0] >= 0;
}

function decimalCombine(verify, sign) {
  const scale = verify.scale === 100 ? 100 : verify.scale === 10 ? 10 : 0;
  if (!scale || !Number.isInteger(verify.left) || !Number.isInteger(verify.right)) throw new Error('Bad decimal');
  const value = verify.left + sign * verify.right;
  if (value < 0) throw new Error('Negative decimal');
  return (value / scale).toFixed(scale === 100 ? 2 : 1);
}

function pointLabel(x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('Bad point');
  return `(${x}, ${y})`;
}

function uniqueEnding(q, ending) {
  const tail = String(ending || '').toLowerCase();
  if (tail.length < 2) throw new Error('Rhyme ending is too short');
  const matches = q.choices.filter((choice) => String(choice).toLowerCase().endsWith(tail));
  if (matches.length !== 1) throw new Error(`Rhyme was not unique for ${q.id || q.prompt}`);
  return matches[0];
}

function rootMeaning(q, root) {
  const meaning = ROOTS[root];
  if (!meaning) throw new Error(`Unknown root ${root}`);
  const matches = q.choices.filter((choice) => String(choice).toLowerCase() === meaning);
  if (matches.length !== 1) throw new Error(`Root meaning was not unique for ${q.id || q.prompt}`);
  return matches[0];
}

function mapNumber(op, k, input) {
  if (op === 'mul') return input * k;
  if (op === 'add') return input + k;
  if (op === 'sub') return input - k;
  throw new Error(`Unknown map op ${op}`);
}

function classifyExpected(q) {
  const { property, value } = q.verify;
  const items = q.figure?.items || [];
  if (items.length < 3) throw new Error('Classification needs 3 figures');
  const props = ['shape', 'colorName', 'size'];
  for (const prop of props) {
    const values = new Set(items.map((item) => item[prop]));
    if (prop === property) {
      if (values.size !== 1 || [...values][0] !== value) {
        throw new Error(`Classification property ${property} is not constant`);
      }
    } else if (values.size < 2) {
      throw new Error(`Classification rule is ambiguous because ${prop} does not change`);
    }
  }
  if (!q.choiceFigures || q.choiceFigures.length !== q.choices.length) {
    throw new Error('Classification choices are missing figures');
  }
  const matches = [];
  q.choiceFigures.forEach((cell, index) => {
    if (cellLabel(cell) !== q.choices[index]) throw new Error('Classification label does not match the picture');
    if (cell[property] === value) matches.push(index);
  });
  if (matches.length !== 1) throw new Error('Classification answer is not unique');
  return q.choices[matches[0]];
}

function holesEqual(a, b) {
  const key = (holes) => holes.map((hole) => `${hole.x},${hole.y}`).sort().join('|');
  return key(a) === key(b);
}

export function assertQuestion(q) {
  if (!q.scored) return;
  if (q.verify?.kind === 'evidence') {
    const correct = q.choices[q.answerIndex];
    if (!q.passage || !q.passage.includes(correct)) {
      throw new Error(`Evidence sentence is not in the passage: ${q.id}`);
    }
    q.choices.forEach((choice, index) => {
      if (index !== q.answerIndex && q.passage.includes(choice)) {
        throw new Error(`Distractor appears in the passage: ${q.id}`);
      }
    });
    return;
  }
  if (q.verify?.kind === 'vocab') {
    const word = String(q.verify.word).toLowerCase();
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (!q.passage || !re.test(q.passage)) throw new Error(`Vocab word missing: ${q.id} ${word}`);
    return;
  }
  if (q.verify?.kind === 'matrix') {
    const cells = matrixCells(q.verify);
    if (!q.figure || q.figure.cells.length !== 4) throw new Error(`Matrix figure missing: ${q.id}`);
    cells.forEach((cell, index) => {
      if (!sameCell(cell, q.figure.cells[index])) throw new Error(`Matrix cell ${index} drifted: ${q.id}`);
    });
    const answer = matrixAnswerCell(q.verify);
    q.choiceFigures.forEach((cell, index) => {
      if (cellLabel(cell) !== q.choices[index]) throw new Error(`Matrix label drifted: ${q.id}`);
    });
    const correct = q.choiceFigures[q.choices.indexOf(cellLabel(answer))];
    if (!sameCell(correct, answer)) throw new Error(`Matrix answer picture drifted: ${q.id}`);
  }
  if (q.verify?.kind === 'fold') {
    const holes = foldHoles(q.verify.axes, q.verify.punch);
    if (!q.figure || q.figure.punch.x !== q.verify.punch.x || q.figure.punch.y !== q.verify.punch.y) {
      throw new Error(`Fold figure drifted: ${q.id}`);
    }
    q.choiceFigures.forEach((choice, index) => {
      if (foldChoiceLabel(choice.holes) !== q.choices[index]) throw new Error(`Fold label drifted: ${q.id}`);
    });
    const correct = q.choiceFigures[q.choices.indexOf(foldChoiceLabel(holes))];
    if (!holesEqual(correct.holes, holes)) throw new Error(`Fold holes drifted: ${q.id}`);
  }
  const expected = expectedChoice(q);
  if (expected == null) return;
  if (q.choices[q.answerIndex] !== expected) {
    throw new Error(`${q.id}: stored choice "${q.choices[q.answerIndex]}" but recomputed "${expected}"`);
  }
}

export const TABLES = { PAST, PLURAL, ARTICLE_AN, UNITS, SIDES, SHAPE_NAMES };
