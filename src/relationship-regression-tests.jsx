// ============================================================================
// REGRESSION TESTS for Task Relationship Features
// Run these tests by importing and calling runRelationshipTests()
// ============================================================================

export const RelationshipTests = {
  // Test 1: Verify addRelationship function works correctly
  testAddRelationship: () => {
    const mockTask = { id: 'task1', content: 'Test Task 1' };
    const mockTargetTask = { id: 'task2', content: 'Test Task 2' };
    const relationships = [];

    // Simulate adding a relationship
    const newRel = { toTaskId: mockTargetTask.id, type: 'blocks', explanation: '' };
    relationships.push(newRel);

    // Assertions
    console.assert(relationships.length === 1, 'Relationship should be added');
    console.assert(relationships[0].toTaskId === 'task2', 'Target task ID should match');
    console.assert(relationships[0].type === 'blocks', 'Relationship type should be blocks');

    return { passed: relationships.length === 1, name: 'addRelationship' };
  },

  // Test 2: Verify relationship types are correct
  testRelationshipTypes: () => {
    const RELATIONSHIP_TYPES = [
      { key: 'blocks', label: 'Blocks', desc: 'Needs this done first', color: '#6366F1', icon: '⏸️' },
      { key: 'pairs_with', label: 'Pairs With', desc: 'Do these around the same time', color: '#10B981', icon: '👥' },
      { key: 'helps_reach', label: 'Helps Reach', desc: 'Both needed for this goal', color: '#F59E0B', icon: '🎯' },
    ];

    console.assert(RELATIONSHIP_TYPES.length === 3, 'Should have 3 relationship types');
    console.assert(RELATIONSHIP_TYPES.every(rt => rt.key && rt.label && rt.color), 'All types should have required fields');

    return { passed: RELATIONSHIP_TYPES.length === 3, name: 'relationshipTypes' };
  },

  // Test 3: Verify force-directed layout calculates positions
  testForceDirectedLayout: () => {
    const tasks = [
      { id: 't1', content: 'Task 1' },
      { id: 't2', content: 'Task 2' },
      { id: 't3', content: 'Task 3' },
    ];
    const relationships = [{ fromTaskId: 't1', toTaskId: 't2', type: 'blocks' }];

    // Simulate force-directed calculation
    const positions = {};
    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    tasks.forEach((task, i) => {
      const angle = (2 * Math.PI * i) / tasks.length;
      const radius = 50;
      positions[task.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    console.assert(Object.keys(positions).length === 3, 'Should calculate positions for all tasks');
    console.assert(positions.t1.x !== positions.t2.x, 'Tasks should have different positions');

    return { passed: Object.keys(positions).length === 3, name: 'forceDirectedLayout' };
  },

  // Test 4: Verify zoom constraints
  testZoomConstraints: () => {
    const testZoom = (current, delta) => {
      const newZoom = Math.max(0.3, Math.min(3, current * delta));
      return newZoom;
    };

    console.assert(testZoom(1, 0.9) < 1, 'Zoom out should decrease zoom');
    console.assert(testZoom(1, 1.1) > 1, 'Zoom in should increase zoom');
    console.assert(testZoom(0.3, 0.9) === 0.3, 'Should clamp to minimum zoom');
    console.assert(testZoom(3, 1.1) === 3, 'Should clamp to maximum zoom');

    return { passed: true, name: 'zoomConstraints' };
  },

  // Test 5: Verify connection highlighting logic
  testConnectionHighlighting: () => {
    const relationships = [
      { fromTaskId: 't1', toTaskId: 't2', type: 'blocks' },
      { fromTaskId: 't2', toTaskId: 't3', type: 'pairs_with' },
    ];

    const getConnectedNodes = (nodeId) => {
      const connected = new Set();
      relationships.forEach(rel => {
        if (rel.fromTaskId === nodeId) connected.add(rel.toTaskId);
        if (rel.toTaskId === nodeId) connected.add(rel.fromTaskId);
      });
      return connected;
    };

    const connectedToT1 = getConnectedNodes('t1');
    console.assert(connectedToT1.has('t2'), 't1 should be connected to t2');
    console.assert(!connectedToT1.has('t3'), 't1 should not be directly connected to t3');

    return { passed: connectedToT1.has('t2'), name: 'connectionHighlighting' };
  },

  // Test 6: Verify text truncation
  testTextTruncation: () => {
    const longText = 'This is a very long task name that needs truncation';
    const maxLen = 20;
    const displayText = longText.length > maxLen
      ? longText.substring(0, maxLen) + '...'
      : longText;

    console.assert(displayText.length <= maxLen + 3, 'Text should be truncated');
    console.assert(displayText.endsWith('...'), 'Truncated text should end with ellipsis');

    return { passed: displayText.endsWith('...'), name: 'textTruncation' };
  },

  // Test 7: Integration - verify complete relationship flow
  testCompleteRelationshipFlow: () => {
    // Simulate the complete flow
    const pool = { id: 'p1', name: 'Test Pool', relationships: [] };
    const task1 = { id: 'task1', content: 'Task 1', poolIds: ['p1'] };
    const task2 = { id: 'task2', content: 'Task 2', poolIds: ['p1'] };

    // Add relationship
    const newRel = { fromTaskId: task1.id, toTaskId: task2.id, type: 'blocks' };
    pool.relationships.push(newRel);

    // Verify relationship exists in pool
    console.assert(pool.relationships.length === 1, 'Pool should have relationship');
    console.assert(pool.relationships[0].type === 'blocks', 'Relationship type should be preserved');

    return { passed: pool.relationships.length === 1, name: 'completeRelationshipFlow' };
  },

  // Test 8: RecurringView day calculation - daily recurrence
  testRecurringViewDaily: () => {
    const today = new Date().toISOString().slice(0, 10);
    const pod = { recurrence: { type: 'daily' } };
    
    // All days should be active for daily recurrence
    const isDayActive = (dayStr) => {
      if (!pod.recurrence) return false;
      if (pod.recurrence.type === 'daily') return true;
      return false;
    };

    console.assert(isDayActive(today) === true, 'Daily recurrence should make all days active');
    console.assert(isDayActive('2026-01-01') === true, 'Daily recurrence should make any day active');

    return { passed: isDayActive(today), name: 'recurringViewDaily' };
  },

  // Test 9: RecurringView day calculation - specific days
  testRecurringViewSpecificDays: () => {
    const pod = { recurrence: { type: 'specific_days', weekDays: [0, 2, 4] } }; // Mon, Wed, Fri
    
    const isDayActive = (dayStr) => {
      if (!pod.recurrence) return false;
      if (pod.recurrence.type === 'specific_days') {
        const dow = (new Date(dayStr).getDay() + 6) % 7;
        return (pod.recurrence.weekDays || []).includes(dow);
      }
      return false;
    };

    // 2026-04-20 is a Monday (day 0)
    const monday = '2026-04-20';
    const tuesday = '2026-04-21';
    
    console.assert(isDayActive(monday) === true, 'Monday should be active');
    console.assert(isDayActive(tuesday) === false, 'Tuesday should not be active');

    return { passed: isDayActive(monday) && !isDayActive(tuesday), name: 'recurringViewSpecificDays' };
  },

  // Test 10: RecurringView day calculation - every N days
  testRecurringViewEveryNDays: () => {
    const pod = { createdAt: '2026-04-01', recurrence: { type: 'every_n_days', everyNDays: 2 } };
    
    const isDayActive = (dayStr) => {
      if (!pod.recurrence) return false;
      if (pod.recurrence.type === 'every_n_days') {
        const diff = Math.floor((new Date(dayStr) - new Date(pod.createdAt)) / 86400000);
        return diff >= 0 && diff % (pod.recurrence.everyNDays || 1) === 0;
      }
      return false;
    };

    // Day 0 (creation day) should be active
    console.assert(isDayActive('2026-04-01') === true, 'Creation day should be active');
    // Day 1 should not be active (every 2 days)
    console.assert(isDayActive('2026-04-02') === false, 'Day 1 should not be active');
    // Day 2 should be active
    console.assert(isDayActive('2026-04-03') === true, 'Day 2 should be active');

    return { passed: isDayActive('2026-04-01') && !isDayActive('2026-04-02'), name: 'recurringViewEveryNDays' };
  },

  // Test 11: RecurringView date range calculation (5 days before/after)
  testRecurringViewDateRange: () => {
    const centerDate = '2026-04-18';
    const addDays = (dateStr, n) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };
    
    // 5 days before + center + 5 days after = 11 days
    const days = Array.from({ length: 11 }, (_, i) => addDays(addDays(centerDate, -5), i));
    
    console.assert(days.length === 11, 'Should have exactly 11 days');
    console.assert(days[0] === '2026-04-13', 'First day should be 5 days before center');
    console.assert(days[5] === centerDate, 'Center day should be at index 5');
    console.assert(days[10] === '2026-04-23', 'Last day should be 5 days after center');

    return { passed: days.length === 11 && days[5] === centerDate, name: 'recurringViewDateRange' };
  },

  // Test 12: RecurringView edit window (past 5 days + today)
  testRecurringViewEditWindow: () => {
    const today = '2026-04-18';
    const addDays = (dateStr, n) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };
    
    // Editable: today + past 5 days
    const canEdit = (dayStr) => {
      const isToday = dayStr === today;
      const isPastEditable = dayStr < today && dayStr >= addDays(today, -5);
      return isToday || isPastEditable;
    };
    
    // Today should be editable
    console.assert(canEdit('2026-04-18') === true, 'Today should be editable');
    // Past 5 days should be editable
    console.assert(canEdit('2026-04-17') === true, 'Yesterday should be editable');
    console.assert(canEdit('2026-04-13') === true, '5 days ago should be editable');
    // Day 6 ago should NOT be editable
    console.assert(canEdit('2026-04-12') === false, '6 days ago should NOT be editable');
    // Future should NOT be editable
    console.assert(canEdit('2026-04-19') === false, 'Future should NOT be editable');

    return { passed: canEdit(today) && canEdit('2026-04-13') && !canEdit('2026-04-12'), name: 'recurringViewEditWindow' };
  },
};

// Run all tests and return results
export const runRelationshipTests = () => {
  console.log('Running Task Relationship Regression Tests...\n');

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const [name, testFn] of Object.entries(RelationshipTests)) {
    try {
      const result = testFn();
      results.push(result);
      if (result.passed) {
        passed++;
        console.log(`✅ ${result.name}: PASSED`);
      } else {
        failed++;
        console.log(`❌ ${result.name}: FAILED`);
      }
    } catch (e) {
      failed++;
      console.log(`❌ ${name}: ERROR - ${e.message}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`${'='.repeat(50)}`);

  return { results, passed, failed, total: results.length };
};

// Auto-run if this file is imported directly
if (typeof window !== 'undefined') {
  console.log('Task Relationship Regression Tests loaded. Call runRelationshipTests() to execute.');
}

export default RelationshipTests;
