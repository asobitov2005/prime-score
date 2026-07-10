const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const TARGETS = [
  "frontend/app/(app)/dashboard/page.tsx",
  "admin/app/(dashboard)/dashboard/page.tsx",
  "admin/app/(dashboard)/analytics/page.tsx",
];
const MAX_LINES = 290;

function lineCount(text) {
  return text.split(/\r?\n/).length;
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
    return node.declarationList.declarations.flatMap((item) =>
      bindingNames(item.name),
    );
  }
  return [];
}

function localNames(node) {
  const names = new Set();
  function visit(current) {
    if (current !== node) {
      if (ts.isVariableDeclaration(current) || ts.isParameter(current)) {
        bindingNames(current.name).forEach((name) => names.add(name));
      }
      if (
        (ts.isFunctionDeclaration(current) ||
          ts.isClassDeclaration(current) ||
          ts.isInterfaceDeclaration(current) ||
          ts.isTypeAliasDeclaration(current)) &&
        current.name
      ) {
        names.add(current.name.text);
      }
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return names;
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

function sourceText(source, node) {
  return source.slice(node.getFullStart(), node.end).trim();
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
}

function importRecords(sourceFile) {
  const records = [];
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
      records.push({
        source,
        local: clause.name.text,
        imported: "default",
        typeOnly: clause.isTypeOnly,
        namespace: false,
      });
    }
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      records.push({
        source,
        local: bindings.name.text,
        imported: "*",
        typeOnly: clause.isTypeOnly,
        namespace: true,
      });
    } else if (bindings && ts.isNamedImports(bindings)) {
      for (const specifier of bindings.elements) {
        records.push({
          source,
          local: specifier.name.text,
          imported: specifier.propertyName?.text ?? specifier.name.text,
          typeOnly: clause.isTypeOnly || specifier.isTypeOnly,
          namespace: false,
        });
      }
    }
  }
  return { records, sideEffects };
}

function dependencyExports(imports) {
  return imports.records.map((record) => {
    if (record.imported === "default") {
      return `export { default as ${record.local} } from ${JSON.stringify(record.source)};`;
    }
    if (record.namespace) {
      return `export * as ${record.local} from ${JSON.stringify(record.source)};`;
    }
    return `${record.typeOnly ? "export type" : "export"} { ${record.imported}${record.imported === record.local ? "" : ` as ${record.local}`} } from ${JSON.stringify(record.source)};`;
  });
}

function namedImport(names, source, typeOnly = false) {
  const values = [...new Set(names)].sort();
  if (!values.length) return "";
  return `import${typeOnly ? " type" : ""} { ${values.join(", ")} } from ${JSON.stringify(source)};`;
}

function directChildren(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  if (ts.isJsxElement(current) || ts.isJsxFragment(current)) {
    return current.children.filter(
      (child) => !ts.isJsxText(child) || child.getText().trim(),
    );
  }
  return [];
}

function replaceRanges(text, baseStart, replacements) {
  let output = text;
  for (const replacement of [...replacements].sort((a, b) => b.start - a.start)) {
    output =
      output.slice(0, replacement.start - baseStart) +
      replacement.text +
      output.slice(replacement.end - baseStart);
  }
  return output;
}

