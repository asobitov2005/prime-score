const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

const filePath = "admin/components/test-editor-wizard.tsx";
const moduleDir = "admin/components/test-editor-wizard-modules/content-panel";
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

function text(node) {
  return source.slice(node.getStart(sourceFile), node.end);
}

function fullText(node) {
  return source.slice(node.getFullStart(), node.end).trim();
}

function directChildren(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  if (ts.isJsxElement(current) || ts.isJsxFragment(current)) {
    return current.children.filter(
      (child) => !ts.isJsxText(child) || child.getText(sourceFile).trim(),
    );
  }
  return [];
}

function findMapCallback(node, receiverText = null) {
  let result = null;
  function visit(current) {
    if (result) return;
    if (
      ts.isCallExpression(current) &&
      ts.isPropertyAccessExpression(current.expression) &&
      current.expression.name.text === "map" &&
      current.arguments.length > 0 &&
      (ts.isArrowFunction(current.arguments[0]) ||
        ts.isFunctionExpression(current.arguments[0])) &&
      (receiverText === null ||
        current.expression.expression.getText(sourceFile) === receiverText)
    ) {
      result = { call: current, callback: current.arguments[0] };
      return;
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return result;
}

function importNames(statement) {
  const names = [];
  if (!ts.isImportDeclaration(statement) || !statement.importClause) return names;
  const clause = statement.importClause;
  if (clause.name) names.push(clause.name.text);
  const bindings = clause.namedBindings;
  if (bindings && ts.isNamespaceImport(bindings)) names.push(bindings.name.text);
  if (bindings && ts.isNamedImports(bindings)) {
    names.push(...bindings.elements.map((item) => item.name.text));
  }
  return names;
}

function namedImport(names, sourcePath, typeOnly = false) {
  const values = [...new Set(names)].sort();
  if (!values.length) return "";
  return `import${typeOnly ? " type" : ""} { ${values.join(", ")} } from ${JSON.stringify(sourcePath)};`;
}

function writeSmall(name, content) {
  const target = path.join(moduleDir, name);
  const count = content.split(/\r?\n/).length;
  if (count > 290) throw new Error(`${target} has ${count} lines`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${content.trimEnd()}\n`);
}

const imports = new Set(sourceFile.statements.flatMap(importNames));
const topLevelDeclarations = new Set(
  sourceFile.statements.flatMap(declaredNames),
);
const contentPanel = sourceFile.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) &&
    statement.name?.text === "ContentPanel",
);
if (!contentPanel || !contentPanel.body) {
  throw new Error("ContentPanel not found");
}
const sharedNames = new Set(
  [...topLevelDeclarations].filter((name) => name !== "ContentPanel"),
);
const statements = [...contentPanel.body.statements];
const returnStatement = [...statements]
  .reverse()
  .find((statement) => ts.isReturnStatement(statement) && statement.expression);
if (!returnStatement?.expression) throw new Error("ContentPanel return not found");
const controllerNames = new Set([
  ...contentPanel.parameters.flatMap((parameter) => bindingNames(parameter.name)),
  ...statements
    .slice(0, statements.indexOf(returnStatement))
    .flatMap(declaredNames),
]);
const rootChildren = directChildren(returnStatement.expression);
if (rootChildren.length !== 2) {
  throw new Error(`Expected two ContentPanel columns, found ${rootChildren.length}`);
}
const editorColumn = rootChildren[0];
const previewColumn = rootChildren[1];
const editorChildren = directChildren(editorColumn);
if (editorChildren.length < 4) {
  throw new Error(`Expected ContentPanel editor children, found ${editorChildren.length}`);
}
const sectionsExpression = editorChildren.find((child) =>
  findMapCallback(child, "draft.content.sections"),
);
if (!sectionsExpression) throw new Error("Content sections map not found");
const mapInfo = findMapCallback(
  sectionsExpression,
  "draft.content.sections",
);
if (!mapInfo || !ts.isBlock(mapInfo.callback.body)) {
  throw new Error("Content sections map callback must use a block body");
}
const callbackStatements = [...mapInfo.callback.body.statements];
const callbackReturn = callbackStatements.find(
  (statement) => ts.isReturnStatement(statement) && statement.expression,
);
if (!callbackReturn?.expression || !ts.isJsxElement(callbackReturn.expression)) {
  throw new Error("Content section card return not found");
}
const itemStatements = callbackStatements.slice(
  0,
  callbackStatements.indexOf(callbackReturn),
);
const itemNames = [
  ...mapInfo.callback.parameters.flatMap((parameter) => bindingNames(parameter.name)),
  ...itemStatements.flatMap(declaredNames),
];
const card = callbackReturn.expression;
const cardChildren = directChildren(card);
if (cardChildren.length !== 2) {
  throw new Error(`Expected Card header/body children, found ${cardChildren.length}`);
}
const cardHeader = cardChildren[0];
const cardBodyExpression = cardChildren[1];

function moduleContext(nodes, extraLocalNames = []) {
  const refs = new Set();
  for (const node of nodes) {
    references(node).forEach((name) => refs.add(name));
  }
  const localSet = new Set(extraLocalNames);
  return {
    scope: [...refs].filter(
      (name) => controllerNames.has(name) && !localSet.has(name),
    ),
    item: [...refs].filter((name) => itemNames.includes(name)),
    dependencies: [...refs].filter((name) => imports.has(name)),
    shared: [...refs].filter(
      (name) => sharedNames.has(name) && !controllerNames.has(name),
    ),
  };
}

function viewModule({
  functionName,
  body,
  nodes,
  item = false,
  extraImports = [],
}) {
  const context = moduleContext(nodes, item ? itemNames : []);
  const lines = [
    '"use client";',
    `import type { ContentPanelScope } from "./controller";`,
  ];
  if (item) {
    lines.push(`import type { ContentSectionItem } from "./section-item";`);
  }
  const depImport = namedImport(context.dependencies, "../dependencies");
  const sharedImport = namedImport(context.shared, "../shared");
  if (depImport) lines.push(depImport);
  if (sharedImport) lines.push(sharedImport);
  lines.push(...extraImports, "");
  const props = item
    ? `{ scope, item }: { scope: ContentPanelScope; item: ContentSectionItem }`
    : `{ scope }: { scope: ContentPanelScope }`;
  lines.push(`export function ${functionName}(${props}) {`);
  if (context.scope.length) {
    lines.push(`  const { ${context.scope.join(", ")} } = scope;`);
  }
  if (item && context.item.length) {
    lines.push(`  const { ${context.item.join(", ")} } = item;`);
  }
  lines.push("  return (", ...body.split("\n").map((line) => `    ${line}`), "  );", "}");
  return lines.join("\n");
}

const headerNodes = editorChildren.filter(
  (child) => child !== sectionsExpression,
);
const headerBody = `<div className="space-y-6">\n${headerNodes
  .map((node) => text(node))
  .join("\n")}\n  <ContentSectionsList scope={scope} />\n</div>`;
writeSmall(
  "editor-column.tsx",
  viewModule({
    functionName: "ContentPanelEditorColumn",
    body: headerBody,
    nodes: headerNodes,
    extraImports: ['import { ContentSectionsList } from "./section-list";'],
  }),
);

writeSmall(
  "preview-column.tsx",
  viewModule({
    functionName: "ContentPanelPreviewColumn",
    body: text(previewColumn),
    nodes: [previewColumn],
  }),
);

const itemRefs = new Set(itemStatements.flatMap((statement) => [...references(statement)]));
const itemScopeRefs = [...itemRefs].filter((name) => controllerNames.has(name));
const itemDependencyRefs = [...itemRefs].filter((name) => imports.has(name));
const itemSharedRefs = [...itemRefs].filter(
  (name) => sharedNames.has(name) && !controllerNames.has(name),
);
const itemLines = [
  '"use client";',
  'import type { ContentPanelScope } from "./controller";',
  namedImport(itemDependencyRefs, "../dependencies"),
  namedImport(itemSharedRefs, "../shared"),
  "",
  "export function buildContentSectionItem(",
  "  scope: ContentPanelScope,",
  "  section: ContentPanelScope[\"draft\"][\"content\"][\"sections\"][number],",
  "  idx: number,",
  ") {",
];
if (itemScopeRefs.length) {
  itemLines.push(`  const { ${itemScopeRefs.join(", ")} } = scope;`);
}
for (const statement of itemStatements) {
  itemLines.push(...fullText(statement).split("\n").map((line) => `  ${line}`), "");
}
itemLines.push(
  `  return { ${itemNames.join(", ")} };`,
  "}",
  "",
  "export type ContentSectionItem = ReturnType<typeof buildContentSectionItem>;",
);
writeSmall("section-item.tsx", itemLines.filter(Boolean).join("\n"));

writeSmall(
  "section-list.tsx",
  [
    '"use client";',
    'import type { ContentPanelScope } from "./controller";',
    'import { buildContentSectionItem } from "./section-item";',
    'import { ContentSectionCard } from "./section-card";',
    "",
    "export function ContentSectionsList({ scope }: { scope: ContentPanelScope }) {",
    "  const { draft } = scope;",
    "  return (",
    "    <>",
    "      {draft.content.sections.map((section, idx) => (",
    "        <ContentSectionCard",
    "          key={section.id}",
    "          scope={scope}",
    "          item={buildContentSectionItem(scope, section, idx)}",
    "        />",
    "      ))}",
    "    </>",
    "  );",
    "}",
  ].join("\n"),
);

writeSmall(
  "section-header.tsx",
  viewModule({
    functionName: "ContentSectionHeader",
    body: text(cardHeader),
    nodes: [cardHeader],
    item: true,
  }),
);

writeSmall(
  "section-body.tsx",
  viewModule({
    functionName: "ContentSectionBody",
    body: text(cardBodyExpression),
    nodes: [cardBodyExpression],
    item: true,
  }),
);

writeSmall(
  "section-card.tsx",
  [
    '"use client";',
    'import type { ContentPanelScope } from "./controller";',
    'import type { ContentSectionItem } from "./section-item";',
    namedImport(["Card"], "../dependencies"),
    'import { ContentSectionHeader } from "./section-header";',
    'import { ContentSectionBody } from "./section-body";',
    "",
    "export function ContentSectionCard({ scope, item }: { scope: ContentPanelScope; item: ContentSectionItem }) {",
    "  return (",
    '    <Card className="overflow-hidden border-border shadow-md">',
    "      <ContentSectionHeader scope={scope} item={item} />",
    "      <ContentSectionBody scope={scope} item={item} />",
    "    </Card>",
    "  );",
    "}",
  ].join("\n"),
);

writeSmall(
  "view.tsx",
  [
    '"use client";',
    'import type { ContentPanelScope } from "./controller";',
    'import { ContentPanelEditorColumn } from "./editor-column";',
    'import { ContentPanelPreviewColumn } from "./preview-column";',
    "",
    "export function ContentPanelView({ scope }: { scope: ContentPanelScope }) {",
    "  return (",
    '    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(360px,0.72fr)]">',
    "      <ContentPanelEditorColumn scope={scope} />",
    "      <ContentPanelPreviewColumn scope={scope} />",
    "    </div>",
    "  );",
    "}",
  ].join("\n"),
);

writeSmall(
  "index.tsx",
  [
    '"use client";',
    'import { useContentPanelController } from "./controller";',
    'import { ContentPanelView } from "./view";',
    "",
    "export function ContentPanel(",
    "  props: Parameters<typeof useContentPanelController>[0],",
    ") {",
    "  const scope = useContentPanelController(props);",
    "  return <ContentPanelView scope={scope} />;",
    "}",
  ].join("\n"),
);

const importInsertPosition = sourceFile.statements
  .filter((statement) => ts.isImportDeclaration(statement))
  .at(-1).end;
const importLine = '\nimport { ContentPanel } from "./test-editor-wizard-modules/content-panel";';
const updated =
  source.slice(0, importInsertPosition) +
  importLine +
  source.slice(importInsertPosition, contentPanel.getFullStart()) +
  "\n" +
  source.slice(contentPanel.end);
fs.writeFileSync(filePath, updated);
