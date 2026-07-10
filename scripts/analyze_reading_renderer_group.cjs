const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const filePath = "frontend/components/exam/reading-exam-preview.tsx";
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
function localNames(node) {
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
  const local = localNames(node);
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

const component = sf.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "ReadingExamPreview");
if (!component?.body) throw new Error("ReadingExamPreview not found");
const statements = [...component.body.statements];
const start = statements.findIndex((node) => declared(node).includes("renderReviewExplanation"));
const end = statements.findIndex((node) => declared(node).includes("renderGroupQuestionList"));
if (start < 0 || end < start) throw new Error("Renderer block not found");
const selected = statements.slice(start, end + 1);
const selectedNames = new Set(selected.flatMap(declared));
const owners = new Set(statements.flatMap(declared));
const rows = ["index\tlines\tnames\tselected_refs\tscope_refs"];
selected.forEach((node, index) => {
  const allRefs = refs(node);
  rows.push([
    index + 1,
    source.slice(node.getFullStart(), node.end).trim().split(/\r?\n/).length,
    declared(node).join(","),
    [...allRefs].filter((name) => selectedNames.has(name)).join(","),
    [...allRefs].filter((name) => owners.has(name) && !selectedNames.has(name)).join(","),
  ].join("\t"));
});
fs.writeFileSync("/tmp/reading-renderer-analysis.tsv", `${rows.join("\n")}\n`);
