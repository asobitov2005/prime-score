const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const MAX_FILE_LINES = 300;
const MAX_HOOK_LINES = 235;
const MAX_VIEW_LINES = 235;
const MAX_SHARED_LINES = 235;

const inventory = fs
  .readFileSync("artifacts/remaining-ui-files.tsv", "utf8")
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => line.split("\t")[1]);

function countLines(text) {
  return text.split(/\r?\n/).length;
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
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

function declarationNames(node) {
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

function componentCandidate(node) {
  if (ts.isFunctionDeclaration(node) && node.body && node.name) {
    return {
      statement: node,
      functionNode: node,
      name: node.name.text,
      body: node.body,
      parameters: node.parameters,
      async: hasModifier(node, ts.SyntaxKind.AsyncKeyword),
      defaultExport: hasModifier(node, ts.SyntaxKind.DefaultKeyword),
      namedExport: hasModifier(node, ts.SyntaxKind.ExportKeyword),
    };
  }
  if (ts.isVariableStatement(node) && node.declarationList.declarations.length === 1) {
    const declaration = node.declarationList.declarations[0];
    const initializer = declaration.initializer;
    if (
      ts.isIdentifier(declaration.name) &&
      initializer &&
      (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) &&
      ts.isBlock(initializer.body)
    ) {
      return {
        statement: node,
        functionNode: initializer,
        name: declaration.name.text,
        body: initializer.body,
        parameters: initializer.parameters,
        async: Boolean(initializer.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)),
        defaultExport: false,
        namedExport: hasModifier(node, ts.SyntaxKind.ExportKeyword),
      };
    }
  }
  return null;
}

function isClientFile(sourceFile) {
  return sourceFile.statements.some(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression) &&
      statement.expression.text === "use client",
  );
}

function isDirective(node) {
  return ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression);
}

function isJsxExpression(node) {
  if (!node) return false;
  if (
    ts.isJsxElement(node) ||
    ts.isJsxSelfClosingElement(node) ||
    ts.isJsxFragment(node)
  ) {
    return true;
  }
  return ts.isParenthesizedExpression(node)
    ? isJsxExpression(node.expression)
    : false;
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

function renderImports(names, records) {
  const groups = new Map();
  for (const record of records) {
    if (!names.has(record.local)) continue;
    if (!groups.has(record.source)) groups.set(record.source, []);
    groups.get(record.source).push(record);
  }
  const lines = [];
  for (const [source, items] of groups) {
    const defaultItem = items.find((item) => item.imported === "default");
    const namespaceItem = items.find((item) => item.namespace);
    const named = items.filter(
      (item) => item.imported !== "default" && !item.namespace,
    );
    if (namespaceItem) {
      lines.push(
        `import${namespaceItem.typeOnly ? " type" : ""} * as ${namespaceItem.local} from ${JSON.stringify(source)};`,
      );
      if (defaultItem) {
        lines.push(
          `import${defaultItem.typeOnly ? " type" : ""} ${defaultItem.local} from ${JSON.stringify(source)};`,
        );
      }
    } else {
      const valueNamed = named.filter((item) => !item.typeOnly);
      const typeNamed = named.filter((item) => item.typeOnly);
      if (defaultItem || valueNamed.length) {
        const chunks = [];
        if (defaultItem) chunks.push(defaultItem.local);
        if (valueNamed.length) {
          chunks.push(
            `{ ${valueNamed
              .map((item) =>
                item.imported === item.local
                  ? item.local
                  : `${item.imported} as ${item.local}`,
              )
              .join(", ")} }`,
          );
        }
        lines.push(`import ${chunks.join(", ")} from ${JSON.stringify(source)};`);
      }
      if (typeNamed.length) {
        lines.push(
          `import type { ${typeNamed
            .map((item) =>
              item.imported === item.local
                ? item.local
                : `${item.imported} as ${item.local}`,
            )
            .join(", ")} } from ${JSON.stringify(source)};`,
        );
      }
    }
  }
  return lines;
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
      if (ts.isVariableDeclaration(current) || ts.isParameter(current)) {
        for (const name of bindingNames(current.name)) names.add(name);
      }
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return names;
}

function references(node) {
  const locals = localDeclarations(node);
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

function statementDeclaredNames(statement) {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((item) =>
      bindingNames(item.name),
    );
  }
  if (ts.isFunctionDeclaration(statement) && statement.name) {
    return [statement.name.text];
  }
  if (ts.isClassDeclaration(statement) && statement.name) {
    return [statement.name.text];
  }
  return [];
}

function exportDeclarationText(node, source) {
  let text = source.slice(node.getFullStart(), node.end).trim();
  if (hasModifier(node, ts.SyntaxKind.ExportKeyword)) return text;
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isVariableStatement(node)
  ) {
    return `export ${text}`;
  }
  return text;
}

