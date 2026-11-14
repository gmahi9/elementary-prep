function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function shapeMarkup(cell, cx, cy, scale) {
  const sizeMap = { small: 0.62, medium: 0.9, large: 1.15 };
  const s = scale * (sizeMap[cell.size] || 0.9);
  const rot = cell.rotation || 0;
  const fill = cell.color;
  const open = `<g transform="translate(${cx} ${cy}) rotate(${rot})" fill="${fill}" stroke="#241b38" stroke-width="2">`;
  const close = '</g>';
  switch (cell.shape) {
    case 'circle':
      return `${open}<circle cx="0" cy="0" r="${s}" />${close}`;
    case 'square':
      return `${open}<rect x="${-s}" y="${-s}" width="${s * 2}" height="${s * 2}" rx="2" />${close}`;
    case 'triangle':
      return `${open}<polygon points="0,${-s} ${s},${s * 0.85} ${-s},${s * 0.85}" />${close}`;
    case 'diamond':
      return `${open}<polygon points="0,${-s} ${s},0 0,${s} ${-s},0" />${close}`;
    case 'hex': {
      const pts = [];
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        pts.push(`${(Math.cos(a) * s).toFixed(1)},${(Math.sin(a) * s).toFixed(1)}`);
      }
      return `${open}<polygon points="${pts.join(' ')}" />${close}`;
    }
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 === 0 ? s : s * 0.42;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
      }
      return `${open}<polygon points="${pts.join(' ')}" />${close}`;
    }
    default:
      return `${open}<circle cx="0" cy="0" r="${s}" />${close}`;
  }
}

function cellGroup(cell, x, y, w, h) {
  const count = cell.count ?? 1;
  const gap = w / (count + 1);
  let marks = '';
  for (let i = 0; i < count; i += 1) {
    marks += shapeMarkup(cell, x + gap * (i + 1), y + h / 2, Math.min(18, (w / (count + 0.4)) * 0.38));
  }
  return marks;
}

function panel(x, y, w, h, inner) {
  return `<rect x="${x + 2}" y="${y + 2}" width="${w}" height="${h}" rx="10" fill="#fffdf8" stroke="#241b38" stroke-width="3"/>${inner}`;
}

export function figureToSvg(figure) {
  if (!figure) return '';
  switch (figure.kind) {
    case 'matrix':
      return matrixSvg(figure);
    case 'fold':
      return foldSvg(figure);
    case 'group':
      return groupSvg(figure);
    case 'bars':
      return barsSvg(figure);
    case 'pictograph':
      return pictographSvg(figure);
    case 'clock':
      return clockSvg(figure);
    case 'rect':
      return rectSvg(figure);
    case 'shape':
      return namedShapeSvg(figure);
    default:
      return '';
  }
}

export function choiceToSvg(choice) {
  if (!choice) return '';
  if (choice.kind === 'holes') return holesSvg(choice.holes, 120);
  if (choice.shape) return singleCellSvg(choice);
  return '';
}

function singleCellSvg(cell) {
  const body = cellGroup({ ...cell, count: cell.count ?? 1 }, 0, 0, 120, 90);
  return `<svg viewBox="0 0 124 94" role="img" aria-hidden="true">${panel(0, 0, 120, 90, body)}</svg>`;
}

function matrixSvg(figure) {
  const size = 96;
  const gap = 10;
  const boxes = figure.cells.map((cell, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col * (size + gap);
    const y = row * (size + gap);
    const inner = cell
      ? cellGroup(cell, x, y, size, size)
      : `<text x="${x + size / 2}" y="${y + size / 2 + 8}" text-anchor="middle" font-size="42" font-family="Trebuchet MS, sans-serif" fill="#241b38">?</text>`;
    return panel(x, y, size, size, inner);
  }).join('');
  return `<svg viewBox="0 0 210 210" role="img" aria-hidden="true">${boxes}</svg>`;
}

function foldSvg(figure) {
  const lines = [];
  if (figure.axes.includes('v')) {
    lines.push('<line x1="60" y1="14" x2="60" y2="106" stroke="#2f6fed" stroke-width="2" stroke-dasharray="4 3"/>');
  }
  if (figure.axes.includes('h')) {
    lines.push('<line x1="14" y1="60" x2="106" y2="60" stroke="#2f6fed" stroke-width="2" stroke-dasharray="4 3"/>');
  }
  const x = 10 + (figure.punch.x / 100) * 100;
  const y = 10 + (figure.punch.y / 100) * 100;
  return `<svg viewBox="0 0 120 120" role="img" aria-hidden="true"><rect x="10" y="10" width="100" height="100" fill="#fffdf8" stroke="#241b38" stroke-width="3"/>${lines.join('')}<circle cx="${x}" cy="${y}" r="5" fill="#e23b3b" stroke="#241b38" stroke-width="1.5"/></svg>`;
}

