const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const MAX_SOURCE_LINES = 300;
const MAX_BODY_LINES = 220;
const ROOTS = ["frontend", "admin"];
const IGNORED = new Set(["node_modules", ".next", "dist", "build", "coverage"]);

function walk(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

function namesFromBinding(name, output = []) {
  if (ts.isIdentifier(name)) output.push(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) namesFromBinding(element.name, output);
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
    ts.isEnumDeclaration(node) ||
    ts.isModuleDeclaration(node)
  ) {
    return node.name && ts.isIdentifier(node.name) ? [node.name.text] : [];
  }
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.flatMap((item) =>
      namesFromBinding(item.name),
    );
  }
  return [];
}

function isDirective(node) {
  return (
    ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)
  );
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
}

function isDefaultExport(node) {
  return hasModifier(node, ts.SyntaxKind.DefaultKeyword);
}

function isNamedExport(node) {
  return hasModifier(node, ts.SyntaxKind.ExportKeyword) && !isDefaultExport(node);
}

function localDeclarations(node) {
  const names = new Set();
  function visit(current) {
    if (current !== node) {
      if (
        ts.isFunctionDeclaration(current) ||
        ts.isClassDeclaration(current) ||
        ts.isInterfaceDeclaration(current) ||
        ts.isTypeAliasDeclaration(current) ||
        ts.isEnumDeclaration(current)
      ) {
        if (current.name && ts.isIdentifier(current.name)) names.add(current.name.text);
      }
      if (ts.isVariableDeclaration(current)) {
        for (const name of namesFromBinding(current.name)) names.add(name);
      }
      if (ts.isParameter(current)) {
        for (const name of namesFromBinding(current.name)) names.add(name);
      }
      if (ts.isImportDeclaration(current)) return;
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return names;
}

function referencedNames(node) {
  const locals = localDeclarations(node);
  const refs = new Set();
  function visit(current) {
    if (ts.isIdentifier(current)) {
      const parent = current.parent;
      const isPropertyName =
        (ts.isPropertyAccessExpression(parent) && parent.name === current) ||
        (ts.isPropertyAssignment(parent) && parent.name === current && !parent.questionToken) ||
        (ts.isMethodDeclaration(parent) && parent.name === current) ||
        (ts.isPropertyDeclaration(parent) && parent.name === current) ||
        (ts.isJsxAttribute(parent) && parent.name === current) ||
        (ts.isImportSpecifier(parent) && parent.propertyName === current) ||
        (ts.isExportSpecifier(parent) && parent.propertyName === current) ||
        (ts.isBindingElement(parent) && parent.propertyName === current) ||
        (ts.isLabeledStatement(parent) && parent.label === current);
      const isDeclaration =
        (ts.isFunctionDeclaration(parent) && parent.name === current) ||
        (ts.isClassDeclaration(parent) && parent.name === current) ||
        (ts.isInterfaceDeclaration(parent) && parent.name === current) ||
        (ts.isTypeAliasDeclaration(parent) && parent.name === current) ||
        (ts.isEnumDeclaration(parent) && parent.name === current) ||
        (ts.isVariableDeclaration(parent) && parent.name === current) ||
        (ts.isParameter(parent) && parent.name === current);
      if (!isPropertyName && !isDeclaration && !locals.has(current.text)) {
        refs.add(current.text);
      }
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return refs;
}

function importBindings(node) {
  const result = [];
  if (!ts.isImportDeclaration(node) || !node.importClause) return result;
  const source = node.moduleSpecifier.text;
  const clause = node.importClause;
  if (clause.name) {
    result.push({
      local: clause.name.text,
      statement: `export { default as ${clause.name.text} } from ${JSON.stringify(source)};`,
    });
  }
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings)) {
    result.push({
      local: bindings.name.text,
      statement: `export * as ${bindings.name.text} from ${JSON.stringify(source)};`,
    });
  } else if (bindings && ts.isNamedImports(bindings)) {
    for (const specifier of bindings.elements) {
      const imported = specifier.propertyName?.text ?? specifier.name.text;
      const local = specifier.name.text;
      const typeOnly = clause.isTypeOnly || specifier.isTypeOnly;
      result.push({
        local,
        statement: `${typeOnly ? "export type" : "export"} { ${imported}${imported === local ? "" : ` as ${local}`} } from ${JSON.stringify(source)};`,
      });
    }
  }
  return result;
}

function exportableText(node, sourceFile, originalText) {
  let text = originalText.slice(node.getFullStart(), node.end).trim();
  if (isDefaultExport(node)) {
    text = text.replace(/^export\s+default\s+/, "export ");
    return text;
  }
  if (isNamedExport(node)) return text;
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isModuleDeclaration(node) ||
    ts.isVariableStatement(node)
  ) {
    return `export ${text}`;
  }
  return text;
}

function stronglyConnected(graph) {
  let nextIndex = 0;
  const stack = [];
  const indexes = Array(graph.length).fill(-1);
  const low = Array(graph.length).fill(0);
  const active = Array(graph.length).fill(false);
  const output = [];
  function visit(vertex) {
    indexes[vertex] = low[vertex] = nextIndex++;
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
      output.push(group);
    }
  }
  graph.forEach((_, index) => {
    if (indexes[index] === -1) visit(index);
  });
  return output;
}

