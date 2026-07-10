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

function bindingNames(name, output = []) {
  if (ts.isIdentifier(name)) output.push(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) bindingNames(element.name, output);
    }
  }
  return output;
}

function declaredNames(statement) {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((item) =>
      bindingNames(item.name),
    );
  }
  if (
    (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
    statement.name
  ) {
    return [statement.name.text];
  }
  return [];
}

function statementText(statement) {
  return source.slice(statement.getFullStart(), statement.end).trim();
}

function functionName(statement) {
  return ts.isFunctionDeclaration(statement) && statement.name
    ? statement.name.text
    : null;
}

const component = sourceFile.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "ReadingExamPreview",
);
if (!component?.body) {
  throw new Error("ReadingExamPreview not found");
}

const statements = [...component.body.statements];
const control = statements.find(
  (statement) => functionName(statement) === "renderQuestionControl",
);
if (!control?.body) {
  throw new Error("renderQuestionControl not found");
}

const controlStatements = [...control.body.statements];
const finalReturn = [...controlStatements]
  .reverse()
  .find((statement) => ts.isReturnStatement(statement) && statement.expression);
if (!finalReturn?.expression) {
  throw new Error("renderQuestionControl fallback return not found");
}
const firstBranchIndex = controlStatements.findIndex(ts.isIfStatement);
if (firstBranchIndex < 0) {
  throw new Error("renderQuestionControl has no branch statements");
}
const initialStatements = controlStatements.slice(0, firstBranchIndex);
const branchStatements = controlStatements.slice(
  firstBranchIndex,
  controlStatements.indexOf(finalReturn),
);
const unsupported = branchStatements.filter(
  (statement) => !ts.isIfStatement(statement),
);
if (unsupported.length > 0) {
  throw new Error(
    `Unsupported renderQuestionControl statement: ${ts.SyntaxKind[unsupported[0].kind]}`,
  );
}

const parameterText = control.parameters
  .map((parameter) => source.slice(parameter.getStart(sourceFile), parameter.end))
  .join(", ");
const parameterNames = control.parameters.flatMap((parameter) =>
  bindingNames(parameter.name),
);
const contextNames = [
  ...new Set([
    ...parameterNames,
    ...initialStatements.flatMap(declaredNames),
  ]),
];
const destructure = `const { ${contextNames.join(", ")} } = context;`;
const initialBody = initialStatements
  .map(statementText)
  .join("\n\n")
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n");

const generated = [
  "const QUESTION_CONTROL_NO_MATCH = Symbol(\"question-control-no-match\");",
  "",
  `function buildQuestionControlContext(${parameterText}) {`,
  initialBody,
  `  return { ${contextNames.join(", ")} };`,
  "}",
  "",
  "type QuestionControlContext = ReturnType<typeof buildQuestionControlContext>;",
  "",
];

branchStatements.forEach((statement, index) => {
  const name = `renderQuestionControlBranch${index + 1}`;
  generated.push(
    `function ${name}(context: QuestionControlContext) {`,
    `  ${destructure}`,
    ...statementText(statement)
      .split("\n")
      .map((line) => `  ${line}`),
    "  return QUESTION_CONTROL_NO_MATCH;",
    "}",
    "",
  );
});

generated.push(
  "function renderQuestionControlFallback(context: QuestionControlContext) {",
  `  ${destructure}`,
  "  return (",
  ...source
    .slice(finalReturn.expression.getStart(sourceFile), finalReturn.expression.end)
    .split("\n")
    .map((line) => `    ${line}`),
  "  );",
  "}",
  "",
  `function renderQuestionControl(${parameterText}) {`,
  `  const context = buildQuestionControlContext(${parameterNames.join(", ")});`,
);
branchStatements.forEach((_, index) => {
  generated.push(
    `  const branch${index + 1} = renderQuestionControlBranch${index + 1}(context);`,
    `  if (branch${index + 1} !== QUESTION_CONTROL_NO_MATCH) return branch${index + 1};`,
  );
});
generated.push(
  "  return renderQuestionControlFallback(context);",
  "}",
);

const orderedNames = [
  "renderReviewExplanation",
  "renderCompletionAnswer",
  "renderFlowChartCompletionGroup",
  "renderInlineCompletionGroup",
  "renderMatchingHeadingDropArea",
  "renderCustomGroupTitle",
  "renderQuestionControl",
  "renderGroupQuestionList",
];
const orderedStatements = new Map(
  statements
    .filter((statement) => orderedNames.includes(functionName(statement)))
    .map((statement) => [functionName(statement), statement]),
);
for (const name of orderedNames) {
  if (!orderedStatements.has(name)) {
    throw new Error(`Renderer function missing: ${name}`);
  }
}

const selected = [...orderedStatements.values()];
const insertionStart = Math.min(
  ...selected.map((statement) => statement.getFullStart()),
);
const removalRanges = selected
  .map((statement) => ({ start: statement.getFullStart(), end: statement.end }))
  .sort((a, b) => b.start - a.start);

const orderedBlocks = [];
for (const name of orderedNames) {
  if (name === "renderQuestionControl") {
    orderedBlocks.push(generated.join("\n"));
  } else {
    orderedBlocks.push(statementText(orderedStatements.get(name)));
  }
}
const replacement = `\n${orderedBlocks.join("\n\n")}\n`;

let updated = source;
for (const range of removalRanges) {
  updated = updated.slice(0, range.start) + updated.slice(range.end);
}
const removedBeforeInsertion = removalRanges
  .filter((range) => range.start < insertionStart)
  .reduce((sum, range) => sum + range.end - range.start, 0);
const adjustedInsertion = insertionStart - removedBeforeInsertion;
updated =
  updated.slice(0, adjustedInsertion) +
  replacement +
  updated.slice(adjustedInsertion);

fs.writeFileSync(filePath, updated);
