const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const inventory = fs
  .readFileSync("artifacts/remaining-ui-files.tsv", "utf8")
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.split("\t")[1]);

function lineOf(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function functionLike(node) {
  if (ts.isFunctionDeclaration(node) && node.body) return node;
  if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) {
      const init = declaration.initializer;
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && init.body) {
        return init;
      }
    }
  }
  return null;
}

const rows = [
  "file\tcomponent_start\tcomponent_end\tcomponent_lines\tstatement_index\tstatement_kind\tstart\tend\tlines\treturn_jsx",
];
for (const filePath of inventory) {
  const text = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const candidates = sourceFile.statements
    .map(functionLike)
    .filter(Boolean)
    .map((node) => ({
      node,
      start: lineOf(sourceFile, node.getStart(sourceFile)),
      end: lineOf(sourceFile, node.end),
    }))
    .sort((a, b) => b.end - b.start - (a.end - a.start));
  const candidate = candidates[0];
  if (!candidate || !ts.isBlock(candidate.node.body)) continue;
  candidate.node.body.statements.forEach((statement, index) => {
    const start = lineOf(sourceFile, statement.getStart(sourceFile));
    const end = lineOf(sourceFile, statement.end);
    const returnJsx =
      ts.isReturnStatement(statement) &&
      statement.expression &&
      (ts.isJsxElement(statement.expression) ||
        ts.isJsxSelfClosingElement(statement.expression) ||
        ts.isJsxFragment(statement.expression) ||
        ts.isParenthesizedExpression(statement.expression));
    rows.push(
      [
        filePath,
        candidate.start,
        candidate.end,
        candidate.end - candidate.start + 1,
        index + 1,
        ts.SyntaxKind[statement.kind],
        start,
        end,
        end - start + 1,
        Boolean(returnJsx),
      ].join("\t"),
    );
  });
}
fs.writeFileSync("artifacts/large-component-bodies.tsv", rows.join("\n") + "\n");
