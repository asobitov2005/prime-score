const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const filePath = "admin/components/test-editor-wizard.tsx";
const moduleDir = "admin/components/test-editor-wizard-modules/questions-panel";
const source = fs.readFileSync(filePath, "utf8");
const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function names(name, out = []) {
  if (ts.isIdentifier(name)) out.push(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name))
    for (const item of name.elements) if (ts.isBindingElement(item)) names(item.name, out);
  return out;
}
function declared(node) {
  if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) && node.name) return [node.name.text];
  if (ts.isVariableStatement(node)) return node.declarationList.declarations.flatMap((item) => names(item.name));
  return [];
}
function locals(node) {
  const result = new Set();
  function visit(current) {
    if (current !== node) {
      if (ts.isVariableDeclaration(current) || ts.isParameter(current)) names(current.name).forEach((name) => result.add(name));
      if ((ts.isFunctionDeclaration(current) || ts.isClassDeclaration(current) || ts.isInterfaceDeclaration(current) || ts.isTypeAliasDeclaration(current)) && current.name) result.add(current.name.text);
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return result;
}
function refs(node, skipped = new Set()) {
  const local = locals(node);
  const result = new Set();
  function visit(current) {
    if (skipped.has(current)) return;
    if (ts.isIdentifier(current)) {
      const p = current.parent;
      const ignore =
        (ts.isPropertyAccessExpression(p) && p.name === current) ||
        (ts.isPropertyAssignment(p) && p.name === current && !ts.isShorthandPropertyAssignment(p)) ||
        (ts.isMethodDeclaration(p) && p.name === current) ||
        (ts.isPropertyDeclaration(p) && p.name === current) ||
        (ts.isJsxAttribute(p) && p.name === current) ||
        (ts.isBindingElement(p) && p.propertyName === current) ||
        (ts.isVariableDeclaration(p) && p.name === current) ||
        (ts.isParameter(p) && p.name === current) ||
        ((ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p) || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p)) && p.name === current);
      if (!ignore && !local.has(current.text)) result.add(current.text);
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return result;
}
function importNames(node) {
  if (!ts.isImportDeclaration(node) || !node.importClause) return [];
  const out = [];
  if (node.importClause.name) out.push(node.importClause.name.text);
  const binding = node.importClause.namedBindings;
  if (binding && ts.isNamespaceImport(binding)) out.push(binding.name.text);
  if (binding && ts.isNamedImports(binding)) out.push(...binding.elements.map((item) => item.name.text));
  return out;
}
function text(node) { return source.slice(node.getStart(sf), node.end); }
function full(node) { return source.slice(node.getFullStart(), node.end).trim(); }
function lineCount(value) { return value.split(/\r?\n/).length; }
function unwrap(node) { while (node && ts.isParenthesizedExpression(node)) node = node.expression; return node; }
function children(node) {
  const current = unwrap(node);
  if (ts.isJsxElement(current) || ts.isJsxFragment(current)) return current.children.filter((child) => !ts.isJsxText(child) || child.getText(sf).trim());
  if (ts.isJsxExpression(current) && current.expression) return children(current.expression);
  if (ts.isConditionalExpression(current)) return [current.whenTrue, current.whenFalse];
  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return [current.right];
  return [];
}
function findMap(root, receiver) {
  let found = null;
  function visit(node) {
    if (found) return;
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "map" && node.expression.expression.getText(sf) === receiver) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}
function enclosingJsxExpression(node, stop) {
  let current = node;
  while (current && current !== stop) {
    if (ts.isJsxExpression(current)) return current;
    current = current.parent;
  }
  return null;
}
function replaceRanges(value, base, replacements) {
  let out = value;
  for (const item of [...replacements].sort((a, b) => b.start - a.start)) out = out.slice(0, item.start - base) + item.value + out.slice(item.end - base);
  return out;
}
function namedImport(values, from, typeOnly = false) {
  const unique = [...new Set(values)].sort();
  return unique.length ? `import${typeOnly ? " type" : ""} { ${unique.join(", ")} } from ${JSON.stringify(from)};` : "";
}
function write(name, content) {
  const target = path.join(moduleDir, name);
  if (lineCount(content) > 290) throw new Error(`${target} has ${lineCount(content)} lines`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${content.trimEnd()}\n`);
}

const imported = new Set(sf.statements.flatMap(importNames));
const panel = sf.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "QuestionsPanel");
if (!panel?.body) throw new Error("QuestionsPanel not found");
const shared = new Set(sf.statements.filter((node) => node !== panel && !ts.isImportDeclaration(node)).flatMap(declared));
const statements = [...panel.body.statements];
const finalReturn = [...statements].reverse().find((node) => ts.isReturnStatement(node) && node.expression);
if (!finalReturn?.expression) throw new Error("QuestionsPanel return not found");
const scopeNames = new Set([...panel.parameters.flatMap((p) => names(p.name)), ...statements.slice(0, statements.indexOf(finalReturn)).flatMap(declared)]);
const outerMap = findMap(finalReturn.expression, "groupedQuestionGroups");
const outerExpression = outerMap && enclosingJsxExpression(outerMap, finalReturn.expression);
if (!outerMap || !outerExpression) throw new Error("Section group map not found");
const outerCallback = outerMap.arguments[0];
if (!outerCallback || (!ts.isArrowFunction(outerCallback) && !ts.isFunctionExpression(outerCallback))) throw new Error("Section group callback not found");
const outerBody = unwrap(outerCallback.body);
const innerMap = findMap(outerBody, "sectionGroup.groups");
const innerExpression = innerMap && enclosingJsxExpression(innerMap, outerBody);
if (!innerMap || !innerExpression) throw new Error("Question group map not found");
const innerCallback = innerMap.arguments[0];
if (!innerCallback || (!ts.isArrowFunction(innerCallback) && !ts.isFunctionExpression(innerCallback)) || !ts.isBlock(innerCallback.body)) throw new Error("Question group callback must use a block");
const innerStatements = [...innerCallback.body.statements];
const innerReturn = innerStatements.find((node) => ts.isReturnStatement(node) && node.expression);
if (!innerReturn?.expression) throw new Error("Question group card return not found");
const itemStatements = innerStatements.slice(0, innerStatements.indexOf(innerReturn));
const itemNames = [...new Set(["sectionGroup", ...innerCallback.parameters.flatMap((p) => names(p.name)), ...itemStatements.flatMap(declared)])];

function context(node, skipped = new Set()) {
  const values = refs(node, skipped);
  return {
    scope: [...values].filter((name) => scopeNames.has(name)),
    item: [...values].filter((name) => itemNames.includes(name)),
    dependencies: [...values].filter((name) => imported.has(name)),
    shared: [...values].filter((name) => shared.has(name) && !scopeNames.has(name)),
  };
}
function importsFor(ctx, extra = []) {
  return [
    '"use client";',
    'import type { QuestionsPanelScope } from "./controller";',
    'import type { QuestionGroupItem } from "./question-group-item";',
    namedImport(ctx.dependencies, "../dependencies"),
    namedImport(ctx.shared, "../shared"),
    ...extra,
  ].filter(Boolean);
}

let sectionCounter = 0;
const sectionFiles = [];
function createCardSection(node) {
  sectionCounter += 1;
  const component = `QuestionGroupSection${sectionCounter}`;
  let body = text(node);
  const replacements = [];
  let candidates = children(node).filter((child) => lineCount(text(child)) > 18);
  if (lineCount(body) > 220) {
    candidates = candidates.sort((a, b) => lineCount(text(b)) - lineCount(text(a)));
    for (const child of candidates) {
      if (lineCount(body) <= 220) break;
      const childName = createCardSection(child);
      replacements.push({ start: child.getStart(sf), end: child.end, value: `<${childName} scope={scope} item={item} />` });
      body = replaceRanges(text(node), node.getStart(sf), replacements);
    }
  }
  if (lineCount(body) > 270) throw new Error(`${component} remains ${lineCount(body)} lines`);
  const ctx = context(node, new Set(candidates));
  const nested = replacements.map((item) => item.value.match(/^<([A-Za-z0-9_]+)/)?.[1]).filter(Boolean);
  const lines = importsFor(ctx, nested.map((name) => `import { ${name} } from "./${sectionFiles.find((file) => file.name === name)?.file}";`));
  lines.push("", `export function ${component}({ scope, item }: { scope: QuestionsPanelScope; item: QuestionGroupItem }) {`);
  if (ctx.scope.length) lines.push(`  const { ${ctx.scope.join(", ")} } = scope;`);
  if (ctx.item.length) lines.push(`  const { ${ctx.item.join(", ")} } = item;`);
  const current = unwrap(node);
  const rendered = ts.isJsxExpression(current) ? `<>{${current.expression.getText(sf)}}</>` : body;
  lines.push("  return (", ...rendered.split("\n").map((line) => `    ${line}`), "  );", "}");
  const file = `question-group-section-${String(sectionCounter).padStart(2, "0")}.tsx`;
  sectionFiles.push({ name: component, file, content: lines.join("\n") });
  return component;
}
const rootCard = createCardSection(innerReturn.expression);
for (const file of sectionFiles) write(file.file, file.content);

const itemRefs = new Set(itemStatements.flatMap((node) => [...refs(node)]));
const itemScope = [...itemRefs].filter((name) => scopeNames.has(name));
const itemDeps = [...itemRefs].filter((name) => imported.has(name));
const itemShared = [...itemRefs].filter((name) => shared.has(name) && !scopeNames.has(name));
const itemLines = ['"use client";', 'import type { QuestionsPanelScope } from "./controller";', namedImport(itemDeps, "../dependencies"), namedImport(itemShared, "../shared"), "", "export function buildQuestionGroupItem(", "  scope: QuestionsPanelScope,", '  sectionGroup: QuestionsPanelScope["groupedQuestionGroups"][number],', '  group: NonNullable<QuestionsPanelScope["draft"]["questionGroups"]>[number],', "  groupIndex: number,", ") {"];
if (itemScope.length) itemLines.push(`  const { ${itemScope.join(", ")} } = scope;`);
for (const node of itemStatements) itemLines.push(...full(node).split("\n").map((line) => `  ${line}`), "");
itemLines.push(`  return { ${itemNames.join(", ")} };`, "}", "", "export type QuestionGroupItem = ReturnType<typeof buildQuestionGroupItem>;");
write("question-group-item.tsx", itemLines.filter((line, index, array) => !(line === "" && array[index - 1] === "")).join("\n"));
write("question-group-card.tsx", ['"use client";', 'import type { QuestionsPanelScope } from "./controller";', 'import type { QuestionGroupItem } from "./question-group-item";', `import { ${rootCard} } from "./${sectionFiles.find((file) => file.name === rootCard).file}";`, "", `export function QuestionGroupCard({ scope, item }: { scope: QuestionsPanelScope; item: QuestionGroupItem }) {`, `  return <${rootCard} scope={scope} item={item} />;`, "}"].join("\n"));
write("question-group-list.tsx", ['"use client";', 'import type { QuestionsPanelScope } from "./controller";', 'import { buildQuestionGroupItem } from "./question-group-item";', 'import { QuestionGroupCard } from "./question-group-card";', "", 'export function QuestionGroupList({ scope, sectionGroup }: { scope: QuestionsPanelScope; sectionGroup: QuestionsPanelScope["groupedQuestionGroups"][number] }) {', "  return (", "    <>", "      {sectionGroup.groups.map((group, groupIndex) => (", "        <QuestionGroupCard key={group.id} scope={scope} item={buildQuestionGroupItem(scope, sectionGroup, group, groupIndex)} />", "      ))}", "    </>", "  );", "}"].join("\n"));

const outerText = replaceRanges(text(outerExpression), outerExpression.getStart(sf), [{ start: innerExpression.getStart(sf), end: innerExpression.end, value: "<QuestionGroupList scope={scope} sectionGroup={sectionGroup} />" }]);
const outerCtx = context(outerExpression, new Set([innerExpression]));
const outerLines = ['"use client";', 'import type { QuestionsPanelScope } from "./controller";', namedImport(outerCtx.dependencies, "../dependencies"), namedImport(outerCtx.shared, "../shared"), 'import { QuestionGroupList } from "./question-group-list";', "", "export function QuestionSectionGroups({ scope }: { scope: QuestionsPanelScope }) {"];
if (outerCtx.scope.length) outerLines.push(`  const { ${outerCtx.scope.join(", ")} } = scope;`);
outerLines.push("  return (", `    <>${outerText}</>`, "  );", "}");
write("question-section-groups.tsx", outerLines.filter(Boolean).join("\n"));

const rootText = replaceRanges(text(finalReturn.expression), finalReturn.expression.getStart(sf), [{ start: outerExpression.getStart(sf), end: outerExpression.end, value: "<QuestionSectionGroups scope={scope} />" }]);
const rootCtx = context(finalReturn.expression, new Set([outerExpression]));
const rootLines = ['"use client";', 'import type { QuestionsPanelScope } from "./controller";', namedImport(rootCtx.dependencies, "../dependencies"), namedImport(rootCtx.shared, "../shared"), 'import { QuestionSectionGroups } from "./question-section-groups";', "", "export function QuestionsPanelView({ scope }: { scope: QuestionsPanelScope }) {"];
if (rootCtx.scope.length) rootLines.push(`  const { ${rootCtx.scope.join(", ")} } = scope;`);
rootLines.push("  return (", ...rootText.split("\n").map((line) => `    ${line}`), "  );", "}");
write("view.tsx", rootLines.filter(Boolean).join("\n"));
write("index.tsx", ['"use client";', 'import { useQuestionsPanelController } from "./controller";', 'import { QuestionsPanelView } from "./view";', "", 'export function QuestionsPanel(props: Parameters<typeof useQuestionsPanelController>[0]) {', "  const scope = useQuestionsPanelController(props);", "  return <QuestionsPanelView scope={scope} />;", "}"].join("\n"));

const lastImport = sf.statements.filter(ts.isImportDeclaration).at(-1);
const importLine = '\nimport { QuestionsPanel } from "./test-editor-wizard-modules/questions-panel";';
const updated = source.slice(0, lastImport.end) + importLine + source.slice(lastImport.end, panel.getFullStart()) + "\n" + source.slice(panel.end);
fs.writeFileSync(filePath, updated);
