import { useState, useEffect, useMemo } from 'react';
import type { TestCase, TestCaseDetail, SuiteTreeNode } from '../types';
import { getTestCaseDetail } from '../services/qaseApi';
import './TestCaseList.css';

interface TestCaseListProps {
  testCases: TestCase[];
  suiteTree: SuiteTreeNode[];
}

export default function TestCaseList({ testCases, suiteTree }: TestCaseListProps) {
  const [expandedCases, setExpandedCases] = useState<Set<number>>(new Set());
  const [expandedSuites, setExpandedSuites] = useState<Set<number>>(new Set());
  const [caseDetails, setCaseDetails] = useState<Map<number, TestCaseDetail>>(new Map());
  const [loadingCases, setLoadingCases] = useState<Set<number>>(new Set());

  // Create a map of test cases by suite_id for quick lookup
  const testCasesBySuiteId = useMemo(() => {
    const grouped = new Map<number, TestCase[]>();
    testCases.forEach(testCase => {
      const suiteId = testCase.suite_id;
      if (!grouped.has(suiteId)) {
        grouped.set(suiteId, []);
      }
      grouped.get(suiteId)!.push(testCase);
    });
    return grouped;
  }, [testCases]);

  const toggleSuite = (suiteId: number) => {
    const newExpanded = new Set(expandedSuites);
    if (newExpanded.has(suiteId)) {
      newExpanded.delete(suiteId);
    } else {
      newExpanded.add(suiteId);
    }
    setExpandedSuites(newExpanded);
  };

  const toggleCase = async (caseId: number) => {
    const newExpanded = new Set(expandedCases);
    
    if (newExpanded.has(caseId)) {
      newExpanded.delete(caseId);
    } else {
      newExpanded.add(caseId);
      
      // Fetch details if not already loaded
      if (!caseDetails.has(caseId)) {
        setLoadingCases(prev => new Set(prev).add(caseId));
        const detail = await getTestCaseDetail(caseId);
        if (detail) {
          setCaseDetails(prev => new Map(prev).set(caseId, detail));
        }
        setLoadingCases(prev => {
          const next = new Set(prev);
          next.delete(caseId);
          return next;
        });
      }
    }
    
    setExpandedCases(newExpanded);
  };

  // Recursive component to render suite tree
  const renderSuiteNode = (node: SuiteTreeNode, depth: number = 0) => {
    const isExpanded = expandedSuites.has(node.suite.id);
    const suiteTestCases = testCasesBySuiteId.get(node.suite.id) || [];
    const hasChildren = node.children.length > 0;
    const hasTestCases = suiteTestCases.length > 0;
    const shouldShow = hasChildren || hasTestCases;

    if (!shouldShow) return null;

    return (
      <div key={node.suite.id} className="test-case-suite-group">
        <div 
          className="test-case-suite-header"
          onClick={() => toggleSuite(node.suite.id)}
          style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
        >
          <span className="test-case-suite-expand-icon">
            {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
          </span>
          <span className="test-case-suite-title">
            {node.suite.title}
          </span>
          <span className="test-case-suite-count">
            {node.allDescendantTestCount > 0 ? node.allDescendantTestCount : suiteTestCases.length}
          </span>
        </div>
        
        {isExpanded && (
          <div className="test-case-suite-content">
            {/* Render child suites first */}
            {node.children.map(child => renderSuiteNode(child, depth + 1))}
            
            {/* Then render test cases for this suite */}
            {suiteTestCases.map((testCase) => {
              const isExpanded = expandedCases.has(testCase.id);
              const detail = caseDetails.get(testCase.id);
              const isLoading = loadingCases.has(testCase.id);
              const hasSteps = detail?.steps && detail.steps.length > 0;

              return (
                <div key={testCase.id} className="test-case-item">
                  <div
                    className={`test-case-header ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleCase(testCase.id)}
                  >
                    <span className="test-case-expand-icon">
                      {hasSteps || isLoading ? (isExpanded ? '▼' : '▶') : '•'}
                    </span>
                    <span className="test-case-title">{testCase.title}</span>
                    <span className="test-case-badges">
                      {testCase.automation === 2 && (
                        <span className="test-case-badge automated">Automated</span>
                      )}
                      {testCase.automation !== 2 && (
                        <span className="test-case-badge manual">Manual</span>
                      )}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="test-case-details">
                      {isLoading ? (
                        <div className="test-case-loading">Loading details...</div>
                      ) : detail ? (
                        <>
                          {detail.description && (
                            <div className="test-case-section">
                              <h4 className="test-case-section-title">Description</h4>
                              <div className="test-case-section-content">
                                {detail.description}
                              </div>
                            </div>
                          )}
                          {detail.preconditions && (
                            <div className="test-case-section">
                              <h4 className="test-case-section-title">Preconditions</h4>
                              <div className="test-case-section-content">
                                {detail.preconditions}
                              </div>
                            </div>
                          )}
                          {hasSteps && (
                            <div className="test-case-section">
                              <h4 className="test-case-section-title">Steps</h4>
                              <div className="test-case-steps">
                                {detail.steps!.map((step, index) => {
                                  const isGherkin = (text: string) => {
                                    const gherkinKeywords = ['Given', 'When', 'Then', 'And', 'But'];
                                    return gherkinKeywords.some(keyword => 
                                      text.trim().startsWith(keyword + ' ') || 
                                      text.trim().startsWith(keyword.toLowerCase() + ' ')
                                    );
                                  };
                                  
                                  // Parse text to find all Gherkin keywords and split accordingly
                                  const parseGherkinText = (text: string) => {
                                    if (!text) return [];
                                    
                                    const parts: Array<{ keyword: string; text: string }> = [];
                                    
                                    // Normalize line endings
                                    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                                    
                                    // Find all keyword positions first (safer approach)
                                    const keywordPattern = /\b(Given|When|Then|And|But)\s+/gi;
                                    const matches: Array<{ index: number; keyword: string; length: number }> = [];
                                    
                                    let match;
                                    // Use a new regex instance each time to avoid state issues
                                    const regex = new RegExp(keywordPattern.source, keywordPattern.flags);
                                    while ((match = regex.exec(normalizedText)) !== null) {
                                      // Prevent infinite loop by checking if we're stuck
                                      if (matches.length > 0 && match.index === matches[matches.length - 1].index) {
                                        break;
                                      }
                                      
                                      matches.push({
                                        index: match.index,
                                        keyword: match[1],
                                        length: match[0].length
                                      });
                                      
                                      // Safety limit to prevent infinite loops
                                      if (matches.length > 100) {
                                        break;
                                      }
                                    }
                                    
                                    // Process matches to extract text between keywords
                                    for (let i = 0; i < matches.length; i++) {
                                      const currentMatch = matches[i];
                                      const keywordStart = currentMatch.index + currentMatch.length;
                                      const keywordEnd = i < matches.length - 1 
                                        ? matches[i + 1].index 
                                        : normalizedText.length;
                                      
                                      const stepText = normalizedText.substring(keywordStart, keywordEnd)
                                        .trim()
                                        .replace(/\n+/g, ' ')
                                        .replace(/\s+/g, ' ');
                                      
                                      if (stepText) {
                                        parts.push({
                                          keyword: currentMatch.keyword,
                                          text: stepText
                                        });
                                      }
                                    }
                                    
                                    return parts;
                                  };
                                  
                                  const actionIsGherkin = step.action && isGherkin(step.action);
                                  const expectedIsGherkin = step.expected_result && isGherkin(step.expected_result);
                                  const isGherkinFormat = actionIsGherkin || expectedIsGherkin;
                                  
                                  if (isGherkinFormat) {
                                    // Gherkin format - parse and display all keywords
                                    const actionParts = step.action ? parseGherkinText(step.action) : [];
                                    const expectedParts = step.expected_result ? parseGherkinText(step.expected_result) : [];
                                    const allParts = [...actionParts, ...expectedParts];
                                    
                                    return (
                                      <div key={index} className="test-case-step test-case-step-gherkin">
                                        {allParts.length > 0 ? (
                                          allParts.map((part, partIndex) => (
                                            <div key={partIndex} className="test-case-gherkin-step">
                                              <span 
                                                className="test-case-gherkin-keyword"
                                                data-keyword={part.keyword}
                                              >
                                                {part.keyword}
                                              </span>
                                              <span className="test-case-gherkin-text">
                                                {part.text}
                                              </span>
                                            </div>
                                          ))
                                        ) : (
                                          // Fallback if parsing didn't work
                                          <>
                                            {step.action && (
                                              <div className="test-case-gherkin-step">
                                                <span className="test-case-gherkin-text">
                                                  {step.action}
                                                </span>
                                              </div>
                                            )}
                                            {step.expected_result && (
                                              <div className="test-case-gherkin-step">
                                                <span className="test-case-gherkin-text">
                                                  {step.expected_result}
                                                </span>
                                              </div>
                                            )}
                                          </>
                                        )}
                                        {step.data && (
                                          <div className="test-case-step-data">
                                            <strong>Data:</strong> {step.data}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    // Classic format - display as before
                                    return (
                                      <div key={index} className="test-case-step">
                                        <div className="test-case-step-number">{step.position || index + 1}</div>
                                        <div className="test-case-step-content">
                                          <div className="test-case-step-action">
                                            <strong>Action:</strong> {step.action}
                                          </div>
                                          {step.expected_result && (
                                            <div className="test-case-step-expected">
                                              <strong>Expected:</strong> {step.expected_result}
                                            </div>
                                          )}
                                          {step.data && (
                                            <div className="test-case-step-data">
                                              <strong>Data:</strong> {step.data}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            </div>
                          )}
                          {detail.postconditions && (
                            <div className="test-case-section">
                              <h4 className="test-case-section-title">Postconditions</h4>
                              <div className="test-case-section-content">
                                {detail.postconditions}
                              </div>
                            </div>
                          )}
                          {!hasSteps && !detail.description && !detail.preconditions && (
                            <div className="test-case-no-details">No additional details available</div>
                          )}
                        </>
                      ) : (
                        <div className="test-case-error">Failed to load details</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="test-case-list">
      <h2 className="test-case-list-title">Test Cases ({testCases.length})</h2>
      <div className="test-case-items">
        {testCases.length === 0 ? (
          <div className="test-case-empty">No test cases found</div>
        ) : suiteTree.length === 0 ? (
          <div className="test-case-empty">No suites available</div>
        ) : (
          suiteTree.map((node) => renderSuiteNode(node, 0))
        )}
      </div>
    </div>
  );
}
