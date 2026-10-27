import * as jsdiff from 'diff';
import type { DiffLine, ProfileDiff } from '../../types/surge.ts';

/**
 * Computes a line-by-line Diff between the original profile text and the modified draft text.
 */
export function computeProfileDiff(originalText: string, modifiedText: string): ProfileDiff {
  if (originalText === modifiedText) {
    return {
      hasChanges: false,
      diffLines: [],
      originalText,
      modifiedText,
      summary: {
        addedLines: 0,
        removedLines: 0,
        changedGroups: 0,
        changedRules: 0,
      },
    };
  }

  const changes = jsdiff.diffLines(originalText, modifiedText);
  const diffLines: DiffLine[] = [];

  let oldLineNum = 1;
  let newLineNum = 1;
  let addedCount = 0;
  let removedCount = 0;

  for (const part of changes) {
    // split part.value into individual lines
    const rawLines = part.value.split(/\r?\n/);
    // When part ends with \n, split produces an empty trailing string; omit it if empty
    if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') {
      rawLines.pop();
    }

    for (const line of rawLines) {
      if (part.added) {
        diffLines.push({
          type: 'add',
          value: line,
          newLineNumber: newLineNum++,
        });
        addedCount++;
      } else if (part.removed) {
        diffLines.push({
          type: 'remove',
          value: line,
          oldLineNumber: oldLineNum++,
        });
        removedCount++;
      } else {
        diffLines.push({
          type: 'unchanged',
          value: line,
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
        });
      }
    }
  }

  return {
    hasChanges: addedCount > 0 || removedCount > 0,
    diffLines,
    originalText,
    modifiedText,
    summary: {
      addedLines: addedCount,
      removedLines: removedCount,
      changedGroups: 0,
      changedRules: 0,
    },
  };
}
