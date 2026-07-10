const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const targets = [
  "admin/components/test-editor-wizard.tsx",
  "frontend/components/exam/reading-exam-preview.tsx",
  "frontend/app/(app)/speaking/speaking-page-client.tsx",
  "frontend/components/layout/app-loading-placeholder.tsx",
  "frontend/app/(app)/writing/submissions/[submissionId]/result/result-client.tsx",
  "frontend/app/(app)/tests/page.tsx",
  "admin/app/(dashboard)/promo-codes/page.tsx",
  "frontend/app/(app)/analytics/[skill]/skill-analytics-client.tsx",
  "frontend/components/subscription/subscription-workspace.tsx",
  "frontend/components/layout/site-shell.tsx",
];

function lineOf(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function declarationNames(node) {
  const names = [];
  function collect(name) {
    if (!name) return;
    if (ts.isIdentifier(name)) names.push(name.text);
    else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) collect(element.name);
      }
    }
  }
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    if (node.name) names.push(node.name.text);
  } else if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) collect(declaration.name);
  } else if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    if (clause?.name) names.push(clause.name.text);
    if (clause?.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) names.push(clause.namedBindings.name.text);
      else {
        for (const element of clause.namedBindings.elements) names.push(element.name.text);
      }
    }
  } else if (ts.isExportAssignment(node)) {
    names.push(node.isExportEquals ? "export=" : "default");
  }
  return names;
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === kind));
}

function mapFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  return {
    path: filePath,
    lines: text.split(/\r?\n/).length,
    clientDirective: sourceFile.statements.some(
      (statement) =>
        ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression) &&
        statement.expression.text === "use client",
    ),
    nodes: sourceFile.statements.map((node, index) => {
      const start = lineOf(sourceFile, node.getStart(sourceFile));
      const end = lineOf(sourceFile, node.end);
      return {
        index: index + 1,
        kind: ts.SyntaxKind[node.kind],
        names: declarationNames(node),
        start,
        end,
        lines: end - start + 1,
        exported: hasModifier(node, ts.SyntaxKind.ExportKeyword),
        defaultExport: hasModifier(node, ts.SyntaxKind.DefaultKeyword),
      };
    }),
  };
}

const report = targets.map(mapFile);
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync(
  "artifacts/typescript-module-map.json",
  JSON.stringify(report, null, 2) + "\n",
);
const rows = ["file\tindex\tkind\tnames\tstart\tend\tlines\texported\tdefault"];
for (const file of report) {
  for (const node of file.nodes) {
    rows.push(
      [
        file.path,
        node.index,
        node.kind,
        node.names.join(","),
        node.start,
        node.end,
        node.lines,
        node.exported,
        node.defaultExport,
      ].join("\t"),
    );
  }
}
fs.writeFileSync("artifacts/typescript-module-map.tsv", rows.join("\n") + "\n");
