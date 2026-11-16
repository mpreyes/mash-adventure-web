// Converts the old React Native screens into story data, word for word.
import { parse } from '@babel/parser';
import traverseM from '@babel/traverse';
import genM from '@babel/generator';
import fs from 'fs';
import path from 'path';
const traverse = traverseM.default || traverseM;
const gen = genM.default || genM;

const [, , srcDir, outFile] = process.argv;
const screensDir = path.join(srcDir, 'screens');

const INPUT_SCREENS = new Set(['Profile', 'LoveInterest', 'Cities', 'NoKids', 'Professions', 'Transportation', 'MoneyInBank', 'TypePet']);
const SPECIAL = new Set(['MashQuizNumber', 'Results']);
const warnings = [];

const nameOf = (el) => gen(el.openingElement.name).code;
const attr = (el, key) => el.openingElement.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === key);
const attrCode = (el, key) => {
  const a = attr(el, key);
  if (!a || !a.value) return undefined;
  if (a.value.type === 'StringLiteral') return a.value.value;
  return gen(a.value.expression).code;
};

// React's JSX text whitespace rule
function cleanJSXText(str) {
  const lines = str.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  lines.forEach((l, i) => { if (/[^ \t]/.test(l)) lastNonEmpty = i; });
  let out = '';
  lines.forEach((line, i) => {
    const isFirst = i === 0, isLast = i === lines.length - 1, isLastNonEmpty = i === lastNonEmpty;
    let t = line.replace(/\t/g, ' ');
    if (!isFirst) t = t.replace(/^[ ]+/, '');
    if (!isLast) t = t.replace(/[ ]+$/, '');
    if (t) { if (!isLastNonEmpty) t += ' '; out += t; }
  });
  return out;
}

function styleKey(code) {
  if (!code) return undefined;
  return code.replace(/[\[\]\s]/g, '').replace(/styles\.|material\.|resultStyle\./g, '').replace(/,\{[^}]*\}/g, '');
}

