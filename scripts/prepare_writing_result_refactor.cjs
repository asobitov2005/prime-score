const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const filePath = "frontend/app/(app)/writing/submissions/[submissionId]/result/result-client.tsx";
const readyPath = "frontend/app/(app)/writing/submissions/[submissionId]/result/writing-result-ready-view.tsx";
const source = fs.readFileSync(filePath, "utf8");
const sourceFile = ts.createSourceFile(
  filePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function bindingNames(name, output = []) {
  if (ts.isIdentifier(name)) output.push(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) bindingNames(element.name, output);
    }
  }
  return output;
}

function declaredNames(node) {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    return node.name && ts.isIdentifier(node.name) ? [node.name.text] : [];
  }
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.flatMap((item) => bindingNames(item.name));
  }
  return [];
}

function localNames(node) {
  const values = new Set();
  function visit(current) {
    if (current !== node) {
      if (ts.isVariableDeclaration(current) || ts.isParameter(current)) {
        bindingNames(current.name).forEach((name) => values.add(name));
      }
      if (
        (ts.isFunctionDeclaration(current) ||
          ts.isClassDeclaration(current) ||
          ts.isInterfaceDeclaration(current) ||
          ts.isTypeAliasDeclaration(current)) &&
        current.name
      ) {
        values.add(current.name.text);
      }
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return values;
}

function references(node) {
  const locals = localNames(node);
  const refs = new Set();
  function visit(current) {
    if (ts.isIdentifier(current)) {
      const parent = current.parent;
      const ignored =
        (ts.isPropertyAccessExpression(parent) && parent.name === current) ||
        (ts.isPropertyAssignment(parent) && parent.name === current && !ts.isShorthandPropertyAssignment(parent)) ||
        (ts.isMethodDeclaration(parent) && parent.name === current) ||
        (ts.isPropertyDeclaration(parent) && parent.name === current) ||
        (ts.isJsxAttribute(parent) && parent.name === current) ||
        (ts.isBindingElement(parent) && parent.propertyName === current) ||
        (ts.isVariableDeclaration(parent) && parent.name === current) ||
        (ts.isParameter(parent) && parent.name === current) ||
        (ts.isFunctionDeclaration(parent) && parent.name === current) ||
        (ts.isClassDeclaration(parent) && parent.name === current) ||
        (ts.isInterfaceDeclaration(parent) && parent.name === current) ||
        (ts.isTypeAliasDeclaration(parent) && parent.name === current);
      if (!ignored && !locals.has(current.text)) refs.add(current.text);
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return refs;
}

function text(node) {
  return source.slice(node.getFullStart(), node.end).trim();
}

function importNames(statement) {
  const output = [];
  if (!ts.isImportDeclaration(statement) || !statement.importClause) return output;
  const clause = statement.importClause;
  if (clause.name) output.push(clause.name.text);
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings)) output.push(bindings.name.text);
  if (bindings && ts.isNamedImports(bindings)) {
    output.push(...bindings.elements.map((item) => item.name.text));
  }
  return output;
}

function containsReturn(node) {
  let found = false;
  function visit(current) {
    if (ts.isReturnStatement(current)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return found;
}

const component = sourceFile.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "WritingResultClient",
);
if (!component || !component.body) throw new Error("WritingResultClient not found");

const statements = [...component.body.statements];
const guardIndexes = statements
  .map((statement, index) =>
    ts.isIfStatement(statement) && containsReturn(statement) ? index : -1,
  )
  .filter((index) => index >= 0);
if (guardIndexes.length < 2) {
  throw new Error(`Expected failed and grading guards, found ${guardIndexes.length}`);
}
const failedGuardIndex = guardIndexes[guardIndexes.length - 2];
const gradingGuardIndex = guardIndexes[guardIndexes.length - 1];
const finalReturnIndex = statements.findLastIndex(ts.isReturnStatement);
if (finalReturnIndex <= gradingGuardIndex) {
  throw new Error("Final ready-result return not found");
}
const failedIf = statements[failedGuardIndex];
const gradingIf = statements[gradingGuardIndex];
const finalReturn = statements[finalReturnIndex];
if (!finalReturn.expression) throw new Error("Final result return is empty");

const preReadyStatements = statements.slice(0, failedGuardIndex);
const readyStatements = statements.slice(gradingGuardIndex + 1, finalReturnIndex);
const parameter = component.parameters[0];
if (!parameter || !parameter.type) throw new Error("Result component props are not typed");
const bindingText = source.slice(parameter.name.getStart(), parameter.name.end);
const typeText = source.slice(parameter.type.getStart(), parameter.type.end);
const parameterNames = bindingNames(parameter.name);
const stateNames = preReadyStatements.flatMap(declaredNames);
const hookReturnNames = [...new Set([...parameterNames, ...stateNames])];

const allReadyRefs = new Set();
for (const statement of readyStatements) {
  references(statement).forEach((name) => allReadyRefs.add(name));
}
references(finalReturn.expression).forEach((name) => allReadyRefs.add(name));
const scopeRefs = hookReturnNames.filter((name) => allReadyRefs.has(name));

const importedNames = new Set(
  sourceFile.statements.flatMap((statement) => importNames(statement)),
);
const sharedNames = new Set(
  sourceFile.statements
    .filter((statement) => statement !== component && !ts.isImportDeclaration(statement))
    .flatMap(declaredNames),
);
const dependencyRefs = [...allReadyRefs].filter((name) => importedNames.has(name));
const sharedRefs = [...allReadyRefs].filter((name) => sharedNames.has(name));

const hookBody = preReadyStatements.map(text).join("\n\n");
const failedGuardText = text(failedIf);
const gradingGuardText = text(gradingIf);
const readyBody = readyStatements.map(text).join("\n\n");
const finalExpression = source.slice(finalReturn.expression.getStart(), finalReturn.expression.end);

const hookAndWrapper = `export function useWritingResultClientState(${bindingText}: ${typeText}) {\n${hookBody
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}\n\n  return { ${hookReturnNames.join(", ")} };\n}\n\nexport type WritingResultClientState = ReturnType<typeof useWritingResultClientState>;\n\nexport function WritingResultClient(props: ${typeText}) {\n  const scope = useWritingResultClientState(props);\n  const { stage, errorMessage, handleRetry, retrying, activeStep, result } = scope;\n\n${failedGuardText
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}\n\n${gradingGuardText
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}\n\n  return <WritingResultReadyView scope={{ ...scope, result }} />;\n}`;

const componentStart = component.getFullStart();
const componentEnd = component.end;
let updatedSource =
  source.slice(0, componentStart) +
  hookAndWrapper +
  source.slice(componentEnd);
const importMarker = 'import Link from "next/link";';
updatedSource = updatedSource.replace(
  importMarker,
  `${importMarker}\nimport { WritingResultReadyView } from "./writing-result-ready-view";`,
);
fs.writeFileSync(filePath, updatedSource);

const depImport = dependencyRefs.length
  ? `import { ${[...new Set(dependencyRefs)].sort().join(", ")} } from "./result-client-modules/dependencies";\n`
  : "";
const sharedImport = sharedRefs.length
  ? `import { ${[...new Set(sharedRefs)].sort().join(", ")} } from "./result-client-modules/shared";\n`
  : "";
const readySource = `"use client";\n\n${depImport}${sharedImport}import type { WritingResultClientState } from "./result-client";\n\ntype WritingResultReadyScope = WritingResultClientState & {\n  result: NonNullable<WritingResultClientState["result"]>;\n};\n\nexport function WritingResultReadyView({ scope }: { scope: WritingResultReadyScope }) {\n  const { ${scopeRefs.join(", ")} } = scope;\n\n${readyBody
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}\n\n  return (\n${finalExpression
  .split("\n")
  .map((line) => `    ${line}`)
  .join("\n")}\n  );\n}\n`;
fs.writeFileSync(readyPath, readySource);
