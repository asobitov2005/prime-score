const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const filePath = "frontend/components/exam/reading-exam-preview.tsx";
const source = fs.readFileSync(filePath, "utf8");
const sourceFile = ts.createSourceFile(
  filePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function isEffectStatement(statement) {
  if (!ts.isExpressionStatement(statement)) return false;
  const expression = statement.expression;
  if (!ts.isCallExpression(expression)) return false;
  const callee = expression.expression;
  if (ts.isIdentifier(callee)) {
    return callee.text === "useEffect" || callee.text === "useLayoutEffect";
  }
  return (
    ts.isPropertyAccessExpression(callee) &&
    (callee.name.text === "useEffect" || callee.name.text === "useLayoutEffect")
  );
}

const component = sourceFile.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "ReadingExamPreview",
);
if (!component || !component.body) {
  throw new Error("ReadingExamPreview not found");
}
const statements = [...component.body.statements];
const finalReturn = [...statements]
  .reverse()
  .find((statement) => ts.isReturnStatement(statement));
if (!finalReturn) throw new Error("ReadingExamPreview return not found");
const bodyStatements = statements.filter((statement) => statement !== finalReturn);
const effects = bodyStatements.filter(isEffectStatement);
const nonEffects = bodyStatements.filter((statement) => !isEffectStatement(statement));
const bodyText = [...nonEffects, ...effects, finalReturn]
  .map((statement) => source.slice(statement.getFullStart(), statement.end).trim())
  .join("\n\n");
const replacement = `{\n${bodyText
  .split("\n")
  .map((line) => (line ? `  ${line}` : ""))
  .join("\n")}\n}`;
const updated =
  source.slice(0, component.body.getStart(sourceFile)) +
  replacement +
  source.slice(component.body.end);
fs.writeFileSync(filePath, updated);
