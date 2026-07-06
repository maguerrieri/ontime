import { Playback, TimerPhase } from 'ontime-types';

import { canAddTimeInState, getPlaybackControlState } from '../playbackControl.utils';

describe('canAddTimeInState()', () => {
  test('allows add-time when playing or paused', () => {
    expect(canAddTimeInState(Playback.Play, TimerPhase.Default)).toBe(true);
    expect(canAddTimeInState(Playback.Pause, TimerPhase.Default)).toBe(true);
  });

  test('allows add-time in Roll while an event is actively running', () => {
    expect(canAddTimeInState(Playback.Roll, TimerPhase.Default)).toBe(true);
    expect(canAddTimeInState(Playback.Roll, TimerPhase.Overtime)).toBe(true);
    expect(canAddTimeInState(Playback.Roll, TimerPhase.Warning)).toBe(true);
  });

  test('blocks add-time while waiting to roll (Pending)', () => {
    expect(canAddTimeInState(Playback.Roll, TimerPhase.Pending)).toBe(false);
  });

  test('blocks add-time when stopped or armed', () => {
    expect(canAddTimeInState(Playback.Stop, TimerPhase.None)).toBe(false);
    expect(canAddTimeInState(Playback.Armed, TimerPhase.Default)).toBe(false);
  });
});

describe('getPlaybackControlState() disableAddTime', () => {
  const base = { numEvents: 3, selectedEventIndex: 1 };

  test('enabled in running Roll, disabled while pending', () => {
    expect(
      getPlaybackControlState({ ...base, playback: Playback.Roll, timerPhase: TimerPhase.Default }).disableAddTime,
    ).toBe(false);
    expect(
      getPlaybackControlState({ ...base, playback: Playback.Roll, timerPhase: TimerPhase.Pending }).disableAddTime,
    ).toBe(true);
  });

  test('disabled when stopped', () => {
    expect(
      getPlaybackControlState({ ...base, playback: Playback.Stop, timerPhase: TimerPhase.None }).disableAddTime,
    ).toBe(true);
  });
});
