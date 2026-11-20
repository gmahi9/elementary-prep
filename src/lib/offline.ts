import { choiceToSvg, figureToSvg } from './figureSvg.mjs';
import type { Question } from '../types';

export function downloadOffline(list: Question[], gradeLabel = 'practice'): void {
  const html = buildOfflineHtml(list, gradeLabel);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sunny-steps-${gradeLabel.toLowerCase().replace(/\s+/g, '-')}-offline.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildOfflineHtml(list: Question[], gradeLabel = 'practice'): string {
  const packed = list.map((question) => ({
    id: question.id,
    section: question.section,
    topicLabel: question.topicLabel,
    prompt: question.prompt,
    passageTitle: question.passageTitle || '',
    passage: question.passage || '',
    choices: question.choices,
    answerIndex: question.answerIndex,
    explanation: question.explanation,
    scored: question.scored,
    rubric: question.rubric || [],
    figureSvg: question.figure ? figureToSvg(question.figure) : '',
    choiceSvgs: (question.choiceFigures || []).map((choice) => choiceToSvg(choice)),
    alt: question.figure?.alt || '',
  }));
  const data = JSON.stringify(packed).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sunny Steps offline practice</title>
<style>
body{margin:0;font-family:"Outfit Variable","Outfit","Avenir Next","Segoe UI",sans-serif;background:radial-gradient(circle at 82% 0,rgba(74,163,224,.4),transparent 42%),radial-gradient(circle at 8% 100%,rgba(255,177,90,.28),transparent 40%),#071422;color:#f7f1e6}
h1,h2{font-family:Syne,"Outfit Variable","Avenir Next",sans-serif;letter-spacing:-.045em}
main{max-width:760px;margin:0 auto;padding:20px 16px 48px}
button,select{font:inherit}
button{min-height:52px;border:0;border-radius:999px;background:linear-gradient(180deg,#ffe0a8,#ff9a3c);color:#142033;padding:10px 16px;font-weight:700}
.choice{display:flex;gap:10px;align-items:center;width:100%;text-align:left;margin:8px 0;border-radius:18px;background:#fffaf6;color:#142033}
.ok{background:#e5f4ea;border-color:#146c43}.no{background:#fff1e4;border-color:#9d341c}
.card{background:#fffaf6;border:1px solid rgba(255,255,255,.7);border-radius:28px;padding:16px;color:#142033;box-shadow:0 24px 50px rgba(0,0,0,.28)}
select{background:#fffaf6;color:#142033;border-radius:12px;min-height:44px}
.figure svg,.choice svg{max-width:100%;height:auto}
</style>
</head>
<body>
<main>
<h1>Sunny Steps offline</h1>
<p>Unofficial ${gradeLabel} practice saved on this device. Not affiliated with CogAT, i-Ready, MAP Growth, NWEA, or the Torrance Tests. Open this file in a browser. Nothing is sent anywhere.</p>
<label>Section <select id="section"></select></label>
<p id="count"></p>
<article class="card" id="card"></article>
<p><button id="prev" type="button">Back</button> <button id="next" type="button">Next</button></p>
</main>
<script id="bank" type="application/json">${data}</script>
<script>
const bank = JSON.parse(document.getElementById('bank').textContent);
const names = {cogat:'CogAT reasoning', iready:'i-Ready math', map:'MAP reading', torrance:'Torrance creative', all:'All saved questions'};
const section = document.getElementById('section');
['all','cogat','iready','map','torrance'].forEach((id) => {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = names[id];
  section.appendChild(option);
});
let pool = bank;
let index = 0;
const picked = {};
function render() {
  pool = section.value === 'all' ? bank : bank.filter((item) => item.section === section.value);
  if (!pool.length) { document.getElementById('card').textContent = 'No questions in this section.'; return; }
  index = Math.min(index, pool.length - 1);
  const q = pool[index];
  document.getElementById('count').textContent = 'Question ' + (index + 1) + ' of ' + pool.length + ' · ' + q.topicLabel;
  const card = document.getElementById('card');
  card.innerHTML = '';
  if (q.passage) {
    const p = document.createElement('p');
    p.textContent = (q.passageTitle ? q.passageTitle + '. ' : '') + q.passage;
    card.appendChild(p);
  }
  if (q.figureSvg) {
    const fig = document.createElement('div');
    fig.className = 'figure';
    fig.innerHTML = q.figureSvg;
    if (q.alt) fig.setAttribute('aria-label', q.alt);
    card.appendChild(fig);
  }
  const h = document.createElement('h2');
  h.textContent = q.prompt;
  card.appendChild(h);
  if (!q.scored) {
    const note = document.createElement('p');
    note.textContent = 'Creative challenges are not scored. ' + q.explanation;
    card.appendChild(note);
    q.rubric.forEach((item) => {
      const label = document.createElement('label');
      label.style.display = 'block';
      label.innerHTML = '<input type="checkbox"> ' + item;
      card.appendChild(label);
    });
    return;
  }
  q.choices.forEach((choice, choiceIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    if (q.choiceSvgs[choiceIndex]) {
      const art = document.createElement('span');
      art.innerHTML = q.choiceSvgs[choiceIndex];
      button.appendChild(art);
    }
    const text = document.createElement('span');
    text.textContent = choice;
    button.appendChild(text);
    button.addEventListener('click', () => {
      picked[q.id] = choiceIndex;
      render();
    });
    if (picked[q.id] != null) {
      button.disabled = true;
      if (choiceIndex === q.answerIndex) button.classList.add('ok');
      if (choiceIndex === picked[q.id] && choiceIndex !== q.answerIndex) button.classList.add('no');
    }
    card.appendChild(button);
  });
  if (picked[q.id] != null) {
    const explain = document.createElement('p');
    explain.textContent = q.explanation;
    card.appendChild(explain);
  }
}
section.addEventListener('change', () => { index = 0; render(); });
document.getElementById('prev').addEventListener('click', () => { index = Math.max(0, index - 1); render(); });
document.getElementById('next').addEventListener('click', () => { index = Math.min(pool.length - 1, index + 1); render(); });
render();
</script>
</body>
</html>`;
}
