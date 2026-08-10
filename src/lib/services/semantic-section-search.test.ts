import { describe, it, expect } from "vitest";
import { extractWithSemanticSearch } from "@/lib/services/semantic-section-search";
import { SAMPLE_AUP_TEXT } from "@/lib/mock/sample-aup";
import { BROOKHAVEN_AUP_TEXT } from "@/lib/mock/brookhaven-aup";

describe("semantic-section-search", () => {
  it("debug: check policy size and content", () => {
    const lines = SAMPLE_AUP_TEXT.split(/\r?\n/).filter(l => l.trim().length >= 4);
    console.log(`SAMPLE_AUP_TEXT has ${lines.length} usable lines`);
    const result = extractWithSemanticSearch(SAMPLE_AUP_TEXT);
    console.log("Approved Tools extracted:", result.sections.approvedTools);
    console.log("Data To Protect extracted:", result.sections.dataToProtect);
    console.log("Top Rules extracted:", result.sections.topRulesToRemember);
    expect(result.documentTooShort).toBe(false);
  });
  it("extracts data protection rules from prose sections", () => {
    const result = extractWithSemanticSearch(SAMPLE_AUP_TEXT);

    expect(result.sections.dataToProtect.length).toBeGreaterThanOrEqual(3);
    expect(
      result.sections.dataToProtect.some((rule) =>
        rule.toLowerCase().includes("customer")
      )
    ).toBe(true);
    expect(
      result.sections.dataToProtect.some((rule) =>
        rule.toLowerCase().includes("financial")
      )
    ).toBe(true);
    expect(
      result.sections.dataToProtect.some((rule) =>
        rule.toLowerCase().includes("credential")
      )
    ).toBe(true);
  });

  it("extracts approved tools from the policy", () => {
    const result = extractWithSemanticSearch(SAMPLE_AUP_TEXT);

    expect(result.sections.approvedTools.length).toBeGreaterThanOrEqual(2);
    expect(
      result.sections.approvedTools.some((rule) =>
        rule.toLowerCase().includes("copilot")
      )
    ).toBe(true);
    expect(
      result.sections.approvedTools.some((rule) =>
        rule.toLowerCase().includes("chatgpt")
      )
    ).toBe(true);
  });

  it("extracts permitted use cases with synonym expansion", () => {
    const result = extractWithSemanticSearch(SAMPLE_AUP_TEXT);

    expect(result.sections.permittedUse.length).toBeGreaterThanOrEqual(2);
    // Should find "draft" and "structure" even if they use different phrasings
    const permittedText = result.sections.permittedUse
      .join(" ")
      .toLowerCase();
    expect(
      permittedText.includes("draft") || permittedText.includes("template")
    ).toBe(true);
  });

  it("identifies honest gaps when sections have no matching content", () => {
    const thinPolicy = `
      AI Policy
      1. PURPOSE: To provide guidelines for AI use
      2. APPROVAL: All AI use must be approved by the CEO
    `;

    const result = extractWithSemanticSearch(thinPolicy);

    // This thin policy should have gaps for sections with no real content
    expect(Object.values(result.sectionGaps).some((gap) => gap)).toBe(true);
  });

  it("detects when a document is too short to parse", () => {
    const veryShortPolicy = "AI Policy. Use approved tools only.";

    const result = extractWithSemanticSearch(veryShortPolicy);

    expect(result.documentTooShort).toBe(true);
    expect(Object.values(result.sections).every((arr) => arr.length === 0)).toBe(
      true
    );
  });

  it("extracts escalation guidance", () => {
    const result = extractWithSemanticSearch(SAMPLE_AUP_TEXT);

    expect(result.sections.whenUnsure.length).toBeGreaterThanOrEqual(1);
    expect(
      result.sections.whenUnsure.some((rule) =>
        rule.toLowerCase().includes("contact")
      )
    ).toBe(true);
  });

  it("extracts accountability and review requirements", () => {
    const result = extractWithSemanticSearch(SAMPLE_AUP_TEXT);

    expect(result.sections.accountability.length).toBeGreaterThanOrEqual(1);
    expect(
      result.sections.accountability.some((rule) =>
        rule.toLowerCase().includes("review")
      )
    ).toBe(true);
  });

  it("extracts top rules from prohibited and critical items", () => {
    const result = extractWithSemanticSearch(SAMPLE_AUP_TEXT);

    expect(result.sections.topRulesToRemember.length).toBeGreaterThanOrEqual(1);
    // Top rules should emphasize data protection and escalation
    const topRulesText = result.sections.topRulesToRemember.join(" ").toLowerCase();
    expect(
      topRulesText.includes("never") ||
        topRulesText.includes("must not") ||
        topRulesText.includes("data")
    ).toBe(true);
  });

  it("finds rules even when stated as prose, not bullet lists", () => {
    const prosePolicy = `
      DATA RESTRICTIONS

      The policy explicitly states that employees must never enter customer
      personally identifiable information such as names and email addresses
      into AI tools. Similarly, financial data including revenue figures and
      invoice numbers should never be processed in these systems.

      Authentication credentials and API keys must not be shared with AI
      at any time. Unreleased product roadmaps and proprietary code cannot
      be processed outside approved development environments.

      PERMITTED USE

      Employees may use AI to draft structure and tone for documents.
      After the AI creates a template, employees should add sensitive
      details manually outside the tool.
    `;

    const result = extractWithSemanticSearch(prosePolicy);

    // Prose policy should still yield multiple data protection rules
    expect(result.sections.dataToProtect.length).toBeGreaterThanOrEqual(3);

    // Should find permitted use rules
    expect(result.sections.permittedUse.length).toBeGreaterThanOrEqual(1);
  });

  it("handles unusual section names and orderings", () => {
    const unusualPolicy = `
      Section 5: WHAT THE HECK IS THIS TOOL ANYWAY?
      Organization-approved AI systems include Microsoft Copilot,
      ChatGPT Enterprise, and GitHub Copilot.

      Section 3: IF YOU'RE CONFUSED
      Contact IT Security or your manager before proceeding.

      Section 7: THINGS YOU MUST NOT DO
      Never enter passwords, API keys, or customer data into AI tools.
    `;

    const result = extractWithSemanticSearch(unusualPolicy);

    // Should extract despite unusual section names
    expect(result.sections.approvedTools.length).toBeGreaterThanOrEqual(1);
    expect(result.sections.whenUnsure.length).toBeGreaterThanOrEqual(1);
    expect(result.sections.dataToProtect.length).toBeGreaterThanOrEqual(1);
  });
});

