const fs = require("node:fs");
const path = require("node:path");
const ts = require(path.resolve("frontend/node_modules/typescript"));

function sourceFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return {
    text,
    ast: ts.createSourceFile(
      filePath,
      text,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  };
}

function segment(text, node) {
  return text.slice(node.getStart(), node.end);
}

function findVariable(ast, name) {
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return declaration;
      }
    }
  }
  throw new Error(`Variable ${name} not found`);
}

function lucideImports(ast) {
  const map = new Map();
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== "lucide-react") continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const specifier of bindings.elements) {
      const imported = specifier.propertyName?.text ?? specifier.name.text;
      map.set(specifier.name.text, {
        imported,
        local: specifier.name.text,
        typeOnly: specifier.isTypeOnly,
      });
    }
  }
  return map;
}

function identifiers(node) {
  const values = new Set();
  function visit(current) {
    if (ts.isIdentifier(current)) values.add(current.text);
    ts.forEachChild(current, visit);
  }
  visit(node);
  return values;
}

function renderLucideImport(names, importMap) {
  const specs = [...names]
    .filter((name) => importMap.has(name) && name !== "LucideIcon")
    .sort()
    .map((name) => {
      const item = importMap.get(name);
      return item.imported === item.local
        ? item.local
        : `${item.imported} as ${item.local}`;
    });
  return specs.length ? `import { ${specs.join(", ")} } from "lucide-react";\n` : "";
}

function chunks(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function assertSmall(filePath, content) {
  const count = content.split(/\r?\n/).length;
  if (count > 300) throw new Error(`${filePath} has ${count} lines`);
  fs.writeFileSync(filePath, content);
}

function splitFrontendIcons() {
  const filePath = "frontend/lib/speaking-topic-icons.ts";
  const { text, ast } = sourceFile(filePath);
  const declaration = findVariable(ast, "ICON_MAP");
  if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) {
    throw new Error("ICON_MAP is not an object literal");
  }
  const importMap = lucideImports(ast);
  const parts = chunks([...declaration.initializer.properties], 70);
  const partNames = [];
  parts.forEach((properties, index) => {
    const number = String(index + 1).padStart(2, "0");
    const name = `ICON_MAP_PART_${number}`;
    partNames.push(name);
    const used = new Set();
    properties.forEach((property) => identifiers(property).forEach((id) => used.add(id)));
    const body = properties.map((property) => `  ${segment(text, property)},`).join("\n");
    const content = `${renderLucideImport(used, importMap)}import type { LucideIcon } from "lucide-react";\n\nexport const ${name}: Record<string, LucideIcon> = {\n${body}\n};\n`;
    assertSmall(`frontend/lib/speaking-topic-icons-part-${number}.ts`, content);
  });
  const partImports = partNames
    .map((name, index) => `import { ${name} } from "./speaking-topic-icons-part-${String(index + 1).padStart(2, "0")}";`)
    .join("\n");
  const content = `import type { LucideIcon } from "lucide-react";\n${partImports}\n\nexport type SpeakingTopicIconTone = "purple" | "blue" | "green" | "orange" | "pink";\n\nconst ICON_MAP: Record<string, LucideIcon> = {\n${partNames.map((name) => `  ...${name},`).join("\n")}\n};\n\nexport function resolveSpeakingTopicIcon(iconId: string | null | undefined): LucideIcon | null {\n  if (!iconId) return null;\n  return ICON_MAP[iconId] ?? null;\n}\n\nexport function isSpeakingTopicIconTone(value: string | null | undefined): value is SpeakingTopicIconTone {\n  return value === "purple" || value === "blue" || value === "green" || value === "orange" || value === "pink";\n}\n`;
  assertSmall(filePath, content);
}

