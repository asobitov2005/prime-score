const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const MAX_BODY_LINES = 220;
const MAX_FILE_LINES = 290;
const TARGETS = [
  "admin/app/(dashboard)/promo-codes/page.tsx",
  "frontend/app/(app)/analytics/[skill]/skill-analytics-client.tsx",
  "frontend/components/subscription/subscription-workspace.tsx",
  "frontend/components/layout/site-shell.tsx",
  "frontend/app/exam-preview/writing/writing-exam-client.tsx",
  "admin/components/ai-settings-dashboard.tsx",
  "admin/app/(dashboard)/speaking/page.tsx",
  "frontend/components/attempt-workspaces.tsx",
  "frontend/components/marketing/pricing-plan-grid.tsx",
  "frontend/app/(app)/speaking/topics/speaking-topic-picker-client.tsx",
  "frontend/app/(app)/speaking/microphone-check/microphone-check-client.tsx",
  "admin/app/(dashboard)/users/[id]/page.tsx",
  "admin/app/(dashboard)/writing/page.tsx",
  "admin/components/writing-task-form.tsx",
  "admin/components/payments-manager.tsx",
  "admin/components/plans/plan-manager.tsx",
  "admin/app/(dashboard)/users/page.tsx",
  "admin/app/(dashboard)/settings/page.tsx",
  "frontend/app/(app)/dashboard/streak-heatmap.tsx",
  "frontend/components/exam/listening-transcript-panel.tsx",
  "frontend/app/(app)/settings/page.tsx",
  "admin/app/(dashboard)/reviews/page.tsx",
  "frontend/components/layout/app-shell.tsx",
  "frontend/components/marketing/login-page-client.tsx",
  "admin/app/(dashboard)/writing/[taskId]/page.tsx",
  "admin/app/(dashboard)/writing/submissions/[submissionId]/page.tsx",
];

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

function statementNames(node) {
  return declaredNames(node);
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
}

function isDirective(node) {
  return ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression);
}

function isClient(sourceFile) {
  return sourceFile.statements.some(
    (node) => isDirective(node) && node.expression.text === "use client",
  );
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
          ts.isTypeAliasDeclaration(current) ||
          ts.isEnumDeclaration(current)) &&
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
        (ts.isTypeAliasDeclaration(parent) && parent.name === current) ||
        (ts.isEnumDeclaration(parent) && parent.name === current) ||
        (ts.isImportSpecifier(parent) && parent.name === current);
      if (!ignored && !locals.has(current.text)) refs.add(current.text);
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return refs;
}

function functionInfo(statement) {
  if (ts.isFunctionDeclaration(statement) && statement.body && statement.name) {
    return {
      statement,
      name: statement.name.text,
      body: statement.body,
      parameters: statement.parameters,
      defaultExport: hasModifier(statement, ts.SyntaxKind.DefaultKeyword),
      namedExport: hasModifier(statement, ts.SyntaxKind.ExportKeyword),
      async: hasModifier(statement, ts.SyntaxKind.AsyncKeyword),
    };
  }
  if (
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.length === 1
  ) {
    const declaration = statement.declarationList.declarations[0];
    const initializer = declaration.initializer;
    if (
      ts.isIdentifier(declaration.name) &&
      initializer &&
      (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) &&
      ts.isBlock(initializer.body)
    ) {
      return {
        statement,
        name: declaration.name.text,
        body: initializer.body,
        parameters: initializer.parameters,
        defaultExport: false,
        namedExport: hasModifier(statement, ts.SyntaxKind.ExportKeyword),
        async: Boolean(initializer.modifiers?.some((item) => item.kind === ts.SyntaxKind.AsyncKeyword)),
      };
    }
  }
  return null;
}

function sourceText(source, node) {
  return source.slice(node.getFullStart(), node.end).trim();
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
      records.push({ source, local: clause.name.text, imported: "default", typeOnly: clause.isTypeOnly, namespace: false });
    }
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      records.push({ source, local: bindings.name.text, imported: "*", typeOnly: clause.isTypeOnly, namespace: true });
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
  const lines = [];
  for (const record of imports.records) {
    if (record.imported === "default") {
      lines.push(`export { default as ${record.local} } from ${JSON.stringify(record.source)};`);
    } else if (record.namespace) {
      lines.push(`export * as ${record.local} from ${JSON.stringify(record.source)};`);
    } else {
      lines.push(
        `${record.typeOnly ? "export type" : "export"} { ${record.imported}${record.imported === record.local ? "" : ` as ${record.local}`} } from ${JSON.stringify(record.source)};`,
      );
    }
  }
  return lines;
}

