const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const filePath = process.argv[2];
const outputPath = process.argv[3];
if (!filePath || !outputPath) {
  throw new Error("Usage: node map_large_component_worker.cjs <file> <output>");
}

const source = fs.readFileSync(filePath, "utf8");
const sourceFile = ts.createSourceFile(
  filePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
);

function lineOf(position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function bindingNames(name, output = []) {
  if (ts.isIdentifier(name)) output.push(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) bindingNames(element.name, output);
    }
  }
  return output;
}

function statementNames(node) {
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.flatMap((item) => bindingNames(item.name));
  }
  if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
    return [node.name.text];
  }
  return [];
}

function localNames(node) {
  const result = new Set();
  function visit(current) {
    if (current !== node) {
      if (ts.isVariableDeclaration(current) || ts.isParameter(current)) {
        bindingNames(current.name).forEach((name) => result.add(name));
      }
      if (
        (ts.isFunctionDeclaration(current) ||
          ts.isClassDeclaration(current) ||
          ts.isInterfaceDeclaration(current) ||
          ts.isTypeAliasDeclaration(current)) &&
        current.name
      ) {
        result.add(current.name.text);
      }
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return result;
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
  return [...refs].sort();
}

function functionCandidate(statement) {
  if (ts.isFunctionDeclaration(statement) && statement.body && statement.name) {
    return { name: statement.name.text, node: statement, body: statement.body };
  }
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (
        ts.isIdentifier(declaration.name) &&
        init &&
        (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) &&
        ts.isBlock(init.body)
      ) {
        return { name: declaration.name.text, node: statement, body: init.body };
      }
    }
  }
  return null;
}

function classify(statement) {
  if (ts.isReturnStatement(statement)) return "return";
  if (ts.isIfStatement(statement)) return "guard";
  if (ts.isExpressionStatement(statement)) {
    const expression = statement.expression;
    if (ts.isCallExpression(expression)) {
      const text = expression.expression.getText(sourceFile);
      if (text === "useEffect" || text === "React.useEffect") return "effect";
      if (text === "useLayoutEffect" || text === "React.useLayoutEffect") return "layout-effect";
    }
  }
  if (ts.isVariableStatement(statement)) {
    const text = statement.getText(sourceFile);
    if (/\buseState\s*\(/.test(text)) return "state";
    if (/\buseReducer\s*\(/.test(text)) return "reducer";
    if (/\buseRef\s*\(/.test(text)) return "ref";
    if (/\buseMemo\s*\(/.test(text)) return "memo";
    if (/\buseCallback\s*\(/.test(text)) return "callback";
    if (/\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(text)) return "hook";
    return "derived";
  }
  if (ts.isFunctionDeclaration(statement)) return "function";
  return ts.SyntaxKind[statement.kind];
}

function directJsxChildren(expression) {
  let current = expression;
  while (current && ts.isParenthesizedExpression(current)) current = current.expression;
  if (!current) return [];
  if (ts.isJsxElement(current) || ts.isJsxFragment(current)) {
    return current.children.filter(
      (child) => !ts.isJsxText(child) || child.getText(sourceFile).trim(),
    );
  }
  return [];
}

const candidates = sourceFile.statements
  .map(functionCandidate)
  .filter(Boolean)
  .sort(
    (a, b) =>
      lineOf(b.node.end) -
      lineOf(b.node.getStart(sourceFile)) -
      (lineOf(a.node.end) - lineOf(a.node.getStart(sourceFile))),
  );
const component = candidates[0];
if (!component) throw new Error(`No component found in ${filePath}`);

const rows = [
  "index\tkind\tstart\tend\tlines\tnames\tlocal_refs\tall_refs",
];
const ownerNames = new Set(
  component.body.statements.flatMap((statement) => statementNames(statement)),
);
component.body.statements.forEach((statement, index) => {
  const refs = references(statement);
  const localRefs = refs.filter((name) => ownerNames.has(name));
  rows.push(
    [
      index + 1,
      classify(statement),
      lineOf(statement.getStart(sourceFile)),
      lineOf(statement.end),
      lineOf(statement.end) - lineOf(statement.getStart(sourceFile)) + 1,
      statementNames(statement).join(","),
      localRefs.join(","),
      refs.join(","),
    ].join("\t"),
  );
});

const returnStatement = [...component.body.statements]
  .reverse()
  .find((statement) => ts.isReturnStatement(statement) && statement.expression);
const jsxRows = ["index\tstart\tend\tlines\tkind\trefs"];
if (returnStatement?.expression) {
  directJsxChildren(returnStatement.expression).forEach((child, index) => {
    jsxRows.push(
      [
        index + 1,
        lineOf(child.getStart(sourceFile)),
        lineOf(child.end),
        lineOf(child.end) - lineOf(child.getStart(sourceFile)) + 1,
        ts.SyntaxKind[child.kind],
        references(child).join(","),
      ].join("\t"),
    );
  });
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  [
    `file\t${filePath}`,
    `component\t${component.name}`,
    `start\t${lineOf(component.node.getStart(sourceFile))}`,
    `end\t${lineOf(component.node.end)}`,
    "",
    ...rows,
    "",
    "ROOT_JSX",
    ...jsxRows,
    "",
  ].join("\n"),
);