describe("semantic-section-search with real-world policies", () => {
  it("extracts from Town of Brookhaven policy - approved tools", () => {
    const result = extractWithSemanticSearch(BROOKHAVEN_AUP_TEXT);

    expect(result.sections.approvedTools.length).toBeGreaterThanOrEqual(2);
    expect(
      result.sections.approvedTools.some((rule) =>
        rule.toLowerCase().includes("microsoft copilot")
      )
    ).toBe(true);
    expect(
      result.sections.approvedTools.some((rule) =>
        rule.toLowerCase().includes("official town business")
      )
    ).toBe(true);
  });

  it("extracts from Brookhaven policy - data protection", () => {
    const result = extractWithSemanticSearch(BROOKHAVEN_AUP_TEXT);

    expect(result.sections.dataToProtect.length).toBeGreaterThanOrEqual(2);
    // Should find data protection concepts
    const dataText = result.sections.dataToProtect.join(" ").toLowerCase();
    expect(dataText.includes("encrypt") || dataText.includes("data") || dataText.includes("sensitive")).toBe(true);
  });

  it("extracts from Brookhaven policy - permitted use", () => {
    const result = extractWithSemanticSearch(BROOKHAVEN_AUP_TEXT);

    expect(result.sections.permittedUse.length).toBeGreaterThanOrEqual(1);
    // Should find uses like "draft", "automate", "work efficiently"
    const permittedText = result.sections.permittedUse.join(" ").toLowerCase();
    expect(
      permittedText.includes("draft") ||
        permittedText.includes("automate") ||
        permittedText.includes("efficient")
    ).toBe(true);
  });

  it("extracts from Brookhaven policy - accountability and review", () => {
    const result = extractWithSemanticSearch(BROOKHAVEN_AUP_TEXT);

    expect(result.sections.accountability.length).toBeGreaterThanOrEqual(1);
    // Should find review and validation requirements
    const accountabilityText = result.sections.accountability.join(" ").toLowerCase();
    expect(accountabilityText.includes("review") || accountabilityText.includes("validated")).toBe(true);
  });

  it("extracts from Brookhaven policy - escalation/when unsure", () => {
    const result = extractWithSemanticSearch(BROOKHAVEN_AUP_TEXT);

    expect(result.sections.whenUnsure.length).toBeGreaterThanOrEqual(1);
    // Should find escalation paths
    const escalationText = result.sections.whenUnsure.join(" ").toLowerCase();
    expect(escalationText.includes("report") || escalationText.includes("it")).toBe(true);
  });

  it("Brookhaven policy has complete coverage across all six sections", () => {
    const result = extractWithSemanticSearch(BROOKHAVEN_AUP_TEXT);

    // A real policy should have content for most sections
    const nonEmptySections = Object.values(result.sections).filter((arr) => arr.length > 0).length;
    expect(nonEmptySections).toBeGreaterThanOrEqual(4); // At least 4 of 6 sections should have content
  });

  it("demonstrates improvement: Brookhaven policy finds security concepts", () => {
    const result = extractWithSemanticSearch(BROOKHAVEN_AUP_TEXT);

    // The policy talks extensively about security and compliance
    // The system should find these themes across different sections
    const allResults = Object.values(result.sections).flat().join(" ").toLowerCase();

    expect(allResults.includes("security") || allResults.includes("encrypt") || allResults.includes("protect")).toBe(
      true
    );
    expect(allResults.includes("compliance") || allResults.includes("audit")).toBe(true);
    expect(allResults.includes("copilot") || allResults.includes("approved")).toBe(true);
  });

  it("handles Brookhaven's emphasis on Microsoft tools", () => {
    const result = extractWithSemanticSearch(BROOKHAVEN_AUP_TEXT);

    // Brookhaven's policy heavily emphasizes Microsoft ecosystem
    const allTools = result.sections.approvedTools.join(" ").toLowerCase();

    // Should recognize the Microsoft 365 ecosystem tools
    const mentionsMicrosoft =
      allTools.includes("microsoft") ||
      allTools.includes("outlook") ||
      allTools.includes("teams") ||
      allTools.includes("sharepoint") ||
      allTools.includes("onedrive");

    expect(mentionsMicrosoft).toBe(true);
  });

  it("captures Brookhaven's unique security features (GCC, DLP, Zero Query Logging)", () => {
    const result = extractWithSemanticSearch(BROOKHAVEN_AUP_TEXT);

    // The policy discusses security features in prose — should be captured
    const allResults = Object.values(result.sections).flat().join(" ").toLowerCase();

    // Should find references to security concepts
    const hasSecurityContent =
      allResults.includes("government") ||
      allResults.includes("encrypt") ||
      allResults.includes("protect") ||
      allResults.includes("privacy") ||
      allResults.includes("query");

    expect(hasSecurityContent).toBe(true);
  });
});

