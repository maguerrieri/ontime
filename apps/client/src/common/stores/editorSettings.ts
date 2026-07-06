import { EndAction, TimeStrategy, TimerType } from 'ontime-types';
import { validateEndAction, validateTimeStrategy, validateTimerType } from 'ontime-utils';
import { create } from 'zustand';

import { parseAddTimePresets, sanitizeAddTimePresets, serializeAddTimePresets } from '../utils/addTimePresets';
import { booleanFromLocalStorage } from '../utils/localStorage';

type EditorSettingsStore = {
  defaultDuration: string;
  linkPrevious: boolean;
  defaultTimeStrategy: TimeStrategy;
  defaultWarnTime: string;
  defaultDangerTime: string;
  defaultTimerType: TimerType;
  defaultEndAction: EndAction;
  inheritGroupColour: boolean;
  showScheduledEnd: boolean;
  addTimePresets: number[];
  showAddTimeInput: boolean;
  setDefaultDuration: (defaultDuration: string) => void;
  setLinkPrevious: (linkPrevious: boolean) => void;
  setInheritGroupColour: (inheritGroupColour: boolean) => void;
  setTimeStrategy: (timeStrategy: TimeStrategy) => void;
  setWarnTime: (warnTime: string) => void;
  setDangerTime: (dangerTime: string) => void;
  setDefaultTimerType: (defaultTimerType: TimerType) => void;
  setDefaultEndAction: (defaultEndAction: EndAction) => void;
  setShowScheduledEnd: (showScheduledEnd: boolean) => void;
  setAddTimePresets: (addTimePresets: number[]) => void;
  setShowAddTimeInput: (showAddTimeInput: boolean) => void;
};

export const editorSettingsDefaults = {
  duration: '00:10:00',
  linkPrevious: true,
  timeStrategy: TimeStrategy.LockDuration,
  warnTime: '00:02:00', // 120000 same as backend
  dangerTime: '00:01:00', // 60000 same as backend
  timerType: TimerType.CountDown,
  endAction: EndAction.None,
  inheritGroupColour: false,
  showScheduledEnd: false,
  addTimePresets: [60_000, 300_000], // 1 min and 5 min
  showAddTimeInput: true,
};

enum EditorSettingsKeys {
  DefaultDuration = 'ontime-default-duration',
  LinkPrevious = 'ontime-link-previous',
  DefaultTimeStrategy = 'ontime-time-strategy',
  DefaultWarnTime = 'ontime-default-warn-time',
  DefaultDangerTime = 'ontime-default-danger-time',
  DefaultTimerType = 'ontime-default-timer-type',
  DefaultEndAction = 'ontime-default-end-action',
  InheritGroupColour = 'ontime-inherit-group-colour',
  ShowScheduledEnd = 'ontime-show-scheduled-end',
  AddTimePresets = 'ontime-add-time-presets',
  ShowAddTimeInput = 'ontime-show-add-time-input',
}

export const useEditorSettings = create<EditorSettingsStore>((set) => {
  return {
    defaultDuration: localStorage.getItem(EditorSettingsKeys.DefaultDuration) ?? editorSettingsDefaults.duration,
    linkPrevious: booleanFromLocalStorage(EditorSettingsKeys.LinkPrevious, editorSettingsDefaults.linkPrevious),
    defaultTimeStrategy: validateTimeStrategy(
      localStorage.getItem(EditorSettingsKeys.DefaultTimeStrategy),
      editorSettingsDefaults.timeStrategy,
    ),
    defaultWarnTime: localStorage.getItem(EditorSettingsKeys.DefaultWarnTime) ?? editorSettingsDefaults.warnTime,
    defaultDangerTime: localStorage.getItem(EditorSettingsKeys.DefaultDangerTime) ?? editorSettingsDefaults.dangerTime,
    defaultTimerType: validateTimerType(
      localStorage.getItem(EditorSettingsKeys.DefaultTimerType),
      editorSettingsDefaults.timerType,
    ),
    defaultEndAction: validateEndAction(
      localStorage.getItem(EditorSettingsKeys.DefaultEndAction),
      editorSettingsDefaults.endAction,
    ),
    inheritGroupColour: booleanFromLocalStorage(
      EditorSettingsKeys.InheritGroupColour,
      editorSettingsDefaults.inheritGroupColour,
    ),
    showScheduledEnd: booleanFromLocalStorage(
      EditorSettingsKeys.ShowScheduledEnd,
      editorSettingsDefaults.showScheduledEnd,
    ),
    addTimePresets: parseAddTimePresets(
      localStorage.getItem(EditorSettingsKeys.AddTimePresets),
      editorSettingsDefaults.addTimePresets,
    ),
    showAddTimeInput: booleanFromLocalStorage(
      EditorSettingsKeys.ShowAddTimeInput,
      editorSettingsDefaults.showAddTimeInput,
    ),

    setDefaultDuration: (defaultDuration) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.DefaultDuration, String(defaultDuration));
        return { defaultDuration };
      }),

    setLinkPrevious: (linkPrevious) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.LinkPrevious, String(linkPrevious));
        return { linkPrevious };
      }),
    setTimeStrategy: (defaultTimeStrategy) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.DefaultTimeStrategy, String(defaultTimeStrategy));
        return { defaultTimeStrategy };
      }),

    setWarnTime: (defaultWarnTime) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.DefaultWarnTime, String(defaultWarnTime));
        return { defaultWarnTime };
      }),
    setDangerTime: (defaultDangerTime) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.DefaultDangerTime, String(defaultDangerTime));
        return { defaultDangerTime };
      }),
    setDefaultTimerType: (defaultTimerType) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.DefaultTimerType, String(defaultTimerType));
        return { defaultTimerType };
      }),
    setDefaultEndAction: (defaultEndAction) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.DefaultEndAction, String(defaultEndAction));
        return { defaultEndAction };
      }),
    setInheritGroupColour: (inheritGroupColour) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.InheritGroupColour, String(inheritGroupColour));
        return { inheritGroupColour };
      }),
    setShowScheduledEnd: (showScheduledEnd) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.ShowScheduledEnd, String(showScheduledEnd));
        return { showScheduledEnd };
      }),
    setAddTimePresets: (addTimePresets) =>
      set(() => {
        const sanitized = sanitizeAddTimePresets(addTimePresets);
        localStorage.setItem(EditorSettingsKeys.AddTimePresets, serializeAddTimePresets(sanitized));
        return { addTimePresets: sanitized };
      }),
    setShowAddTimeInput: (showAddTimeInput) =>
      set(() => {
        localStorage.setItem(EditorSettingsKeys.ShowAddTimeInput, String(showAddTimeInput));
        return { showAddTimeInput };
      }),
  };
});