function renderNamedImport(names, modulePath, typeOnly = false) {
  const values = [...new Set(names)].sort();
  if (!values.length) return "";
  return `import${typeOnly ? " type" : ""} { ${values.join(", ")} } from ${JSON.stringify(modulePath)};`;
}

function makeExported(text) {
  if (/^export\s/.test(text)) return text;
  return `export ${text}`;
}

function stronglyConnected(graph) {
  let next = 0;
  const indexes = Array(graph.length).fill(-1);
  const low = Array(graph.length).fill(0);
  const stack = [];
  const active = Array(graph.length).fill(false);
  const result = [];
  function visit(vertex) {
    indexes[vertex] = low[vertex] = next++;
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
      result.push(group.sort((a, b) => a - b));
    }
  }
  graph.forEach((_, vertex) => {
    if (indexes[vertex] === -1) visit(vertex);
  });
  return result;
}

function dependencyGroups(units) {
  const owners = new Map();
  units.forEach((unit, index) => unit.names.forEach((name) => owners.set(name, index)));
  const graph = units.map(() => new Set());
  units.forEach((unit, index) => {
    for (const ref of unit.refs) {
      const owner = owners.get(ref);
      if (owner !== undefined && owner !== index) graph[index].add(owner);
    }
  });
  return stronglyConnected(graph);
}

function packGroups(units, groups, maxLines = MAX_BODY_LINES) {
  const ordered = groups.sort((a, b) => a[0] - b[0]);
  const parts = [];
  let current = [];
  let count = 0;
  for (const group of ordered) {
    const groupLines = group.reduce((sum, index) => sum + units[index].lines + 2, 0);
    if (groupLines > maxLines) {
      throw new Error(`dependency group exceeds limit: ${group.flatMap((index) => units[index].names).join(",")}`);
    }
    if (current.length && count + groupLines > maxLines) {
      parts.push(current.sort((a, b) => a - b));
      current = [];
      count = 0;
    }
    current.push(...group);
    count += groupLines;
  }
  if (current.length) parts.push(current.sort((a, b) => a - b));
  return parts;
}

function isJsxExpression(node) {
  if (!node) return false;
  if (ts.isParenthesizedExpression(node)) return isJsxExpression(node.expression);
  return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node);
}

function directJsxChildren(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  if (ts.isJsxElement(current) || ts.isJsxFragment(current)) {
    return current.children.filter((child) => !ts.isJsxText(child) || child.getText().trim());
  }
  return [];
}

function replaceRanges(text, baseStart, replacements) {
  let output = text;
  for (const replacement of [...replacements].sort((a, b) => b.start - a.start)) {
    const start = replacement.start - baseStart;
    const end = replacement.end - baseStart;
    output = output.slice(0, start) + replacement.text + output.slice(end);
  }
  return output;
}