function pack(units, groups) {
  const ordered = groups
    .map((group) => [...group].sort((a, b) => a - b))
    .sort((a, b) => a[0] - b[0]);
  const parts = [];
  let current = [];
  let lines = 0;
  for (const group of ordered) {
    const groupLines = group.reduce((sum, index) => sum + units[index].lines + 2, 0);
    if (groupLines > MAX_BODY_LINES) {
      throw new Error(
        `dependency component exceeds ${MAX_BODY_LINES} lines: ${group
          .flatMap((index) => units[index].names)
          .join(",")}`,
      );
    }
    if (current.length && lines + groupLines > MAX_BODY_LINES) {
      parts.push(current.sort((a, b) => a - b));
      current = [];
      lines = 0;
    }
    current.push(...group);
    lines += groupLines;
  }
  if (current.length) parts.push(current.sort((a, b) => a - b));
  return parts;
}

function splitFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  if (lineCount(original) <= MAX_SOURCE_LINES) return { status: "small" };
  const sourceFile = ts.createSourceFile(
    filePath,
    original,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const clientDirective = sourceFile.statements.some(
    (node) => isDirective(node) && node.expression.text === "use client",
  );
  const imports = sourceFile.statements.filter(ts.isImportDeclaration);
  const sideEffects = imports
    .filter((node) => !node.importClause)
    .map((node) => original.slice(node.getFullStart(), node.end).trim());
  const importMap = new Map();
  for (const node of imports) {
    for (const binding of importBindings(node)) importMap.set(binding.local, binding.statement);
  }
  const exportAssignments = sourceFile.statements.filter(ts.isExportAssignment);
  const unsupported = sourceFile.statements.filter(
    (node) =>
      !ts.isImportDeclaration(node) &&
      !ts.isExportAssignment(node) &&
      !isDirective(node) &&
      declaredNames(node).length === 0,
  );
  if (unsupported.length) {
    return { status: "skipped", detail: `unsupported top-level ${ts.SyntaxKind[unsupported[0].kind]}` };
  }
  const units = sourceFile.statements
    .filter(
      (node) =>
        !ts.isImportDeclaration(node) &&
        !ts.isExportAssignment(node) &&
        !isDirective(node),
    )
    .map((node) => ({
      node,
      names: declaredNames(node),
      refs: referencedNames(node),
      lines: lineCount(original.slice(node.getFullStart(), node.end)),
      text: exportableText(node, sourceFile, original),
      originalNamedExport: isNamedExport(node),
      originalDefaultExport: isDefaultExport(node),
    }));
  if (!units.length) return { status: "skipped", detail: "no declarations" };
  const owners = new Map();
  units.forEach((unit, index) => {
    for (const name of unit.names) owners.set(name, index);
  });
  const graph = units.map(() => new Set());
  units.forEach((unit, index) => {
    for (const ref of unit.refs) {
      const owner = owners.get(ref);
      if (owner !== undefined && owner !== index) graph[index].add(owner);
    }
  });
  let parts;
  try {
    parts = pack(units, stronglyConnected(graph));
  } catch (error) {
    return { status: "skipped", detail: error.message };
  }
  if (parts.length < 2) return { status: "skipped", detail: "single part" };

  const extension = path.extname(filePath);
  const stem = path.basename(filePath, extension);
  const directory = path.dirname(filePath);
  const dependencyName = `${stem}-dependencies`;
  const dependencyLines = [clientDirective ? '"use client";' : "", ...sideEffects];
  const usedImports = new Set(units.flatMap((unit) => [...unit.refs]));
  for (const [local, statement] of importMap) {
    if (usedImports.has(local)) dependencyLines.push(statement);
  }
  fs.writeFileSync(
    path.join(directory, `${dependencyName}.ts`),
    dependencyLines.filter(Boolean).join("\n") + "\n",
  );

  const partOf = new Map();
  parts.forEach((indexes, partIndex) => {
    for (const index of indexes) {
      for (const name of units[index].names) partOf.set(name, partIndex);
    }
  });
  parts.forEach((indexes, partIndex) => {
    const refs = new Set(indexes.flatMap((index) => [...units[index].refs]));
    const dependencyImports = [...refs].filter((name) => importMap.has(name)).sort();
    const cross = new Map();
    for (const ref of refs) {
      const owner = partOf.get(ref);
      if (owner !== undefined && owner !== partIndex) {
        if (!cross.has(owner)) cross.set(owner, new Set());
        cross.get(owner).add(ref);
      }
    }
    const lines = [];
    if (clientDirective) lines.push('"use client";', "");
    if (dependencyImports.length) {
      lines.push(`import { ${dependencyImports.join(", ")} } from "./${dependencyName}";`);
    }
    for (const [owner, names] of [...cross].sort(([a], [b]) => a - b)) {
      lines.push(
        `import { ${[...names].sort().join(", ")} } from "./${stem}-part-${String(owner + 1).padStart(2, "0")}";`,
      );
    }
    if (lines.length && lines.at(-1) !== "") lines.push("");
    for (const index of indexes) lines.push(units[index].text, "");
    const content = lines.join("\n").trimEnd() + "\n";
    if (lineCount(content) > MAX_SOURCE_LINES) {
      throw new Error(`${filePath} generated part ${partIndex + 1} has ${lineCount(content)} lines`);
    }
    fs.writeFileSync(
      path.join(directory, `${stem}-part-${String(partIndex + 1).padStart(2, "0")}${extension}`),
      content,
    );
  });

  const facade = [];
  if (clientDirective) facade.push('"use client";', "");
  for (const statement of sideEffects) facade.push(statement);
  if (sideEffects.length) facade.push("");
  units.forEach((unit) => {
    const partIndex = partOf.get(unit.names[0]);
    const specifier = `./${stem}-part-${String(partIndex + 1).padStart(2, "0")}`;
    if (unit.originalDefaultExport) {
      if (!unit.names[0]) throw new Error(`${filePath} has anonymous default export`);
      facade.push(`export { ${unit.names[0]} as default } from "${specifier}";`);
    }
    if (unit.originalNamedExport && unit.names.length) {
      facade.push(`export { ${unit.names.join(", ")} } from "${specifier}";`);
    }
  });
  for (const assignment of exportAssignments) {
    if (ts.isIdentifier(assignment.expression)) {
      const name = assignment.expression.text;
      const owner = partOf.get(name);
      if (owner === undefined) throw new Error(`${filePath} default export owner not found: ${name}`);
      facade.push(
        `export { ${name} as default } from "./${stem}-part-${String(owner + 1).padStart(2, "0")}";`,
      );
    } else {
      return { status: "skipped", detail: "complex export assignment" };
    }
  }
  fs.writeFileSync(filePath, facade.join("\n") + "\n");
  return { status: "split", parts: parts.length };
}

const report = ["status\tparts\tpath\tdetail"];
for (const root of ROOTS) {
  for (const filePath of walk(root)) {
    try {
      const result = splitFile(filePath);
      if (result.status !== "small") {
        report.push(
          [result.status, result.parts ?? 0, filePath, result.detail ?? ""].join("\t"),
        );
      }
    } catch (error) {
      report.push(["failed", 0, filePath, error.stack ?? error.message].join("\t"));
    }
  }
}
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/typescript-split-report.tsv", report.join("\n") + "\n");
