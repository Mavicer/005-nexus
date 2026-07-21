/**
 * Phase A+ A2 classifyMajor 四向量融合 单测
 */
import { describe, expect, it } from "vitest";
import { classifyMajorFusion, SUB_DIRECTION_VECTORS, TARGET_DIRECTION_VECTORS, FUSION_WEIGHTS } from "@/lib/knowledge/major-vector";

describe("classifyMajorFusion 四向量融合", () => {
  it("模型1 临床医学 med_clinical → clinical 轴高", () => {
    const r = classifyMajorFusion({
      majorText: "临床医学",
      majorSubDirection: "med_clinical",
      targetDirection: "research_academic",
      grade: "sophomore",
    });
    expect(r.vector.clinical).toBeGreaterThan(0.5);
    expect(r.subDirection).toBe("med_clinical");
    expect(r.fusionSource).toContain("subDir:med_clinical");
  });

  it("模型3 视觉传达 art_visual → arts 轴高", () => {
    const r = classifyMajorFusion({
      majorText: "视觉传达设计",
      majorSubDirection: "art_visual",
      targetDirection: "product_design",
      grade: "sophomore",
    });
    expect(r.vector.arts).toBeGreaterThan(0.5);
    expect(r.subDirection).toBe("art_visual");
  });

  it("模型5 英语 eng_business → humanities+business 高", () => {
    const r = classifyMajorFusion({
      majorText: "英语",
      majorSubDirection: "eng_business",
      targetDirection: "exploration",
      grade: "freshman",
    });
    expect(r.vector.humanities).toBeGreaterThan(0.4);
    expect(r.vector.business).toBeGreaterThan(0.4);
  });

  it("owner画像 南邮自动化 auto_embedded → engineering 轴高", () => {
    const r = classifyMajorFusion({
      majorText: "自动化",
      majorSubDirection: "auto_embedded",
      targetDirection: "tech_engineering",
      grade: "freshman",
    });
    expect(r.vector.engineering).toBeGreaterThan(0.7);
  });

  it("缺向量归零不报错（无子方向/无目标方向）", () => {
    const r = classifyMajorFusion({
      majorText: "自动化",
      grade: "freshman",
    });
    expect(r.subDirection).toBeNull();
    expect(r.targetDirection).toBeNull();
    expect(r.fusionSource).toContain("majorText");
    expect(r.fusionSource).not.toContain("subDir");
  });

  it("全空 → 中性向量不报错", () => {
    const r = classifyMajorFusion({ majorText: null });
    expect(r.confidence).toBe(0.2);
    expect(r.vector.math).toBeGreaterThan(0); // 中性 0.3
  });

  it("能力向量参与融合（有 gpaTier/researchLevel）", () => {
    const r = classifyMajorFusion({
      majorText: "计算机",
      majorSubDirection: "cs_backend",
      targetDirection: "tech_engineering",
      grade: "junior",
      gpaTier: "top5",
      researchLevel: "paper",
    });
    expect(r.fusionSource).toContain("capability");
    // 有能力向量参与 → research 轴应比无能力时更高
    const noCap = classifyMajorFusion({
      majorText: "计算机",
      majorSubDirection: "cs_backend",
      targetDirection: "tech_engineering",
      grade: "junior",
    });
    expect(r.vector.research).toBeGreaterThanOrEqual(noCap.vector.research);
  });

  it("SUB_DIRECTION_VECTORS 覆盖 28 子方向（含 med/art/eng）", () => {
    expect(SUB_DIRECTION_VECTORS.med_clinical).toBeDefined();
    expect(SUB_DIRECTION_VECTORS.art_visual).toBeDefined();
    expect(SUB_DIRECTION_VECTORS.eng_business).toBeDefined();
    expect(SUB_DIRECTION_VECTORS.auto_embedded).toBeDefined();
  });

  it("TARGET_DIRECTION_VECTORS 覆盖 7 目标方向（含 exploration）", () => {
    expect(TARGET_DIRECTION_VECTORS.exploration).toBeDefined();
    expect(TARGET_DIRECTION_VECTORS.tech_engineering).toBeDefined();
  });

  it("FUSION_WEIGHTS 权重可审（4 个分量）", () => {
    expect(FUSION_WEIGHTS.subDirection).toBe(0.4);
    expect(FUSION_WEIGHTS.targetDirection).toBe(0.25);
    expect(FUSION_WEIGHTS.capability).toBe(0.2);
    expect(FUSION_WEIGHTS.stage).toBe(0.15);
  });
});