// inline content of a Text
function inlines(el) {
  const out = [];
  for (const c of el.children) {
    if (c.type === 'JSXText') { const t = cleanJSXText(c.value); if (t) out.push(t); }
    else if (c.type === 'JSXExpressionContainer') {
      const e = c.expression;
      if (e.type === 'JSXEmptyExpression') continue;
      if (e.type === 'StringLiteral') out.push(e.value);
      else if (e.type === 'TemplateLiteral' && e.expressions.length === 0) out.push(e.quasis[0].value.cooked);
      else out.push({ v: gen(e).code });
    } else if (c.type === 'JSXElement') {
      const n = nameOf(c);
      if (n === 'Text' || n === 'Animatable.Text') {
        const sc = attrCode(c, 'style') || '';
        const span = { s: styleKey(sc) || '', c: inlines(c) };
        if (/fontWeight:\s*["']bold["']/.test(sc)) span.s = 'bold';
        const op = attr(c, 'onPress');
        if (op) { const { link } = findNavigate(op.value.expression); if (link) { span.href = link; span.s = 'link'; } }
        out.push(span);
      } else warnings.push('inline element ' + n);
    }
  }
  return out;
}

function parseNavigate(call) {
  // navigate('Target', {...})
  const target = call.arguments[0]?.value;
  const choice = { to: target };
  const obj = call.arguments[1];
  if (obj && obj.type === 'ObjectExpression') {
    const num = obj.properties.find((p) => p.key && (p.key.name === 'number'));
    if (num && num.value.type === 'ObjectExpression') {
      const sn = num.value.properties.find((p) => p.key.name === 'story_num');
      if (sn && sn.value.type === 'NumericLiteral') choice.story = sn.value.value;
      else if (sn && sn.value.type === 'UnaryExpression') choice.story = -sn.value.argument.value;
      else if (sn) warnings.push('story_num expr ' + gen(sn.value).code);
    }
  }
  return choice;
}

function findNavigate(node) {
  let found = null, link = null;
  traverse(node, {
    noScope: true,
    CallExpression(p) {
      const c = gen(p.node.callee).code;
      if (!found && (c === 'navigate' || c === 'this.props.navigation.navigate')) found = p.node;
      if (c === 'Linking.openURL') link = p.node.arguments[0].value;
    },
  }, null, {});
  return { nav: found, link };
}

function walk(el, blocks, ctx = {}) {
  if (el.type !== 'JSXElement') return;
  const n = nameOf(el);
  const anim = attrCode(el, 'animation') || ctx.anim;
  if (n === 'Text' || n === 'Animatable.Text') {
    const b = { t: 'p', s: styleKey(attrCode(el, 'style')), c: inlines(el) };
    if (anim) b.a = anim;
    blocks.push(b);
    return;
  }
  if (n === 'Image') {
    const src = attrCode(el, 'source');
    const m = src && src.match(/images\/([^'"]+)['"]/);
    const style = attrCode(el, 'style') || '';
    const h = style.match(/height:\s*(\d+)/);
    const b = { t: 'img', src: m ? m[1] : src };
    if (h) b.h = +h[1];
    if (anim) b.a = anim;
    blocks.push(b);
    return;
  }
  if (n === 'Button') {
    const onPress = attr(el, 'onPress');
    const { nav, link } = findNavigate(onPress.value.expression);
    const b = { t: 'choice', label: attrCode(el, 'title') };
    const col = attrCode(el, 'color'); if (col) b.color = col;
    if (nav) Object.assign(b, parseNavigate(nav));
    else if (link) b.href = link;
    else { const code = gen(onPress.value.expression).code; b.action = code; }
    blocks.push(b);
    return;
  }
  if (n === 'TouchableOpacity') {
    const { nav } = findNavigate(attr(el, 'onPress').value.expression);
    const imgs = [];
    el.children.forEach((c) => walk(c, imgs));
    blocks.push({ t: 'choice', img: imgs[0]?.src, ...parseNavigate(nav) });
    return;
  }
  if (n === 'SketchCanvas') { blocks.push({ t: 'sketch' }); return; }
  if (n === 'AdMobBanner' || n === 'TextInput') return;
  if (['View', 'Animatable.View', 'ScrollView', 'KeyboardAvoidingView'].includes(n)) {
    const sc = attrCode(el, 'style');
    const rowish = sc && /flexDirection:\s*['"]row['"]/.test(sc);
    if (rowish) {
      const inner = [];
      el.children.forEach((c) => walk(c, inner, { anim: n === 'Animatable.View' ? anim : ctx.anim }));
      if (inner.length) blocks.push({ t: 'row', c: inner });
    } else el.children.forEach((c) => walk(c, blocks, { anim: n === 'Animatable.View' ? anim : ctx.anim }));
    return;
  }
  warnings.push('unknown element ' + n);
}

function renderReturn(ast) {
  let jsx = null;
  traverse(ast, {
    ClassMethod(p) {
      if (p.node.key.name !== 'render') return;
      p.traverse({ ReturnStatement(r) { if (!jsx) jsx = r.node.argument; } });
    },
  });
  return jsx;
}

const scenes = {};
const inputs = {};
let endings = {};

for (const file of fs.readdirSync(screensDir).sort()) {
  const id = file.replace(/\.js$/, '');
  const code = fs.readFileSync(path.join(screensDir, file), 'utf8');
  const ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'classProperties'] });

  if (id === 'Results') {
    traverse(ast, {
      IfStatement(p) {
        const test = gen(p.node.test).code;
        const m = test.match(/numbers\.story_num == (\d+)/);
        if (!m) return;
        let jsx = null;
        p.get('consequent').traverse({ ReturnStatement(r) { if (!jsx) jsx = r.node.argument; } });
        // root -> View(resultsParentStyle) -> ScrollView(rand_N)
        let bg;
        traverse(jsx, { noScope: true, JSXOpeningElement(o) { const s = o.node.attributes.find((a) => a.name?.name === 'style'); if (!bg && s) { const c = gen(s.value.expression).code; const mm = c.match(/rand_(\d+)/); if (mm) bg = +mm[1]; } } }, null, {});
        const blocks = [];
        walk(jsx, blocks);
        endings[m[1]] = { bg, blocks };
        const alt = p.node.alternate;
        if (alt && alt.type === 'BlockStatement') {
          // final plain else: the unreachable "Magical Ending" fallback
          let j = null; let bg2;
          p.get('alternate').traverse({ ReturnStatement(r) { if (!j) j = r.node.argument; } });
          traverse(j, { noScope: true, JSXOpeningElement(o) { const st = o.node.attributes.find((a) => a.name?.name === 'style'); if (bg2 === undefined && st) { const mm = gen(st.value.expression).code.match(/rand_(\d+)/); if (mm) bg2 = +mm[1]; } } }, null, {});
          const b2 = []; walk(j, b2); endings.default = { bg: bg2, blocks: b2 };
        }
      },
    });
    continue;
  }

  const jsx = renderReturn(ast);
  if (!jsx) { warnings.push('no render in ' + id); continue; }
  const blocks = [];
  walk(jsx, blocks);

  if (INPUT_SCREENS.has(id)) {
    const fields = [];
    traverse(ast, {
      JSXElement(p) {
        if (nameOf(p.node) !== 'TextInput') return;
        const onChange = gen(attr(p.node, 'onChangeText').value.expression).code;
        const key = onChange.match(/setState\(\{\s*(\w+)/)[1];
        fields.push({ key, placeholder: attrCode(p.node, 'placeholder'), numeric: attrCode(p.node, 'keyboardType') === 'numeric' });
      },
    });
    let next, group;
    traverse(ast, {
      CallExpression(p) {
        const c = gen(p.node.callee).code;
        if (c === 'this.props.navigation.navigate' && !next) {
          next = p.node.arguments[0].value;
          const props = p.node.arguments[1].properties.map((q) => q.key.name);
          group = props.find((k) => !['profile', 'love_interest', 'cities', 'no_kids', 'professions', 'vehicles', 'money_in_bank', 'type_pet'].includes(k)) || props[props.length - 1];
        }
      },
    });
    // group = the key this screen adds (last property in the navigate object)
    traverse(ast, {
      CallExpression(p) {
        if (gen(p.node.callee).code !== 'this.props.navigation.navigate') return;
        const ps = p.node.arguments[1].properties;
        const own = ps.find((q) => q.value.type === 'ObjectExpression' && q.value.properties.some((x) => gen(x.value).code.startsWith('this.state')));
        if (own) group = own.key.name;
      },
    });
    inputs[id] = { blocks: blocks.filter((b) => b.t !== 'choice'), fields, next, group };
    continue;
  }

  if (SPECIAL.has(id)) { scenes[id] = { blocks, special: true }; continue; }
  scenes[id] = { blocks };
}

// screen ids in the navigator differ from file names for a few
const out = { scenes, inputs, endings };
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log('scenes', Object.keys(scenes).length, 'inputs', Object.keys(inputs).length, 'endings', Object.keys(endings).length);
console.log([...new Set(warnings)].join('\n'));

// route-name -> file-id map from App.js
{
  const app = fs.readFileSync(path.join(srcDir, 'App.js'), 'utf8');
  const imports = {};
  for (const m of app.matchAll(/import (\w+) from '\.\/screens\/(\w+)'/g)) imports[m[1]] = m[2];
  const routes = {};
  for (const m of app.matchAll(/(\w+)\s*:\s*\{\s*screen:\s*(\w+)\s*\}/g)) routes[m[1]] = m[2] === 'HomeScreen' ? 'Home' : imports[m[2]];
  out.routes = routes;
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
  const all = new Set([...Object.keys(scenes), ...Object.keys(inputs), 'Results', 'Home']);
  const missing = [];
  const walkB = (bs, from) => bs.forEach((b) => { if (b.t === 'row') walkB(b.c, from); if (b.t === 'choice') { if (b.to && !all.has(routes[b.to] || '?')) missing.push(from + '->' + b.to); if (b.action) missing.push(from + ' action ' + b.action.slice(0, 60)); } });
  for (const [k, s] of Object.entries(scenes)) walkB(s.blocks, k);
  for (const [k, s] of Object.entries(endings)) walkB(s.blocks, 'end' + k);
  for (const [k, s] of Object.entries(inputs)) if (!all.has(routes[s.next])) missing.push(k + ' next ' + s.next);
  const unreferenced = Object.keys(scenes).filter((s) => !Object.values(routes).includes(s));
  console.log('missing', missing, 'files not routed', unreferenced);
}
