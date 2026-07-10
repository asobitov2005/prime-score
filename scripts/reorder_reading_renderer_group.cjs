const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const filePath = "frontend/components/exam/reading-exam-preview.tsx";
const source = fs.readFileSync(filePath, "utf8");
const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function names(name, out = []) {
  if (ts.isIdentifier(name)) out.push(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const item of name.elements) if (ts.isBindingElement(item)) names(item.name, out);
  }
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
function refs(node) {
  const local = locals(node);
  const result = new Set();
  function visit(current) {
    if (ts.isIdentifier(current)) {
      const p = current.parent;
      const ignore =
        (ts.isPropertyAccessExpression(p) && p.name === current) ||
        (ts.isPropertyAssignment(p) && p.name === current && !ts.isShorthandPropertyAssignment(p)) ||
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
function statementText(node) {
  return source.slice(node.getFullStart(), node.end).trim();
}

const component = sf.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "ReadingExamPreview");
if (!component?.body) throw new Error("ReadingExamPreview not found");
const statements = [...component.body.statements];
const start = statements.findIndex((node) => declared(node).includes("renderReviewExplanation"));
const end = statements.findIndex((node) => declared(node).includes("renderGroupQuestionList"));
if (start < 0 || end < start) throw new Error("Renderer block not found");
const block = statements.slice(start, end + 1);
const owner = new Map();
block.forEach((node, index) => declared(node).forEach((name) => owner.set(name, index)));
const dependencies = block.map((node) => new Set([...refs(node)].map((name) => owner.get(name)).filter((index) => index !== undefined)));

const indegree = block.map(() => 0);
const dependents = block.map(() => new Set());
dependencies.forEach((items, index) => {
  for (const dependency of items) {
    if (dependency === index) continue;
    indegree[index] += 1;
    dependents[dependency].add(index);
  }
});
const queue = indegree.map((value, index) => ({ value, index })).filter((item) => item.value === 0).map((item) => item.index);
const ordered = [];
while (queue.length) {
  queue.sort((a, b) => a - b);
  const index = queue.shift();
  ordered.push(index);
  for (const dependent of dependents[index]) {
    indegree[dependent] -= 1;
    if (indegree[dependent] === 0) queue.push(dependent);
  }
}
if (ordered.length !== block.length) {
  const unresolved = block.map((_, index) => index).filter((index) => !ordered.includes(index));
  const namesText = unresolved.flatMap((index) => declared(block[index])).join(",");
  throw new Error(`Renderer dependency cycle: ${namesText}`);
}

const replacement = `\n${ordered.map((index) => statementText(block[index])).join("\n\n")}\n`;
const first = block[0];
const last = block.at(-1);
const updated = source.slice(0, first.getFullStart()) + replacement + source.slice(last.end);
fs.writeFileSync(filePath, updated);