export function holesSvg(holes, size = 120) {
  const dots = holes.map((hole) => {
    const x = (hole.x / 100) * 100 + 10;
    const y = (hole.y / 100) * 100 + 10;
    return `<circle cx="${x}" cy="${y}" r="5" fill="#e23b3b" stroke="#241b38" stroke-width="1.5"/>`;
  }).join('');
  const width = size;
  return `<svg viewBox="0 0 ${width} ${width}" role="img" aria-hidden="true"><rect x="10" y="10" width="100" height="100" fill="#fffdf8" stroke="#241b38" stroke-width="3"/>${dots}</svg>`;
}

function groupSvg(figure) {
  const w = 108;
  const boxes = figure.items.map((cell, index) => {
    const x = index * (w + 8);
    return panel(x, 0, w, 88, cellGroup(cell, x, 0, w, 88));
  }).join('');
  const width = figure.items.length * (w + 8);
  return `<svg viewBox="0 0 ${width} 96" role="img" aria-hidden="true">${boxes}</svg>`;
}

function barsSvg(figure) {
  const max = Math.max(...figure.rows.map((row) => row.value), 1);
  const rowH = 36;
  const height = figure.rows.length * rowH + 52;
  const width = 420;
  const plotW = 220;
  const step = max <= 12 ? 1 : 2;
  let grid = '';
  for (let tick = 0; tick <= max; tick += step) {
    const x = 130 + Math.round((tick / max) * plotW);
    grid += `<line x1="${x}" y1="24" x2="${x}" y2="${height - 28}" stroke="#efe2cc" stroke-width="1"/><text x="${x}" y="${height - 10}" text-anchor="middle" font-size="11" font-family="Trebuchet MS, sans-serif" fill="#241b38">${tick}</text>`;
  }
  const rows = figure.rows.map((row, index) => {
    const y = 28 + index * rowH;
    const barW = Math.max(4, Math.round((row.value / max) * plotW));
    return `<text x="8" y="${y + 16}" font-size="13" font-family="Trebuchet MS, sans-serif" fill="#241b38">${esc(row.label)}</text><rect x="130" y="${y}" width="${barW}" height="22" rx="6" fill="#2f6fed" stroke="#241b38" stroke-width="2"/>`;
  }).join('');
  const title = `<text x="8" y="16" font-size="14" font-family="Trebuchet MS, sans-serif" fill="#241b38">${esc(figure.title)} (${esc(figure.unit)})</text>`;
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">${title}${grid}${rows}</svg>`;
}

function pictographSvg(figure) {
  const rowH = 34;
  const height = figure.rows.length * rowH + 48;
  const rows = figure.rows.map((row, index) => {
    const y = 40 + index * rowH;
    const count = row.value / figure.key;
    let icons = '';
    for (let i = 0; i < count; i += 1) {
      icons += `<circle cx="${128 + i * 22}" cy="${y + 8}" r="8" fill="#e2a308" stroke="#241b38" stroke-width="2"/>`;
    }
    return `<text x="8" y="${y + 12}" font-size="13" font-family="Trebuchet MS, sans-serif" fill="#241b38">${esc(row.label)}</text>${icons}`;
  }).join('');
  const header = `<text x="8" y="16" font-size="14" font-family="Trebuchet MS, sans-serif" fill="#241b38">${esc(figure.title)}</text><text x="8" y="32" font-size="12" font-family="Trebuchet MS, sans-serif" fill="#241b38">Key: each circle = ${figure.key} ${esc(figure.unit)}</text>`;
  return `<svg viewBox="0 0 420 ${height}" role="img" aria-hidden="true">${header}${rows}</svg>`;
}

