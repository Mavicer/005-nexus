import collections from "./collections.json";
export const RESOURCE_TYPES = {
  rules: "比赛规则",
  problems: "赛题资料",
  tools: "工具与技术",
  works: "作品参考",
} as const;
export type ResourceType = keyof typeof RESOURCE_TYPES;
export const resourceCollections = collections;
export function findResources(competition = "", kind = "") {
  return collections
    .filter((item) => !competition || item.slug === competition)
    .map((item) => ({
      ...item,
      resources: item.resources.filter(
        (resource) => !kind || resource.kind === kind,
      ),
    }))
    .filter((item) => item.resources.length);
}