function safeFile(filePath, content) {
  if (lineCount(content) > MAX_FILE_LINES) {
    throw new Error(`${filePath} generated ${lineCount(content)} lines`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.trimEnd() + "\n");
}

function parameterPlan(info, source) {
  if (info.parameters.length === 0) {
    return { signature: "", call: "", baseBody: "return {};", baseNames: [], typeRefs: [] };
  }
  if (info.parameters.length !== 1) throw new Error(`${info.name} has multiple parameters`);
  const parameter = info.parameters[0];
  if (!parameter.type) throw new Error(`${info.name} parameter is untyped`);
  const typeText = source.slice(parameter.type.getStart(), parameter.type.end);
  const typeRefs = [...references(parameter.type)];
  if (ts.isIdentifier(parameter.name)) {
    return {
      signature: `${parameter.name.text}: ${typeText}`,
      call: parameter.name.text,
      baseBody: `return { ${parameter.name.text} };`,
      baseNames: [parameter.name.text],
      typeRefs,
    };
  }
  const bindingText = source.slice(parameter.name.getStart(), parameter.name.end);
  const names = bindingNames(parameter.name);
  return {
    signature: `props: ${typeText}`,
    call: "props",
    baseBody: `const ${bindingText} = props;\n  return { ${names.join(", ")} };`,
    baseNames: names,
    typeRefs,
  };
}

function processTarget(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  if (!isClient(sourceFile)) throw new Error("not a client module");
  const imports = importRecords(sourceFile);
  const stem = path.basename(filePath, path.extname(filePath));
  const moduleDirName = `${stem}-modules`;
  const moduleDir = path.join(path.dirname(filePath), moduleDirName);
  const relativeDir = `./${moduleDirName}`;
  safeFile(
    path.join(moduleDir, "dependencies.ts"),
    ['"use client";', ...dependencyExports(imports)].join("\n"),
  );

  const defaultAssignment = sourceFile.statements.find(
    (node) => ts.isExportAssignment(node) && !node.isExportEquals,
  );
  const defaultName =
    defaultAssignment && ts.isIdentifier(defaultAssignment.expression)
      ? defaultAssignment.expression.text
      : null;
  const functionEntries = sourceFile.statements
    .map((statement) => functionInfo(statement))
    .filter(Boolean);
  const largeFunctions = functionEntries.filter(
    (entry) => lineCount(sourceText(source, entry.statement)) > MAX_BODY_LINES,
  );
  const largeNodes = new Set(largeFunctions.map((entry) => entry.statement));
  const sharedNodes = sourceFile.statements.filter(
    (node) =>
      !ts.isImportDeclaration(node) &&
      !ts.isExportAssignment(node) &&
      !ts.isExportDeclaration(node) &&
      !isDirective(node) &&
      !largeNodes.has(node),
  );
  const sharedUnits = sharedNodes.map((node) => ({
    node,
    names: declaredNames(node),
    refs: references(node),
    lines: lineCount(sourceText(source, node)),
    text: makeExported(sourceText(source, node).replace(/^export\s+default\s+/, "export ")),
  }));
  const sharedNames = new Set(sharedUnits.flatMap((unit) => unit.names));
  const sharedParts = sharedUnits.length
    ? packGroups(sharedUnits, dependencyGroups(sharedUnits))
    : [];
  const sharedOwners = new Map();
  sharedParts.forEach((indexes, partIndex) => {
    indexes.forEach((index) => sharedUnits[index].names.forEach((name) => sharedOwners.set(name, partIndex)));
  });
  sharedParts.forEach((indexes, partIndex) => {
    const refs = new Set(indexes.flatMap((index) => [...sharedUnits[index].refs]));
    const dependencyRefs = [...refs].filter((name) => imports.records.some((item) => item.local === name));
    const cross = new Map();
    for (const ref of refs) {
      const owner = sharedOwners.get(ref);
      if (owner !== undefined && owner !== partIndex) {
        if (!cross.has(owner)) cross.set(owner, new Set());
        cross.get(owner).add(ref);
      }
    }
    const lines = ['"use client";'];
    const depImport = renderNamedImport(dependencyRefs, "./dependencies");
    if (depImport) lines.push(depImport);
    for (const [owner, names] of [...cross].sort(([a], [b]) => a - b)) {
      lines.push(renderNamedImport([...names], `./shared-part-${String(owner + 1).padStart(2, "0")}`));
    }
    lines.push("", ...indexes.map((index) => sharedUnits[index].text));
    safeFile(path.join(moduleDir, `shared-part-${String(partIndex + 1).padStart(2, "0")}.tsx`), lines.join("\n\n"));
  });
  safeFile(
    path.join(moduleDir, "shared.ts"),
    sharedParts
      .map((_, index) => `export * from "./shared-part-${String(index + 1).padStart(2, "0")}";`)
      .join("\n") || "export {};",
  );

  const componentExports = [];
  for (const entry of largeFunctions) {
    const componentDir = path.join(moduleDir, entry.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase());
    const componentRelative = `./${entry.name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;
    const plan = parameterPlan(entry, source);
    const typeDependencyRefs = plan.typeRefs.filter((name) => imports.records.some((item) => item.local === name));
    const typeSharedRefs = plan.typeRefs.filter((name) => sharedNames.has(name));
    const baseLines = ['"use client";'];
    const depTypes = renderNamedImport(typeDependencyRefs, "../dependencies", true);
    const sharedTypes = renderNamedImport(typeSharedRefs, "../shared", true);
    if (depTypes) baseLines.push(depTypes);
    if (sharedTypes) baseLines.push(sharedTypes);
    baseLines.push(
      "",
      `export function useBaseScope(${plan.signature}) {`,
      ...plan.baseBody.split("\n").map((line) => `  ${line}`),
      "}",
      "",
      "export type BaseScope = ReturnType<typeof useBaseScope>;",
    );
    safeFile(path.join(componentDir, "base.tsx"), baseLines.join("\n"));

    const statements = [...entry.body.statements];
    const finalReturnIndex = [...statements].map((node) => ts.isReturnStatement(node)).lastIndexOf(true);
    if (finalReturnIndex < 0) throw new Error(`${entry.name} has no return`);
    if (statements.slice(0, finalReturnIndex).some(ts.isReturnStatement)) {
      throw new Error(`${entry.name} has an early top-level return`);
    }
    const controllerStatements = statements.slice(0, finalReturnIndex);
    const finalReturn = statements[finalReturnIndex];
    const controllerUnits = controllerStatements.map((node) => ({
      node,
      names: statementNames(node),
      refs: references(node),
      lines: lineCount(sourceText(source, node)),
      text: sourceText(source, node),
    }));
    const controllerOwners = new Map();
    controllerUnits.forEach((unit, index) => unit.names.forEach((name) => controllerOwners.set(name, index)));
    let groups = dependencyGroups(controllerUnits).sort((a, b) => a[0] - b[0]);
    let changed = true;
    while (changed) {
      changed = false;
      for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
        const group = groups[groupIndex];
        const refs = new Set(group.flatMap((index) => [...controllerUnits[index].refs]));
        const futureIndexes = [...refs]
          .map((ref) => controllerOwners.get(ref))
          .filter((owner) => owner !== undefined && owner > Math.max(...group));
        if (!futureIndexes.length) continue;
        const maxFuture = Math.max(...futureIndexes);
        const endGroup = groups.findIndex((candidate) => candidate.includes(maxFuture));
        if (endGroup > groupIndex) {
          groups.splice(groupIndex, endGroup - groupIndex + 1, groups.slice(groupIndex, endGroup + 1).flat().sort((a, b) => a - b));
          changed = true;
          break;
        }
      }
    }
    const controllerParts = packGroups(controllerUnits, groups, 255);
    const partScopeNames = [];
    controllerParts.forEach((indexes, partIndex) => {
      const priorNames = [...plan.baseNames, ...partScopeNames.flat()];
      const refs = new Set(indexes.flatMap((index) => [...controllerUnits[index].refs]));
      const priorRefs = priorNames.filter((name) => refs.has(name));
      const dependencyRefs = [...refs].filter((name) => imports.records.some((item) => item.local === name));
      const sharedRefs = [...refs].filter((name) => sharedNames.has(name));
      const partNames = indexes.flatMap((index) => controllerUnits[index].names);
      partScopeNames.push(partNames);
      const importsLines = ['"use client";', 'import type { BaseScope } from "./base";'];
      for (let previous = 0; previous < partIndex; previous += 1) {
        importsLines.push(`import type { Part${previous + 1}Scope } from "./controller-part-${String(previous + 1).padStart(2, "0")}";`);
      }
      const depImport = renderNamedImport(dependencyRefs, "../dependencies");
      const sharedImport = renderNamedImport(sharedRefs, "../shared");
      if (depImport) importsLines.push(depImport);
      if (sharedImport) importsLines.push(sharedImport);
      const priorType = ["BaseScope", ...Array.from({ length: partIndex }, (_, index) => `Part${index + 1}Scope`)].join(" & ");
      importsLines.push(
        "",
        `export function useControllerPart${partIndex + 1}(scope: ${priorType}) {`,
      );
      if (priorRefs.length) importsLines.push(`  const { ${priorRefs.join(", ")} } = scope;`);
      for (const index of indexes) {
        importsLines.push(
          ...controllerUnits[index].text.split("\n").map((line) => `  ${line}`),
          "",
        );
      }
      importsLines.push(`  return { ${partNames.join(", ")} };`, "}", "", `export type Part${partIndex + 1}Scope = ReturnType<typeof useControllerPart${partIndex + 1}>;`);
      safeFile(path.join(componentDir, `controller-part-${String(partIndex + 1).padStart(2, "0")}.tsx`), importsLines.join("\n"));
    });

    const controllerLines = ['"use client";', `import { useBaseScope } from "./base";`];
    controllerParts.forEach((_, index) => {
      controllerLines.push(`import { useControllerPart${index + 1} } from "./controller-part-${String(index + 1).padStart(2, "0")}";`);
    });
    controllerLines.push("", `export function use${entry.name}Controller(${plan.signature}) {`, `  let scope = useBaseScope(${plan.call});`);
    controllerParts.forEach((_, index) => {
      controllerLines.push(`  scope = { ...scope, ...useControllerPart${index + 1}(scope) };`);
    });
    controllerLines.push("  return scope;", "}", "", `export type ${entry.name}Scope = ReturnType<typeof use${entry.name}Controller>;`);
    safeFile(path.join(componentDir, "controller.tsx"), controllerLines.join("\n"));

    if (!finalReturn.expression) throw new Error(`${entry.name} return has no expression`);
    if (isJsxExpression(finalReturn.expression)) {
      const scopeNames = new Set([...plan.baseNames, ...partScopeNames.flat()]);
      const viewFiles = [];
      let sectionCounter = 0;
      function createSection(node, label) {
        sectionCounter += 1;
        const sectionName = `${entry.name}${label}${sectionCounter}`;
        const children = directJsxChildren(node);
        let nodeText = source.slice(node.getStart(), node.end);
        const replacements = [];
        if (lineCount(nodeText) > 210 && children.length > 1) {
          for (const child of children) {
            const childText = source.slice(child.getStart(), child.end);
            if (lineCount(childText) < 35 && lineCount(nodeText) < 280) continue;
            const childName = createSection(child, "Section");
            replacements.push({ start: child.getStart(), end: child.end, text: `<${childName} scope={scope} />` });
          }
          nodeText = replaceRanges(nodeText, node.getStart(), replacements);
        }
        if (lineCount(nodeText) > 235) {
          throw new Error(`${entry.name} JSX section remains ${lineCount(nodeText)} lines`);
        }
        const refs = references(node);
        const scopeRefs = [...refs].filter((name) => scopeNames.has(name));
        const dependencyRefs = [...refs].filter((name) => imports.records.some((item) => item.local === name));
        const sharedRefs = [...refs].filter((name) => sharedNames.has(name));
        const nestedNames = replacements.map((item) => item.text.match(/^<([A-Za-z0-9_]+)/)?.[1]).filter(Boolean);
        const lines = ['"use client";', `import type { ${entry.name}Scope } from "./controller";`];
        const depImport = renderNamedImport(dependencyRefs, "../dependencies");
        const sharedImport = renderNamedImport(sharedRefs, "../shared");
        if (depImport) lines.push(depImport);
        if (sharedImport) lines.push(sharedImport);
        for (const nestedName of nestedNames) {
          const nestedFile = viewFiles.find((item) => item.name === nestedName);
          if (nestedFile) lines.push(`import { ${nestedName} } from "./${nestedFile.fileStem}";`);
        }
        lines.push("", `export function ${sectionName}({ scope }: { scope: ${entry.name}Scope }) {`);
        if (scopeRefs.length) lines.push(`  const { ${scopeRefs.join(", ")} } = scope;`);
        lines.push("  return (", ...nodeText.split("\n").map((line) => `    ${line}`), "  );", "}");
        const fileStem = `view-section-${String(sectionCounter).padStart(2, "0")}`;
        viewFiles.push({ name: sectionName, fileStem, content: lines.join("\n") });
        return sectionName;
      }
      const mainSectionName = createSection(finalReturn.expression, "View");
      for (const file of viewFiles) safeFile(path.join(componentDir, `${file.fileStem}.tsx`), file.content);
      const mainFile = viewFiles.find((item) => item.name === mainSectionName);
      safeFile(
        path.join(componentDir, "view.tsx"),
        ['"use client";', `import type { ${entry.name}Scope } from "./controller";`, `import { ${mainSectionName} } from "./${mainFile.fileStem}";`, "", `export function ${entry.name}View({ scope }: { scope: ${entry.name}Scope }) {`, `  return <${mainSectionName} scope={scope} />;`, "}"].join("\n"),
      );
      const wrapperLines = ['"use client";'];
      const depTypeImport = renderNamedImport(typeDependencyRefs, "../dependencies", true);
      const sharedTypeImport = renderNamedImport(typeSharedRefs, "../shared", true);
      if (depTypeImport) wrapperLines.push(depTypeImport);
      if (sharedTypeImport) wrapperLines.push(sharedTypeImport);
      wrapperLines.push(`import { use${entry.name}Controller } from "./controller";`, `import { ${entry.name}View } from "./view";`, "", `export function ${entry.name}(${plan.signature}) {`, `  const scope = use${entry.name}Controller(${plan.call});`, `  return <${entry.name}View scope={scope} />;`, "}");
      safeFile(path.join(componentDir, "index.tsx"), wrapperLines.join("\n"));
    } else {
      const refs = references(finalReturn.expression);
      const scopeNames = new Set([...plan.baseNames, ...partScopeNames.flat()]);
      const scopeRefs = [...refs].filter((name) => scopeNames.has(name));
      const depRefs = [...refs].filter((name) => imports.records.some((item) => item.local === name));
      const sharedRefs = [...refs].filter((name) => sharedNames.has(name));
      const lines = ['"use client";', `import type { ${entry.name}Scope } from "./controller";`];
      const depImport = renderNamedImport(depRefs, "../dependencies");
      const sharedImport = renderNamedImport(sharedRefs, "../shared");
      if (depImport) lines.push(depImport);
      if (sharedImport) lines.push(sharedImport);
      lines.push("", `export function finish${entry.name}(scope: ${entry.name}Scope) {`);
      if (scopeRefs.length) lines.push(`  const { ${scopeRefs.join(", ")} } = scope;`);
      lines.push(`  return ${source.slice(finalReturn.expression.getStart(), finalReturn.expression.end)};`, "}");
      safeFile(path.join(componentDir, "result.tsx"), lines.join("\n"));
      const wrapperLines = ['"use client";'];
      const depTypeImport = renderNamedImport(typeDependencyRefs, "../dependencies", true);
      const sharedTypeImport = renderNamedImport(typeSharedRefs, "../shared", true);
      if (depTypeImport) wrapperLines.push(depTypeImport);
      if (sharedTypeImport) wrapperLines.push(sharedTypeImport);
      wrapperLines.push(`import { use${entry.name}Controller } from "./controller";`, `import { finish${entry.name} } from "./result";`, "", `export function ${entry.name}(${plan.signature}) {`, `  const scope = use${entry.name}Controller(${plan.call});`, `  return finish${entry.name}(scope);`, "}");
      safeFile(path.join(componentDir, "index.tsx"), wrapperLines.join("\n"));
    }
    componentExports.push({
      name: entry.name,
      relative: `${relativeDir}/${componentRelative.slice(2)}`,
      public: entry.namedExport || entry.defaultExport || defaultName === entry.name,
      default: entry.defaultExport || defaultName === entry.name,
    });
  }

  const publicSharedNames = sharedNodes
    .filter((node) => hasModifier(node, ts.SyntaxKind.ExportKeyword))
    .flatMap(declaredNames);
  const facade = [];
  if (isClient(sourceFile)) facade.push('"use client";', "");
  facade.push(...imports.sideEffects);
  if (imports.sideEffects.length) facade.push("");
  for (const item of componentExports) {
    if (item.public) facade.push(`export { ${item.name} } from ${JSON.stringify(item.relative)};`);
    if (item.default) facade.push(`export { ${item.name} as default } from ${JSON.stringify(item.relative)};`);
  }
  if (publicSharedNames.length) facade.push(`export { ${publicSharedNames.join(", ")} } from ${JSON.stringify(`${relativeDir}/shared`)};`);
  for (const statement of sourceFile.statements.filter(ts.isExportDeclaration)) {
    facade.push(sourceText(source, statement));
  }
  safeFile(filePath, facade.join("\n"));
  return { largeFunctions: largeFunctions.length, sharedParts: sharedParts.length };
}

const report = ["status\tcomponents\tshared_parts\tpath\tdetail"];
for (const target of TARGETS) {
  try {
    const result = processTarget(target);
    report.push(`split\t${result.largeFunctions}\t${result.sharedParts}\t${target}\t`);
  } catch (error) {
    report.push(`failed\t0\t0\t${target}\t${error.stack ?? error.message}`);
  }
}
fs.writeFileSync("artifacts/medium-ui-architecture-report.tsv", report.join("\n") + "\n");
