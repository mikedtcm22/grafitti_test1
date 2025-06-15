import { TestCase, TestResult } from './test-utils';

export interface TestDocumentation {
  testId: string;
  purpose: string;
  site: string;
  priority: 'high' | 'medium' | 'low';
  testData: {
    htmlStructure: string;
    expectedBehavior: string;
    successCriteria: string[];
  };
  implementationNotes: {
    setupRequirements: string[];
    knownLimitations: string[];
    relatedTests: string[];
  };
}

export const generateTestDocumentation = (testCase: TestCase): TestDocumentation => {
  return {
    testId: testCase.name.toLowerCase().replace(/\s+/g, '-'),
    purpose: testCase.description,
    site: testCase.context.site,
    priority: 'medium', // Default priority
    testData: {
      htmlStructure: testCase.html,
      expectedBehavior: testCase.interactions.expectedBehavior,
      successCriteria: [
        `Detect exactly ${testCase.expectedPrices.length} price(s)`,
        `Match expected prices: ${testCase.expectedPrices.join(', ')}`,
        `Handle interaction at: ${testCase.interactions.clickTarget}`
      ]
    },
    implementationNotes: {
      setupRequirements: [],
      knownLimitations: [],
      relatedTests: []
    }
  };
};

export const generateMarkdownDocumentation = (doc: TestDocumentation): string => {
  return `
# Test Case Documentation

## Overview
- Test ID: ${doc.testId}
- Purpose: ${doc.purpose}
- Site: ${doc.site}
- Priority: ${doc.priority}

## Test Data
- HTML Structure:
\`\`\`html
${doc.testData.htmlStructure}
\`\`\`
- Expected Behavior: ${doc.testData.expectedBehavior}
- Success Criteria:
${doc.testData.successCriteria.map(c => `  - ${c}`).join('\n')}

## Implementation Notes
- Setup Requirements:
${doc.implementationNotes.setupRequirements.map(r => `  - ${r}`).join('\n')}
- Known Limitations:
${doc.implementationNotes.knownLimitations.map(l => `  - ${l}`).join('\n')}
- Related Tests:
${doc.implementationNotes.relatedTests.map(t => `  - ${t}`).join('\n')}
`;
};

export const updateTestDocumentation = (
  doc: TestDocumentation,
  updates: Partial<TestDocumentation>
): TestDocumentation => {
  return {
    ...doc,
    ...updates,
    testData: {
      ...doc.testData,
      ...(updates.testData || {})
    },
    implementationNotes: {
      ...doc.implementationNotes,
      ...(updates.implementationNotes || {})
    }
  };
};

export const validateTestDocumentation = (doc: TestDocumentation): boolean => {
  const requiredFields = [
    'testId',
    'purpose',
    'site',
    'priority',
    'testData',
    'implementationNotes'
  ];
  
  const requiredTestDataFields = [
    'htmlStructure',
    'expectedBehavior',
    'successCriteria'
  ];
  
  const requiredImplementationNotesFields = [
    'setupRequirements',
    'knownLimitations',
    'relatedTests'
  ];
  
  return (
    requiredFields.every(field => field in doc) &&
    requiredTestDataFields.every(field => field in doc.testData) &&
    requiredImplementationNotesFields.every(field => field in doc.implementationNotes)
  );
}; 