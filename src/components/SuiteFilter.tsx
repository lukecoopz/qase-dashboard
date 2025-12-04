import { useState, useEffect, useRef } from 'react';
import type { SuiteTreeNode, TestCase } from '../types';
import { getAllDescendantSuiteIds } from '../services/qaseApi';

interface SuiteFilterProps {
  suiteTree: SuiteTreeNode[];
  testCases: TestCase[];
  selectedSuiteIds: Set<number>;
  onSelectionChange: (selectedIds: Set<number>) => void;
}

function SuiteTreeNodeComponent({
  node,
  depth,
  selectedSuiteIds,
  onToggle,
}: {
  node: SuiteTreeNode;
  depth: number;
  selectedSuiteIds: Set<number>;
  onToggle: (suiteId: number) => void;
}) {
  const isSelected = selectedSuiteIds.has(node.suite.id);
  const hasChildren = node.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed by default

  const handleToggle = () => {
    onToggle(node.suite.id);
  };

  const indentStyle = {
    paddingLeft: `${depth * 20}px`,
  };

  return (
    <div className="suite-tree-node">
      <div
        className={`suite-tree-item ${isSelected ? 'selected' : ''}`}
        style={indentStyle}
      >
        {hasChildren && (
          <button
            className="suite-tree-expand"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="suite-tree-spacer" />}
        <label className="suite-tree-label">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggle}
            className="suite-tree-checkbox"
          />
          <span className="suite-tree-title">
            {node.suite.title}
            {node.allDescendantTestCount > 0 && (
              <span className="suite-tree-count">
                {' '}
                ({node.allDescendantTestCount} tests)
              </span>
            )}
          </span>
        </label>
      </div>
      {hasChildren && isExpanded && (
        <div className="suite-tree-children">
          {node.children.map((child) => (
            <SuiteTreeNodeComponent
              key={child.suite.id}
              node={child}
              depth={depth + 1}
              selectedSuiteIds={selectedSuiteIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuiteFilter({
  suiteTree,
  testCases,
  selectedSuiteIds,
  onSelectionChange,
}: SuiteFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = (suiteId: number) => {
    const newSelection = new Set(selectedSuiteIds);
    const allDescendantIds = getAllDescendantSuiteIds(suiteId, suiteTree);

    if (newSelection.has(suiteId)) {
      // Deselect: remove this suite and all its descendants
      allDescendantIds.forEach((id) => newSelection.delete(id));
    } else {
      // Select: add this suite and all its descendants
      allDescendantIds.forEach((id) => newSelection.add(id));
    }

    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const allSuiteIds = new Set<number>();
    suiteTree.forEach((node) => {
      const collectIds = (n: SuiteTreeNode) => {
        allSuiteIds.add(n.suite.id);
        n.children.forEach(collectIds);
      };
      collectIds(node);
    });
    onSelectionChange(allSuiteIds);
  };

  const handleClearAll = () => {
    onSelectionChange(new Set());
  };

  const selectedCount = selectedSuiteIds.size;
  const totalTests = selectedSuiteIds.size > 0
    ? testCases.filter((tc) => selectedSuiteIds.has(tc.suite_id)).length
    : testCases.length;

  // Get selected suite names for display
  const getSelectedSuiteNames = (): string => {
    if (selectedCount === 0) return 'All Suites';
    if (selectedCount === 1) {
      const findSuiteName = (nodes: SuiteTreeNode[]): string | null => {
        for (const node of nodes) {
          if (selectedSuiteIds.has(node.suite.id)) {
            return node.suite.title;
          }
          const found = findSuiteName(node.children);
          if (found) return found;
        }
        return null;
      };
      return findSuiteName(suiteTree) || `${selectedCount} suite`;
    }
    return `${selectedCount} suites selected`;
  };

  return (
    <div className="suite-filter-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="suite-filter-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="suite-filter-trigger-label">Filter by Suite:</span>
        <span className="suite-filter-trigger-value">
          {getSelectedSuiteNames()}
          {selectedCount > 0 && (
            <span className="suite-filter-badge">{selectedCount}</span>
          )}
        </span>
        <span className="suite-filter-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="suite-filter-dropdown-panel">
          <div className="suite-filter-dropdown-header">
            <div className="suite-filter-dropdown-title">Select Suites</div>
            <div className="suite-filter-dropdown-actions">
              <button
                type="button"
                onClick={handleSelectAll}
                className="suite-filter-dropdown-btn"
              >
                All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="suite-filter-dropdown-btn"
              >
                Clear
              </button>
            </div>
          </div>
          {totalTests > 0 && (
            <div className="suite-filter-dropdown-info">
              {totalTests} test{totalTests !== 1 ? 's' : ''} selected
            </div>
          )}
          <div className="suite-filter-dropdown-tree">
            {suiteTree.length === 0 ? (
              <div className="suite-filter-empty">No suites available</div>
            ) : (
              suiteTree.map((node) => (
                <SuiteTreeNodeComponent
                  key={node.suite.id}
                  node={node}
                  depth={0}
                  selectedSuiteIds={selectedSuiteIds}
                  onToggle={handleToggle}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

