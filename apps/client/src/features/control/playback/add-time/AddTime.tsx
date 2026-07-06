import { useLocalStorage } from '@mantine/hooks';
import { Playback, TimerPhase } from 'ontime-types';
import { MILLIS_PER_HOUR, parseUserTime } from 'ontime-utils';
import { IoAdd, IoRemove } from 'react-icons/io5';

import TimeInput from '../../../../common/components/input/time-input/TimeInput';
import { setPlayback } from '../../../../common/hooks/useSocket';
import { useEditorSettings } from '../../../../common/stores/editorSettings';
import { formatDuration } from '../../../../common/utils/time';
import { canAddTimeInState } from '../playbackControl.utils';
import TapButton from '../tap-button/TapButton';

import style from './AddTime.module.scss';

interface AddTimeProps {
  playback: Playback;
  timerPhase: TimerPhase;
}

export default function AddTime(props: AddTimeProps) {
  const { playback, timerPhase } = props;
  const [timeInMs, setTime] = useLocalStorage({ key: 'add-time', defaultValue: 300_000 }); // 5 minutes
  const addTimePresets = useEditorSettings((state) => state.addTimePresets);
  const showAddTimeInput = useEditorSettings((state) => state.showAddTimeInput);

  const handleTimeChange = (_field: string, value: string) => {
    const newTimeInMs = parseUserTime(value);
    // cap add time to 1 hour
    setTime(Math.min(newTimeInMs, MILLIS_PER_HOUR));
  };

  const canAddTime = canAddTimeInState(playback, timerPhase);

  return (
    <div className={style.addTime}>
      {showAddTimeInput && (
        <>
          <TimeInput name='addtime' submitHandler={handleTimeChange} time={timeInMs} placeholder='Add time' />
          <div className={style.addButtons}>
            <TapButton
              onClick={() => setPlayback.addTime(-1 * timeInMs)}
              disabled={!canAddTime || timeInMs === 0}
              className={style.tallButtons}
              ariaLabel='Remove time'
            >
              <IoRemove />
            </TapButton>
            <TapButton
              onClick={() => setPlayback.addTime(timeInMs)}
              disabled={!canAddTime || timeInMs === 0}
              className={style.tallButtons}
              ariaLabel='Add time'
            >
              <IoAdd />
            </TapButton>
          </div>
        </>
      )}
      {addTimePresets.map((preset) => {
        const label = formatDuration(preset);
        return (
          <div key={preset} className={style.addButtons}>
            <TapButton
              onClick={() => setPlayback.addTime(-1 * preset)}
              disabled={!canAddTime}
              className={style.presetButton}
              ariaLabel={`Remove ${label}`}
            >
              <IoRemove />
              {label}
            </TapButton>
            <TapButton
              onClick={() => setPlayback.addTime(preset)}
              disabled={!canAddTime}
              className={style.presetButton}
              ariaLabel={`Add ${label}`}
            >
              <IoAdd />
              {label}
            </TapButton>
          </div>
        );
      })}
    </div>
  );
}
