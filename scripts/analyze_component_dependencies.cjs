const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const files = fs
  .readFileSync("artifacts/final-oversized-source.tsv", "utf8")
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.split("\t")[1]);

function lineOf(sourceFile, position) {
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

function statementNames(statement) {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((item) => bindingNames(item.name));
  }
  if (
    (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
    statement.name
  ) {
    return [statement.name.text];
  }
  return [];
}

function localNames(node) {
  const output = new Set();
  function visit(current) {
    if (current !== node) {
      if (ts.isVariableDeclaration(current) || ts.isParameter(current)) {
        bindingNames(current.name).forEach((name) => output.add(name));
      }
      if (
        (ts.isFunctionDeclaration(current) ||
          ts.isClassDeclaration(current) ||
          ts.isInterfaceDeclaration(current) ||
          ts.isTypeAliasDeclaration(current)) &&
        current.name
      ) {
        output.add(current.name.text);
      }
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return output;
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

function functionCandidate(statement) {
  if (ts.isFunctionDeclaration(statement) && statement.body && statement.name) {
    return { name: statement.name.text, body: statement.body, node: statement };
  }
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const init = declaration.initializer;
      if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && ts.isBlock(init.body)) {
        return { name: declaration.name.text, body: init.body, node: statement };
      }
    }
  }
  return null;
}

function stronglyConnected(graph) {
  let index = 0;
  const indexes = Array(graph.length).fill(-1);
  const low = Array(graph.length).fill(0);
  const stack = [];
  const active = Array(graph.length).fill(false);
  const result = [];
  function visit(vertex) {
    indexes[vertex] = low[vertex] = index++;
    stack.push(vertex);
    active[vertex] = true;
    for (const target of graph[vertex]) {
      if (indexes[target] === -1) {
        visit(target);
        low[vertex] = Math.min(low[vertex], low[target]);
      } else if (active[target]) {
        low[vertex] = Math.min(low[vertex], indexes[target]);
      }
    }
    if (low[vertex] === indexes[vertex]) {
      const group = [];
      while (true) {
        const item = stack.pop();
        active[item] = false;
        group.push(item);
        if (item === vertex) break;
      }
      result.push(group);
    }
  }
  graph.forEach((_, vertex) => {
    if (indexes[vertex] === -1) visit(vertex);
  });
  return result;
}

function jsxChildren(expression) {
  let node = expression;
  while (ts.isParenthesizedExpression(node)) node = node.expression;
  if (ts.isJsxElement(node)) return node.children.filter((child) => !ts.isJsxText(child) || child.getText().trim());
  if (ts.isJsxFragment(node)) return node.children.filter((child) => !ts.isJsxText(child) || child.getText().trim());
  return [];
}

const rows = [
  "file\tcomponent\tcomponent_lines\tcontroller_lines\treturn_lines\tstatement_count\tscc_count\tlargest_scc_lines\tlargest_scc_names\troot_jsx_children\tlargest_child_lines",
];
for (const filePath of files) {
  const text = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const candidates = sourceFile.statements
    .map(functionCandidate)
    .filter(Boolean)
    .map((candidate) => ({
      ...candidate,
      lines: lineOf(sourceFile, candidate.node.end) - lineOf(sourceFile, candidate.node.getStart(sourceFile)) + 1,
    }))
    .sort((a, b) => b.lines - a.lines);
  const candidate = candidates[0];
  if (!candidate) continue;
  const statements = [...candidate.body.statements];
  const returnStatement = [...statements].reverse().find(ts.isReturnStatement);
  const controllerStatements = returnStatement
    ? statements.slice(0, statements.indexOf(returnStatement))
    : statements;
  const owners = new Map();
  controllerStatements.forEach((statement, statementIndex) => {
    statementNames(statement).forEach((name) => owners.set(name, statementIndex));
  });
  const graph = controllerStatements.map(() => new Set());
  controllerStatements.forEach((statement, statementIndex) => {
    for (const ref of references(statement)) {
      const owner = owners.get(ref);
      if (owner !== undefined && owner !== statementIndex) graph[statementIndex].add(owner);
    }
  });
  const groups = stronglyConnected(graph);
  const groupDetails = groups.map((group) => ({
    lines: group.reduce(
      (total, index) =>
        total +
        lineOf(sourceFile, controllerStatements[index].end) -
        lineOf(sourceFile, controllerStatements[index].getStart(sourceFile)) +
        1,
      0,
    ),
    names: group.flatMap((index) => statementNames(controllerStatements[index])),
  }));
  const largest = groupDetails.sort((a, b) => b.lines - a.lines)[0] ?? { lines: 0, names: [] };
  const returnLines = returnStatement
    ? lineOf(sourceFile, returnStatement.end) - lineOf(sourceFile, returnStatement.getStart(sourceFile)) + 1
    : 0;
  const children = returnStatement?.expression ? jsxChildren(returnStatement.expression) : [];
  const childLines = children.map(
    (child) => lineOf(sourceFile, child.end) - lineOf(sourceFile, child.getStart(sourceFile)) + 1,
  );
  const controllerLines = controllerStatements.reduce(
    (total, statement) =>
      total +
      lineOf(sourceFile, statement.end) -
      lineOf(sourceFile, statement.getStart(sourceFile)) +
      1,
    0,
  );
  rows.push(
    [
      filePath,
      candidate.name,
      candidate.lines,
      controllerLines,
      returnLines,
      controllerStatements.length,
      groups.length,
      largest.lines,
      largest.names.slice(0, 12).join(","),
      children.length,
      childLines.length ? Math.max(...childLines) : 0,
    ].join("\t"),
  );
}
fs.writeFileSync("artifacts/component-dependency-analysis.tsv", rows.join("\n") + "\n");