function writeSmall(filePath, content) {
  if (lineCount(content) > MAX_LINES) {
    throw new Error(`${filePath} has ${lineCount(content)} lines`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.trimEnd()}\n`);
}

function exportText(source, node) {
  const text = sourceText(source, node).replace(/^export\s+default\s+/, "export ");
  return /^export\s/.test(text) ? text : `export ${text}`;
}

function packShared(units) {
  const parts = [];
  let current = [];
  let lines = 0;
  for (let index = 0; index < units.length; index += 1) {
    const unitLines = units[index].lines + 2;
    if (unitLines > 240) {
      throw new Error(`Shared declaration exceeds limit: ${units[index].names.join(",")}`);
    }
    if (current.length && lines + unitLines > 240) {
      parts.push(current);
      current = [];
      lines = 0;
    }
    current.push(index);
    lines += unitLines;
  }
  if (current.length) parts.push(current);
  return parts;
}

function processPage(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const imports = importRecords(sourceFile);
  const page = sourceFile.statements.find(
    (node) =>
      ts.isFunctionDeclaration(node) &&
      node.body &&
      hasModifier(node, ts.SyntaxKind.DefaultKeyword),
  );
  if (!page || !page.body || !page.name) {
    throw new Error(`Default page function not found: ${filePath}`);
  }
  const pageName = page.name.text;
  const stem = path.basename(filePath, ".tsx");
  const moduleDirName = `${stem}-modules`;
  const moduleDir = path.join(path.dirname(filePath), moduleDirName);
  const relativeDir = `./${moduleDirName}`;

  writeSmall(
    path.join(moduleDir, "dependencies.ts"),
    [...imports.sideEffects, ...dependencyExports(imports)].join("\n"),
  );

  const sharedNodes = sourceFile.statements.filter(
    (node) =>
      node !== page &&
      !ts.isImportDeclaration(node) &&
      !ts.isExportAssignment(node) &&
      !ts.isExportDeclaration(node) &&
      !(ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression)),
  );
  const sharedUnits = sharedNodes.map((node) => ({
    node,
    names: declaredNames(node),
    refs: references(node),
    lines: lineCount(sourceText(source, node)),
    text: exportText(source, node),
  }));
  const sharedNames = new Set(sharedUnits.flatMap((unit) => unit.names));
  const sharedParts = packShared(sharedUnits);
  const owner = new Map();
  sharedParts.forEach((indexes, partIndex) => {
    indexes.forEach((index) =>
      sharedUnits[index].names.forEach((name) => owner.set(name, partIndex)),
    );
  });
  sharedParts.forEach((indexes, partIndex) => {
    const refs = new Set(indexes.flatMap((index) => [...sharedUnits[index].refs]));
    const depRefs = [...refs].filter((name) =>
      imports.records.some((record) => record.local === name),
    );
    const cross = new Map();
    for (const ref of refs) {
      const target = owner.get(ref);
      if (target !== undefined && target !== partIndex) {
        if (!cross.has(target)) cross.set(target, new Set());
        cross.get(target).add(ref);
      }
    }
    const lines = [];
    const depImport = namedImport(depRefs, "./dependencies");
    if (depImport) lines.push(depImport);
    for (const [target, names] of [...cross].sort(([a], [b]) => a - b)) {
      lines.push(
        namedImport(
          [...names],
          `./shared-part-${String(target + 1).padStart(2, "0")}`,
        ),
      );
    }
    lines.push("", ...indexes.map((index) => sharedUnits[index].text));
    writeSmall(
      path.join(
        moduleDir,
        `shared-part-${String(partIndex + 1).padStart(2, "0")}.tsx`,
      ),
      lines.join("\n\n"),
    );
  });
  writeSmall(
    path.join(moduleDir, "shared.ts"),
    sharedParts
      .map(
        (_, index) =>
          `export * from "./shared-part-${String(index + 1).padStart(2, "0")}";`,
      )
      .join("\n") || "export {};",
  );

  const statements = [...page.body.statements];
  const returnIndex = statements.findLastIndex((node) => ts.isReturnStatement(node));
  if (returnIndex < 0 || statements.slice(0, returnIndex).some(ts.isReturnStatement)) {
    throw new Error(`${pageName} must have one final return`);
  }
  const dataStatements = statements.slice(0, returnIndex);
  const returnStatement = statements[returnIndex];
  if (!returnStatement.expression) throw new Error(`${pageName} return is empty`);
  const parameterNames = page.parameters.flatMap((item) => bindingNames(item.name));
  const dataNames = [
    ...new Set([
      ...parameterNames,
      ...dataStatements.flatMap(declaredNames),
    ]),
  ];
  const dataRefs = new Set(dataStatements.flatMap((node) => [...references(node)]));
  const dataDepRefs = [...dataRefs].filter((name) =>
    imports.records.some((record) => record.local === name),
  );
  const dataSharedRefs = [...dataRefs].filter((name) => sharedNames.has(name));
  const parameterText = page.parameters
    .map((item) => source.slice(item.getStart(), item.end))
    .join(", ");
  const callText = parameterNames.join(", ");
  const loaderName = `load${pageName}Data`;
  const loaderLines = [];
  const loaderDepImport = namedImport(dataDepRefs, "./dependencies");
  const loaderSharedImport = namedImport(dataSharedRefs, "./shared");
  if (loaderDepImport) loaderLines.push(loaderDepImport);
  if (loaderSharedImport) loaderLines.push(loaderSharedImport);
  loaderLines.push(
    "",
    `export async function ${loaderName}(${parameterText}) {`,
    ...dataStatements.flatMap((node) =>
      sourceText(source, node)
        .split("\n")
        .map((line) => `  ${line}`),
    ),
    `  return { ${dataNames.join(", ")} };`,
    "}",
    "",
    `export type ${pageName}Data = Awaited<ReturnType<typeof ${loaderName}>>;`,
  );
  writeSmall(path.join(moduleDir, "loader.ts"), loaderLines.join("\n"));

  const viewScopeNames = new Set(dataNames);
  const viewFiles = [];
  let sectionCounter = 0;
  function createSection(node) {
    sectionCounter += 1;
    const sectionName = `${pageName}Section${sectionCounter}`;
    const children = directChildren(node);
    let nodeText = source.slice(node.getStart(), node.end);
    const replacements = [];
    if (lineCount(nodeText) > 175 && children.length > 0) {
      for (const child of children) {
        const childText = source.slice(child.getStart(), child.end);
        if (lineCount(childText) < 14 && lineCount(nodeText) < 250) continue;
        const childName = createSection(child);
        replacements.push({
          start: child.getStart(),
          end: child.end,
          text: `<${childName} scope={scope} />`,
        });
      }
      nodeText = replaceRanges(nodeText, node.getStart(), replacements);
    }
    if (lineCount(nodeText) > 270) {
      throw new Error(`${sectionName} remains ${lineCount(nodeText)} lines`);
    }
    const refs = references(node);
    const scopeRefs = [...refs].filter((name) => viewScopeNames.has(name));
    const depRefs = [...refs].filter((name) =>
      imports.records.some((record) => record.local === name),
    );
    const sharedRefs = [...refs].filter((name) => sharedNames.has(name));
    const nestedNames = replacements
      .map((item) => item.text.match(/^<([A-Za-z0-9_]+)/)?.[1])
      .filter(Boolean);
    const lines = [`import type { ${pageName}Data } from "./loader";`];
    const depImport = namedImport(depRefs, "./dependencies");
    const sharedImport = namedImport(sharedRefs, "./shared");
    if (depImport) lines.push(depImport);
    if (sharedImport) lines.push(sharedImport);
    for (const nestedName of nestedNames) {
      const nested = viewFiles.find((file) => file.name === nestedName);
      if (nested) lines.push(`import { ${nestedName} } from "./${nested.fileStem}";`);
    }
    lines.push(
      "",
      `export function ${sectionName}({ scope }: { scope: ${pageName}Data }) {`,
    );
    if (scopeRefs.length) lines.push(`  const { ${scopeRefs.join(", ")} } = scope;`);
    lines.push(
      "  return (",
      ...nodeText.split("\n").map((line) => `    ${line}`),
      "  );",
      "}",
    );
    const fileStem = `view-section-${String(sectionCounter).padStart(2, "0")}`;
    viewFiles.push({ name: sectionName, fileStem, content: lines.join("\n") });
    return sectionName;
  }
  const rootName = createSection(returnStatement.expression);
  for (const file of viewFiles) {
    writeSmall(path.join(moduleDir, `${file.fileStem}.tsx`), file.content);
  }
  const rootFile = viewFiles.find((file) => file.name === rootName);
  writeSmall(
    path.join(moduleDir, "view.tsx"),
    `import type { ${pageName}Data } from "./loader";\nimport { ${rootName} } from "./${rootFile.fileStem}";\n\nexport function ${pageName}View({ scope }: { scope: ${pageName}Data }) {\n  return <${rootName} scope={scope} />;\n}`,
  );

  const publicShared = sharedNodes
    .filter((node) => hasModifier(node, ts.SyntaxKind.ExportKeyword))
    .flatMap(declaredNames);
  const facade = [
    `import { ${loaderName} } from "${relativeDir}/loader";`,
    `import { ${pageName}View } from "${relativeDir}/view";`,
    "",
    `export default async function ${pageName}(${parameterText}) {`,
    `  const scope = await ${loaderName}(${callText});`,
    `  return <${pageName}View scope={scope} />;`,
    "}",
  ];
  if (publicShared.length) {
    facade.push(
      "",
      `export { ${publicShared.join(", ")} } from "${relativeDir}/shared";`,
    );
  }
  for (const statement of sourceFile.statements.filter(ts.isExportDeclaration)) {
    facade.push("", sourceText(source, statement));
  }
  writeSmall(filePath, facade.join("\n"));
  return { sharedParts: sharedParts.length, viewSections: viewFiles.length };
}

const report = ["status\tshared_parts\tview_sections\tpath\tdetail"];
for (const target of TARGETS) {
  try {
    const result = processPage(target);
    report.push(`split\t${result.sharedParts}\t${result.viewSections}\t${target}\t`);
  } catch (error) {
    report.push(`failed\t0\t0\t${target}\t${error.stack ?? error.message}`);
  }
}
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync("artifacts/server-page-refactor-report.tsv", `${report.join("\n")}\n`);