function publicNames(node) {
  if (!hasModifier(node, ts.SyntaxKind.ExportKeyword)) return [];
  return declarationNames(node);
}

function parameterPlan(candidate, source) {
  if (candidate.parameters.length === 0) {
    return {
      wrapperParameter: "",
      hookParameter: "",
      hookPreamble: "",
      hookCall: "",
      scopeParameterNames: [],
      parameterRefs: new Set(),
    };
  }
  if (candidate.parameters.length !== 1) return null;
  const parameter = candidate.parameters[0];
  const parameterText = source.slice(parameter.getStart(), parameter.end);
  const parameterRefs = references(parameter);
  if (ts.isIdentifier(parameter.name)) {
    return {
      wrapperParameter: parameterText,
      hookParameter: parameterText,
      hookPreamble: "",
      hookCall: parameter.name.text,
      scopeParameterNames: [parameter.name.text],
      parameterRefs,
    };
  }
  if (!parameter.type) return null;
  const typeText = source.slice(parameter.type.getStart(), parameter.type.end);
  const bindingText = source.slice(parameter.name.getStart(), parameter.name.end);
  const names = bindingNames(parameter.name);
  return {
    wrapperParameter: `props: ${typeText}`,
    hookParameter: `props: ${typeText}`,
    hookPreamble: `  const ${bindingText} = props;\n`,
    hookCall: "props",
    scopeParameterNames: names,
    parameterRefs,
  };
}

function processFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  if (!isClientFile(sourceFile)) return { status: "skipped", detail: "not a client module" };
  const candidates = sourceFile.statements
    .map(componentCandidate)
    .filter(Boolean)
    .sort(
      (a, b) =>
        countLines(source.slice(b.statement.getFullStart(), b.statement.end)) -
        countLines(source.slice(a.statement.getFullStart(), a.statement.end)),
    );
  const candidate = candidates[0];
  if (!candidate || candidate.async) return { status: "skipped", detail: "no synchronous component" };
  const statements = [...candidate.body.statements];
  const finalStatement = statements.at(-1);
  if (
    !finalStatement ||
    !ts.isReturnStatement(finalStatement) ||
    !isJsxExpression(finalStatement.expression)
  ) {
    return { status: "skipped", detail: "final statement is not JSX return" };
  }
  if (statements.slice(0, -1).some(ts.isReturnStatement)) {
    return { status: "skipped", detail: "contains early top-level return" };
  }
  const preStatements = statements.slice(0, -1);
  const preText = preStatements
    .map((statement) => source.slice(statement.getFullStart(), statement.end).trim())
    .join("\n\n");
  const viewExpression = source.slice(
    finalStatement.expression.getStart(),
    finalStatement.expression.end,
  );
  if (countLines(preText) > MAX_HOOK_LINES) {
    return { status: "skipped", detail: `controller is ${countLines(preText)} lines` };
  }
  if (countLines(viewExpression) > MAX_VIEW_LINES) {
    return { status: "skipped", detail: `view is ${countLines(viewExpression)} lines` };
  }
  const parameters = parameterPlan(candidate, source);
  if (!parameters) return { status: "skipped", detail: "unsupported parameters" };

  const imports = importRecords(sourceFile);
  const otherNodes = sourceFile.statements.filter(
    (node) =>
      node !== candidate.statement &&
      !ts.isImportDeclaration(node) &&
      !ts.isExportAssignment(node) &&
      !isDirective(node),
  );
  const sharedNames = new Set(otherNodes.flatMap(declarationNames));
  const sharedRefs = new Set(otherNodes.flatMap((node) => [...references(node)]));
  const sharedImportLines = renderImports(sharedRefs, imports.records);
  const sharedBody = otherNodes.map((node) => exportDeclarationText(node, source)).join("\n\n");
  const sharedContent = [
    '"use client";',
    "",
    ...imports.sideEffects,
    ...sharedImportLines,
    sharedImportLines.length || imports.sideEffects.length ? "" : "",
    sharedBody,
    "",
  ]
    .filter((line, index, array) => !(line === "" && array[index - 1] === ""))
    .join("\n");
  if (countLines(sharedContent) > MAX_SHARED_LINES) {
    return { status: "skipped", detail: `shared module is ${countLines(sharedContent)} lines` };
  }

  const scopeNames = [
    ...parameters.scopeParameterNames,
    ...preStatements.flatMap(statementDeclaredNames),
  ].filter((name, index, array) => name && array.indexOf(name) === index);
  const hookRefs = new Set([
    ...parameters.parameterRefs,
    ...preStatements.flatMap((statement) => [...references(statement)]),
  ]);
  const hookShared = [...hookRefs].filter((name) => sharedNames.has(name));
  const hookImported = new Set(
    [...hookRefs].filter((name) => imports.records.some((record) => record.local === name)),
  );
  const stem = path.basename(filePath, path.extname(filePath));
  const directory = path.dirname(filePath);
  const scopeName = `${candidate.name}Scope`;
  const hookName = `use${candidate.name}Scope`;
  const hookLines = [
    '"use client";',
    "",
    ...renderImports(hookImported, imports.records),
    hookShared.length
      ? `import { ${hookShared.sort().join(", ")} } from "./${stem}-shared";`
      : "",
    "",
    `export function ${hookName}(${parameters.hookParameter}) {`,
    parameters.hookPreamble.trimEnd(),
    preText
      .split("\n")
      .map((line) => (line ? `  ${line}` : ""))
      .join("\n"),
    `  return { ${scopeNames.join(", ")} };`,
    "}",
    "",
    `export type ${scopeName} = ReturnType<typeof ${hookName}>;`,
    "",
  ].filter((line, index, array) => !(line === "" && array[index - 1] === ""));
  const hookContent = hookLines.join("\n");
  if (countLines(hookContent) > MAX_FILE_LINES) {
    return { status: "skipped", detail: `hook generated ${countLines(hookContent)} lines` };
  }

  const viewRefs = references(finalStatement.expression);
  const viewScope = scopeNames.filter((name) => viewRefs.has(name));
  const viewShared = [...viewRefs].filter((name) => sharedNames.has(name));
  const viewImported = new Set(
    [...viewRefs].filter((name) => imports.records.some((record) => record.local === name)),
  );
  const viewLines = [
    '"use client";',
    "",
    ...renderImports(viewImported, imports.records),
    viewShared.length
      ? `import { ${viewShared.sort().join(", ")} } from "./${stem}-shared";`
      : "",
    `import type { ${scopeName} } from "./${stem}-scope";`,
    "",
    `export function ${candidate.name}View({ scope }: { scope: ${scopeName} }) {`,
    viewScope.length ? `  const { ${viewScope.join(", ")} } = scope;` : "",
    "  return (",
    viewExpression
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n"),
    "  );",
    "}",
    "",
  ].filter((line, index, array) => !(line === "" && array[index - 1] === ""));
  const viewContent = viewLines.join("\n");
  if (countLines(viewContent) > MAX_FILE_LINES) {
    return { status: "skipped", detail: `view generated ${countLines(viewContent)} lines` };
  }

  const parameterRefs = parameters.parameterRefs;
  const wrapperShared = [...parameterRefs].filter((name) => sharedNames.has(name));
  const wrapperImported = new Set(
    [...parameterRefs].filter((name) => imports.records.some((record) => record.local === name)),
  );
  const facade = [
    '"use client";',
    "",
    ...renderImports(wrapperImported, imports.records),
    wrapperShared.length
      ? `import type { ${wrapperShared.sort().join(", ")} } from "./${stem}-shared";`
      : "",
    `import { ${candidate.name}View } from "./${stem}-view";`,
    `import { ${hookName} } from "./${stem}-scope";`,
    "",
    `export function ${candidate.name}(${parameters.wrapperParameter}) {`,
    `  const scope = ${hookName}(${parameters.hookCall});`,
    `  return <${candidate.name}View scope={scope} />;`,
    "}",
  ];
  const defaultAssignment = sourceFile.statements.find(
    (node) =>
      ts.isExportAssignment(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === candidate.name,
  );
  if (candidate.defaultExport || defaultAssignment) {
    facade.push("", `export default ${candidate.name};`);
  }
  const publicShared = otherNodes.flatMap(publicNames);
  if (publicShared.length) {
    facade.push("", `export { ${publicShared.join(", ")} } from "./${stem}-shared";`);
  }
  facade.push("");

  fs.writeFileSync(path.join(directory, `${stem}-shared.tsx`), sharedContent);
  fs.writeFileSync(path.join(directory, `${stem}-scope.tsx`), hookContent);
  fs.writeFileSync(path.join(directory, `${stem}-view.tsx`), viewContent);
  fs.writeFileSync(filePath, facade.filter((line, index, array) => !(line === "" && array[index - 1] === "")).join("\n"));
  return { status: "split", detail: `${candidate.name}: hook ${countLines(hookContent)}, view ${countLines(viewContent)}` };
}

const report = ["status\tpath\tdetail"];
for (const filePath of inventory) {
  try {
    const result = processFile(filePath);
    report.push([result.status, filePath, result.detail ?? ""].join("\t"));
  } catch (error) {
    report.push(["failed", filePath, error.stack ?? error.message].join("\t"));
  }
}
fs.writeFileSync("artifacts/medium-component-split.tsv", report.join("\n") + "\n");