function clockSvg(figure) {
  let ticks = '';
  for (let i = 0; i < 12; i += 1) {
    const a = (Math.PI / 6) * i - Math.PI / 2;
    const inner = i % 3 === 0 ? 38 : 42;
    ticks += `<line x1="${(60 + Math.cos(a) * inner).toFixed(1)}" y1="${(60 + Math.sin(a) * inner).toFixed(1)}" x2="${(60 + Math.cos(a) * 46).toFixed(1)}" y2="${(60 + Math.sin(a) * 46).toFixed(1)}" stroke="#241b38" stroke-width="${i % 3 === 0 ? 3 : 2}"/>`;
  }
  const nums = [[12, 60, 22], [3, 96, 64], [6, 60, 104], [9, 24, 64]]
    .map(([n, x, y]) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="12" font-family="Trebuchet MS, sans-serif" fill="#241b38">${n}</text>`)
    .join('');
  const hourAngle = ((figure.h % 12) * 30 + figure.m * 0.5 - 90) * Math.PI / 180;
  const minuteAngle = (figure.m * 6 - 90) * Math.PI / 180;
  const hx = 60 + Math.cos(hourAngle) * 24;
  const hy = 60 + Math.sin(hourAngle) * 24;
  const mx = 60 + Math.cos(minuteAngle) * 34;
  const my = 60 + Math.sin(minuteAngle) * 34;
  return `<svg viewBox="0 0 120 120" role="img" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="#fffdf8" stroke="#241b38" stroke-width="3"/>${ticks}${nums}<line x1="60" y1="60" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#241b38" stroke-width="4" stroke-linecap="round"/><line x1="60" y1="60" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#2f6fed" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="60" r="3" fill="#e23b3b"/></svg>`;
}

function rectSvg(figure) {
  const unit = 22;
  const w = figure.l * unit;
  const h = figure.w * unit;
  let grid = '';
  for (let x = 0; x < figure.l; x += 1) {
    for (let y = 0; y < figure.w; y += 1) {
      grid += `<rect x="${8 + x * unit}" y="${28 + y * unit}" width="${unit}" height="${unit}" fill="#cfe3ff" stroke="#241b38" stroke-width="1.5"/>`;
    }
  }
  const label = `<text x="8" y="18" font-size="14" font-family="Trebuchet MS, sans-serif" fill="#241b38">${figure.l} by ${figure.w} ${esc(figure.unit || 'units')}</text>`;
  return `<svg viewBox="0 0 ${w + 20} ${h + 40}" role="img" aria-hidden="true">${label}${grid}</svg>`;
}

function namedShapeSvg(figure) {
  const cell = {
    shape: figure.shape === 'rectangle' ? 'square' : figure.shape === 'pentagon' || figure.shape === 'octagon' || figure.shape === 'hexagon' ? 'hex' : figure.shape === 'circle' ? 'circle' : figure.shape === 'triangle' ? 'triangle' : figure.shape === 'rhombus' || figure.shape === 'diamond' ? 'diamond' : 'square',
    color: '#7a45d6',
    colorName: 'purple',
    size: 'large',
    count: 1,
    rotation: 0,
  };
  if (figure.shape === 'rectangle') {
    return `<svg viewBox="0 0 180 110" role="img" aria-hidden="true"><rect x="16" y="22" width="148" height="70" rx="4" fill="#7a45d6" stroke="#241b38" stroke-width="3"/></svg>`;
  }
  if (figure.shape === 'trapezoid') {
    return `<svg viewBox="0 0 180 110" role="img" aria-hidden="true"><polygon points="40,90 140,90 118,24 62,24" fill="#7a45d6" stroke="#241b38" stroke-width="3"/></svg>`;
  }
  if (figure.shape === 'pentagon') {
    const pts = [];
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      pts.push(`${(90 + Math.cos(a) * 48).toFixed(1)},${(58 + Math.sin(a) * 48).toFixed(1)}`);
    }
    return `<svg viewBox="0 0 180 120" role="img" aria-hidden="true"><polygon points="${pts.join(' ')}" fill="#7a45d6" stroke="#241b38" stroke-width="3"/></svg>`;
  }
  if (figure.shape === 'octagon') {
    const pts = [];
    for (let i = 0; i < 8; i += 1) {
      const a = Math.PI / 8 + (i * 2 * Math.PI) / 8;
      pts.push(`${(90 + Math.cos(a) * 48).toFixed(1)},${(58 + Math.sin(a) * 48).toFixed(1)}`);
    }
    return `<svg viewBox="0 0 180 120" role="img" aria-hidden="true"><polygon points="${pts.join(' ')}" fill="#7a45d6" stroke="#241b38" stroke-width="3"/></svg>`;
  }
  return `<svg viewBox="0 0 140 120" role="img" aria-hidden="true">${shapeMarkup(cell, 70, 60, 40)}</svg>`;
}
