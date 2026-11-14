import { questions } from '../data/bank';
import { choiceToSvg, figureToSvg } from './figureSvg.mjs';
import type { Question } from '../types';

export function downloadOffline(list: Question[] = questions): void {
  const html = buildOfflineHtml(list);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sunny-steps-grade3-offline.html';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildOfflineHtml(list: Question[]): string {
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
body{margin:0;font-family:"Trebuchet MS","Segoe UI",sans-serif;background:#fff6e8;color:#241b38}
main{max-width:760px;margin:0 auto;padding:20px 16px 48px}
button,select{font:inherit}
button{min-height:48px;border:3px solid #241b38;border-radius:14px;background:#fff;padding:10px 14px;box-shadow:3px 3px 0 #241b38}
.choice{display:block;width:100%;text-align:left;margin:8px 0}
.ok{background:#d9f5e5}.no{background:#ffd9d4}
.card{background:#fffdf8;border:3px solid #241b38;border-radius:18px;padding:16px;box-shadow:5px 5px 0 #241b38}
.figure svg,.choice svg{max-width:100%;height:auto}
</style>
</head>
<body>
<main>
<h1>Sunny Steps offline</h1>
<p>Unofficial Grade 3 practice. Not affiliated with CogAT, i-Ready, MAP Growth, NWEA, or the Torrance Tests. Open this file in a browser. Nothing is sent anywhere.</p>
<label>Section <select id="section"></select></label>
<p id="count"></p>
<article class="card" id="card"></article>
<p><button id="prev" type="button">Back</button> <button id="next" type="button">Next</button></p>
</main>
<script id="bank" type="application/json">${data}</script>
<script>
const bank = JSON.parse(document.getElementById('bank').textContent);
const names = {cogat:'CogAT reasoning', iready:'i-Ready math', map:'MAP reading', torrance:'Torrance creative', all:'All Grade 3'};
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