function splitAdminIcons() {
  const filePath = "admin/lib/speaking-icons.ts";
  const { text, ast } = sourceFile(filePath);
  const declaration = findVariable(ast, "SPEAKING_TOPIC_ICONS");
  if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
    throw new Error("SPEAKING_TOPIC_ICONS is not an array literal");
  }
  const importMap = lucideImports(ast);
  const typesContent = `import type { LucideIcon } from "lucide-react";\n\nexport const SPEAKING_ICON_TONES = ["purple", "blue", "green", "orange", "pink"] as const;\nexport type SpeakingIconTone = (typeof SPEAKING_ICON_TONES)[number];\nexport type SpeakingIconOption = { id: string; label: string; Icon: LucideIcon };\n`;
  assertSmall("admin/lib/speaking-icons-types.ts", typesContent);
  const parts = chunks([...declaration.initializer.elements], 70);
  const partNames = [];
  parts.forEach((elements, index) => {
    const number = String(index + 1).padStart(2, "0");
    const name = `SPEAKING_TOPIC_ICONS_PART_${number}`;
    partNames.push(name);
    const used = new Set();
    elements.forEach((element) => identifiers(element).forEach((id) => used.add(id)));
    const body = elements.map((element) => `  ${segment(text, element)},`).join("\n");
    const content = `${renderLucideImport(used, importMap)}import type { SpeakingIconOption } from "./speaking-icons-types";\n\nexport const ${name}: SpeakingIconOption[] = [\n${body}\n];\n`;
    assertSmall(`admin/lib/speaking-icons-part-${number}.ts`, content);
  });
  const imports = partNames
    .map((name, index) => `import { ${name} } from "./speaking-icons-part-${String(index + 1).padStart(2, "0")}";`)
    .join("\n");
  const content = `import { SPEAKING_ICON_TONES, type SpeakingIconOption, type SpeakingIconTone } from "./speaking-icons-types";\n${imports}\n\nexport { SPEAKING_ICON_TONES };\nexport type { SpeakingIconOption, SpeakingIconTone };\n\nexport const SPEAKING_TOPIC_ICONS: SpeakingIconOption[] = [\n${partNames.map((name) => `  ...${name},`).join("\n")}\n];\n\nconst iconMap = new Map(SPEAKING_TOPIC_ICONS.map((item) => [item.id, item]));\n\nexport function resolveSpeakingIcon(iconId: string | null | undefined): SpeakingIconOption | null {\n  if (!iconId) return null;\n  return iconMap.get(iconId) ?? null;\n}\n\nexport function isSpeakingIconTone(value: string | null | undefined): value is SpeakingIconTone {\n  return Boolean(value && SPEAKING_ICON_TONES.includes(value as SpeakingIconTone));\n}\n\nexport function iconsForPart(_part: 1 | 2 | 3): SpeakingIconOption[] {\n  return SPEAKING_TOPIC_ICONS;\n}\n\nexport function filterSpeakingIcons(icons: SpeakingIconOption[], query: string): SpeakingIconOption[] {\n  const normalized = query.trim().toLowerCase();\n  if (!normalized) return icons;\n  return icons.filter((item) => {\n    const haystack = \`${"${item.label} ${item.id.replace(/-/g, \" \")}"}\`.toLowerCase();\n    return haystack.includes(normalized);\n  });\n}\n\nexport const SPEAKING_ICON_TONE_STYLES: Record<SpeakingIconTone, string> = {\n  purple: "bg-violet-100 text-violet-700 border-violet-200",\n  blue: "bg-sky-100 text-sky-700 border-sky-200",\n  green: "bg-emerald-100 text-emerald-700 border-emerald-200",\n  orange: "bg-orange-100 text-orange-700 border-orange-200",\n  pink: "bg-pink-100 text-pink-700 border-pink-200",\n};\n`;
  assertSmall(filePath, content);
}

function objectPropertyString(object, key) {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name;
    const propertyName = ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
    if (propertyName !== key) continue;
    if (ts.isStringLiteral(property.initializer)) return property.initializer.text;
  }
  return null;
}

function splitAchievements() {
  const filePath = "frontend/src/data/achievements.ts";
  const { text, ast } = sourceFile(filePath);
  const declaration = findVariable(ast, "achievements");
  if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
    throw new Error("achievements is not an array literal");
  }
  const badgePathDeclaration = findVariable(ast, "badgePath");
  const badgeText = segment(text, badgePathDeclaration.initializer);
  const helper = `import type { AchievementCategory } from "@/src/types/achievement";\n\nexport const badgePath = ${badgeText} satisfies Record<AchievementCategory, string>;\n`;
  assertSmall("frontend/src/data/achievement-paths.ts", helper);
  const groups = new Map();
  for (const element of declaration.initializer.elements) {
    if (!ts.isObjectLiteralExpression(element)) throw new Error("achievement entry is not an object");
    const category = objectPropertyString(element, "category");
    if (!category) throw new Error("achievement category missing");
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(element);
  }
  const categories = [...groups.keys()];
  for (const category of categories) {
    const entries = groups.get(category);
    const body = entries.map((entry) => `  ${segment(text, entry)},`).join("\n");
    const constName = `${category}Achievements`;
    const content = `import type { Achievement } from "@/src/types/achievement";\nimport { badgePath } from "./achievement-paths";\n\nexport const ${constName}: Achievement[] = [\n${body}\n];\n`;
    assertSmall(`frontend/src/data/achievements-${category}.ts`, content);
  }
  const imports = categories
    .map((category) => `import { ${category}Achievements } from "./achievements-${category}";`)
    .join("\n");
  const content = `import type { Achievement } from "@/src/types/achievement";\n${imports}\n\nexport const achievements: Achievement[] = [\n${categories.map((category) => `  ...${category}Achievements,`).join("\n")}\n];\n`;
  assertSmall(filePath, content);
}

splitFrontendIcons();
splitAdminIcons();
splitAchievements();
