import { describe, expect, it } from "vitest";
import { countRulesPerSection, findSparseSections } from "@/lib/services/sparse-sections";
import type { ParsedAupSections } from "@/lib/types/parsed-sections";

function sectionsWith(overrides: Partial<ParsedAupSections>): ParsedAupSections {
  return {
    topRulesToRemember: [],
    permittedUse: [],
    approvedTools: [],
    dataToProtect: [],
    accountability: [],
    whenUnsure: [],
    ...overrides,
  };
}

describe("sparse section thresholds", () => {
  it("does not flag approvedTools when only one tool (e.g. Copilot) is listed", () => {
    const sections = sectionsWith({ approvedTools: ["Microsoft Copilot is the only approved tool"] });
    const sparse = findSparseSections(countRulesPerSection(sections));
    expect(sparse).not.toContain("approvedTools");
  });

  it("still flags approvedTools when it is empty", () => {
    const sections = sectionsWith({ approvedTools: [] });
    const sparse = findSparseSections(countRulesPerSection(sections));
    expect(sparse).toContain("approvedTools");
  });

  it("still flags other sections with only one item (default threshold of 2 unchanged)", () => {
    const sections = sectionsWith({ permittedUse: ["Employees may use AI to draft emails"] });
    const sparse = findSparseSections(countRulesPerSection(sections));
    expect(sparse).toContain("permittedUse");
  });

  it("does not flag other sections once they have two or more items", () => {
    const sections = sectionsWith({
      permittedUse: ["Employees may use AI to draft emails", "Employees may use AI to summarize documents"],
    });
    const sparse = findSparseSections(countRulesPerSection(sections));
    expect(sparse).not.toContain("permittedUse");
  });
});
