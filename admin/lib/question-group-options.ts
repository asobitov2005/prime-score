export function groupUsesOptionBank(typeId: string) {
  const type = String(typeId).toLowerCase();
  if (type.includes("matching_information") || type.includes("plan_map_labeling")) {
    return false;
  }
  if (type.includes("wordbank")) {
    return true;
  }
  if (type.includes("listening_matching")) {
    return true;
  }
  if (type.includes("matching_headings")) {
    return true;
  }
  if (type.includes("matching_features")) {
    return true;
  }
  if (type.includes("matching_sentence_endings")) {
    return true;
  }
  if (type.includes("matching")) {
    return true;
  }
  return false;
}

export function groupKeepsSharedOptions(typeId: string) {
  const type = String(typeId).toLowerCase();
  return groupUsesOptionBank(typeId)
    || type.includes("matching_information")
    || type.includes("plan_map_labeling");
}

export function sanitizeAdminQuestionGroupOptionFields<
  T extends {
    typeId: string;
    secondaryBlock?: string;
    optionsTitle?: string;
    sharedOptions?: string[];
  },
>(group: T): T {
  if (groupUsesOptionBank(group.typeId)) {
    return group;
  }

  return {
    ...group,
    secondaryBlock: "",
    optionsTitle: "",
    sharedOptions: groupKeepsSharedOptions(group.typeId) ? (group.sharedOptions ?? []) : [],
  };
}
