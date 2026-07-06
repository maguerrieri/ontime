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
