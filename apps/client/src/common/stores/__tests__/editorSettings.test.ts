import { useEditorSettings } from '../editorSettings';

describe('editorSettings showScheduledEnd', () => {
  beforeEach(() => {
    localStorage.clear();
    useEditorSettings.setState({ showScheduledEnd: false });
  });

  test('exposes the flag and defaults to a boolean', () => {
    expect(typeof useEditorSettings.getState().showScheduledEnd).toBe('boolean');
  });

  test('setter updates state and persists to localStorage', () => {
    useEditorSettings.getState().setShowScheduledEnd(true);
    expect(useEditorSettings.getState().showScheduledEnd).toBe(true);
    expect(localStorage.getItem('ontime-show-scheduled-end')).toBe('true');

    useEditorSettings.getState().setShowScheduledEnd(false);
    expect(useEditorSettings.getState().showScheduledEnd).toBe(false);
    expect(localStorage.getItem('ontime-show-scheduled-end')).toBe('false');
  });
});

describe('editorSettings addTimePresets', () => {
  beforeEach(() => {
    localStorage.clear();
    useEditorSettings.setState({ addTimePresets: [60_000, 300_000] });
  });

  test('exposes an array of preset magnitudes', () => {
    expect(Array.isArray(useEditorSettings.getState().addTimePresets)).toBe(true);
  });

  test('setter sanitises, updates state, and persists as JSON', () => {
    useEditorSettings.getState().setAddTimePresets([60_000, 0, -5_000, 300_000]);
    // 0 dropped, negative folded to its magnitude
    expect(useEditorSettings.getState().addTimePresets).toEqual([60_000, 5_000, 300_000]);
    expect(localStorage.getItem('ontime-add-time-presets')).toBe('[60000,5000,300000]');
  });

  test('setter caps the number of presets at three', () => {
    useEditorSettings.getState().setAddTimePresets([1_000, 2_000, 3_000, 4_000]);
    expect(useEditorSettings.getState().addTimePresets).toEqual([1_000, 2_000, 3_000]);
  });
});

describe('editorSettings showAddTimeInput', () => {
  beforeEach(() => {
    localStorage.clear();
    useEditorSettings.setState({ showAddTimeInput: true });
  });

  test('setter updates state and persists to localStorage', () => {
    useEditorSettings.getState().setShowAddTimeInput(false);
    expect(useEditorSettings.getState().showAddTimeInput).toBe(false);
    expect(localStorage.getItem('ontime-show-add-time-input')).toBe('false');

    useEditorSettings.getState().setShowAddTimeInput(true);
    expect(useEditorSettings.getState().showAddTimeInput).toBe(true);
    expect(localStorage.getItem('ontime-show-add-time-input')).toBe('true');
  });
});
