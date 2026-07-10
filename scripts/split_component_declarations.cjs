const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const MAX_LINES = 300;
const MAX_DECLARATION_LINES = 275;
const roots = ["frontend", "admin"];
const ignored = new Set(["node_modules", ".next", "dist", "build", "coverage"]);

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) output.push(full);
  }
  return output;
}

function lines(text) {
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
    ts.isEnumDeclaration(node)
  ) {
    return node.name && ts.isIdentifier(node.name) ? [node.name.text] : [];
  }
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.flatMap((declaration) =>
      namesFromBinding(declaration.name),
    );
  }
  return [];
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
}

function localNames(node) {
  const values = new Set();
  function visit(current) {
    if (current !== node) {
      if (
        ts.isFunctionDeclaration(current) ||
        ts.isClassDeclaration(current) ||
        ts.isInterfaceDeclaration(current) ||
        ts.isTypeAliasDeclaration(current) ||
        ts.isEnumDeclaration(current)
      ) {
        if (current.name && ts.isIdentifier(current.name)) values.add(current.name.text);
      }
      if (ts.isVariableDeclaration(current) || ts.isParameter(current)) {
        for (const name of namesFromBinding(current.name)) values.add(name);
      }
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return values;
}

function references(node) {
  const local = localNames(node);
  const values = new Set();
  function visit(current) {
    if (ts.isIdentifier(current)) {
      const parent = current.parent;
      const ignoredIdentifier =
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
      if (!ignoredIdentifier && !local.has(current.text)) values.add(current.text);
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return values;
}

function importExports(sourceFile) {
  const map = new Map();
  const sideEffects = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const source = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (!clause) {
      sideEffects.push(`import ${JSON.stringify(source)};`);
      continue;
    }
    if (clause.name) {
      map.set(clause.name.text, `export { default as ${clause.name.text} } from ${JSON.stringify(source)};`);
    }
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      map.set(bindings.name.text, `export * as ${bindings.name.text} from ${JSON.stringify(source)};`);
    } else if (bindings && ts.isNamedImports(bindings)) {
      for (const specifier of bindings.elements) {
        const imported = specifier.propertyName?.text ?? specifier.name.text;
        const local = specifier.name.text;
        const typeOnly = clause.isTypeOnly || specifier.isTypeOnly;
        map.set(
          local,
          `${typeOnly ? "export type" : "export"} { ${imported}${imported === local ? "" : ` as ${local}`} } from ${JSON.stringify(source)};`,
        );
      }
    }
  }
  return { map, sideEffects };
}

function exportedText(node, source) {
  let text = source.slice(node.getFullStart(), node.end).trim();
  const defaultExport = hasModifier(node, ts.SyntaxKind.DefaultKeyword);
  const namedExport = hasModifier(node, ts.SyntaxKind.ExportKeyword) && !defaultExport;
  if (defaultExport) return text.replace(/^export\s+default\s+/, "export ");
  if (namedExport) return text;
  return `export ${text}`;
}

function split(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  if (lines(source) <= MAX_LINES) return { status: "small" };
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const client = sourceFile.statements.some(
    (node) =>
      ts.isExpressionStatement(node) &&
      ts.isStringLiteral(node.expression) &&
      node.expression.text === "use client",
  );
  const exportAssignments = sourceFile.statements.filter(ts.isExportAssignment);
  const units = sourceFile.statements
    .filter(
      (node) =>
        !ts.isImportDeclaration(node) &&
        !ts.isExportAssignment(node) &&
        !(ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)),
    )
    .map((node) => ({
      node,
      names: declaredNames(node),
      refs: references(node),
      lineCount: lines(source.slice(node.getFullStart(), node.end)),
      originalNamed: hasModifier(node, ts.SyntaxKind.ExportKeyword) && !hasModifier(node, ts.SyntaxKind.DefaultKeyword),
      originalDefault: hasModifier(node, ts.SyntaxKind.DefaultKeyword),
      text: exportedText(node, source),
    }));
  if (
    units.length < 2 ||
    units.some((unit) => !unit.names.length || unit.lineCount > MAX_DECLARATION_LINES)
  ) {
    return { status: "skipped", detail: "contains a declaration above the safe limit" };
  }

  const { map: imported, sideEffects } = importExports(sourceFile);
  const stem = path.basename(filePath, path.extname(filePath));
  const extension = path.extname(filePath);
  const directory = path.dirname(filePath);
  const dependencyName = `${stem}-dependencies`;
  const importedNames = new Set(units.flatMap((unit) => [...unit.refs]));
  const dependencyContent = [
    client ? '"use client";' : "",
    ...sideEffects,
    ...[...imported.entries()]
      .filter(([name]) => importedNames.has(name))
      .map(([, statement]) => statement),
  ]
    .filter(Boolean)
    .join("\n");
  fs.writeFileSync(path.join(directory, `${dependencyName}.ts`), `${dependencyContent}\n`);

  const owners = new Map();
  units.forEach((unit, index) => unit.names.forEach((name) => owners.set(name, index)));
  units.forEach((unit, index) => {
    const partNumber = String(index + 1).padStart(2, "0");
    const linesOut = [];
    if (client) linesOut.push('"use client";', "");
    const dependencyRefs = [...unit.refs].filter((name) => imported.has(name)).sort();
    if (dependencyRefs.length) {
      linesOut.push(`import { ${dependencyRefs.join(", ")} } from "./${dependencyName}";`);
    }
    const cross = new Map();
    for (const ref of unit.refs) {
      const owner = owners.get(ref);
      if (owner !== undefined && owner !== index) {
        if (!cross.has(owner)) cross.set(owner, new Set());
        cross.get(owner).add(ref);
      }
    }
    for (const [owner, names] of [...cross].sort(([a], [b]) => a - b)) {
      linesOut.push(
        `import { ${[...names].sort().join(", ")} } from "./${stem}-component-${String(owner + 1).padStart(2, "0")}";`,
      );
    }
    if (linesOut.length && linesOut.at(-1) !== "") linesOut.push("");
    linesOut.push(unit.text, "");
    const content = linesOut.join("\n");
    if (lines(content) > MAX_LINES) throw new Error(`${filePath} component ${partNumber} exceeds limit`);
    fs.writeFileSync(
      path.join(directory, `${stem}-component-${partNumber}${extension}`),
      content,
    );
  });

  const facade = [];
  if (client) facade.push('"use client";', "");
  facade.push(...sideEffects);
  if (sideEffects.length) facade.push("");
  units.forEach((unit, index) => {
    const specifier = `./${stem}-component-${String(index + 1).padStart(2, "0")}`;
    if (unit.originalDefault) facade.push(`export { ${unit.names[0]} as default } from "${specifier}";`);
    if (unit.originalNamed) facade.push(`export { ${unit.names.join(", ")} } from "${specifier}";`);
  });
  for (const assignment of exportAssignments) {
    if (!ts.isIdentifier(assignment.expression)) return { status: "skipped", detail: "complex default export" };
    const owner = owners.get(assignment.expression.text);
    if (owner === undefined) throw new Error(`default export owner missing in ${filePath}`);
    facade.push(
      `export { ${assignment.expression.text} as default } from "./${stem}-component-${String(owner + 1).padStart(2, "0")}";`,
    );
  }
  fs.writeFileSync(filePath, `${facade.join("\n")}\n`);
  return { status: "split", parts: units.length };
}

const report = ["status\tparts\tpath\tdetail"];
for (const root of roots) {
  for (const filePath of walk(root)) {
    try {
      const result = split(filePath);
      if (result.status !== "small") {
        report.push([result.status, result.parts ?? 0, filePath, result.detail ?? ""].join("\t"));
      }
    } catch (error) {
      report.push(["failed", 0, filePath, error.stack ?? error.message].join("\t"));
    }
  }
}
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/component-declaration-split.tsv", `${report.join("\n")}\n`);
