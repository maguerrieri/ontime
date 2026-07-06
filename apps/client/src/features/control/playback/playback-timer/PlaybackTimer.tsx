import { MaybeNumber, Playback, TimerPhase } from 'ontime-types';
import { dayInMs, millisToString } from 'ontime-utils';
import { PropsWithChildren } from 'react';
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';

import AppLink from '../../../../common/components/link/app-link/AppLink';
import Tooltip from '../../../../common/components/tooltip/Tooltip';
import useReport from '../../../../common/hooks-query/useReport';
import { useSelectedEventScheduledEnd, useTimer } from '../../../../common/hooks/useSocket';
import { useEditorSettings } from '../../../../common/stores/editorSettings';
import { formatDuration } from '../../../../common/utils/time';
import TapButton from '../tap-button/TapButton';
import TimerDisplay from '../timer-display/TimerDisplay';

import style from './PlaybackTimer.module.scss';

function resolveAddedTimeLabel(addedTime: number) {
  if (addedTime > 0) {
    return `Added ${formatDuration(addedTime, false)}`;
  }

  if (addedTime < 0) {
    return `Removed ${formatDuration(Math.abs(addedTime), false)}`;
  }

  return '';
}

export default function PlaybackTimer({ children }: PropsWithChildren) {
  const timer = useTimer();
  const scheduledEnd = useSelectedEventScheduledEnd();
  const showScheduledEnd = useEditorSettings((state) => state.showScheduledEnd);
  const setShowScheduledEnd = useEditorSettings((state) => state.setShowScheduledEnd);

  const isRolling = timer.playback === Playback.Roll;
  const isWaiting = timer.phase === TimerPhase.Pending;
  const isOvertime = timer.phase === TimerPhase.Overtime;
  const hasAddedTime = Boolean(timer.addedTime);

  const rollLabel = isRolling ? 'Roll mode active' : '';

  const addedTimeLabel = resolveAddedTimeLabel(timer.addedTime);

  return (
    <div className={style.timeContainer}>
      <div className={style.indicators}>
        <Tooltip text={rollLabel} render={<div />} className={style.indicatorRoll} data-active={isRolling} />
        <div className={style.indicatorNegative} data-active={isOvertime} />
        <Tooltip text={addedTimeLabel} render={<div />} className={style.indicatorDelay} data-active={hasAddedTime} />
      </div>
      <TimerDisplay
        className={style.timerDisplay}
        time={isWaiting ? timer.secondaryTimer : timer.current}
        phase={timer.phase}
      />
      <div className={style.status}>
        {isWaiting ? (
          <span className={style.rolltag}>Roll: Countdown to start</span>
        ) : (
          <RunningStatus
            startedAt={timer.startedAt}
            expectedFinish={timer.expectedFinish}
            playback={timer.playback}
            scheduledEnd={scheduledEnd}
            showScheduledEnd={showScheduledEnd}
          />
        )}
        <TapButton
          onClick={() => setShowScheduledEnd(!showScheduledEnd)}
          active={showScheduledEnd}
          aspect='tight'
          className={style.scheduledEndToggle}
          ariaLabel={showScheduledEnd ? 'Hide scheduled end' : 'Show scheduled end'}
        >
          {showScheduledEnd ? <IoEyeOutline /> : <IoEyeOffOutline />}
        </TapButton>
      </div>
      {children}
    </div>
  );
}

interface RunningStatusProps {
  startedAt: MaybeNumber;
  expectedFinish: MaybeNumber;
  playback: Playback;
  scheduledEnd: MaybeNumber;
  showScheduledEnd: boolean;
}
function RunningStatus({ startedAt, expectedFinish, playback, scheduledEnd, showScheduledEnd }: RunningStatusProps) {
  if (playback === Playback.Stop) {
    return <StoppedStatus />;
  }

  const started = millisToString(startedAt);
  const finishedMs = expectedFinish !== null ? expectedFinish % dayInMs : null;
  const finish = millisToString(finishedMs);
  const scheduledMs = scheduledEnd !== null ? scheduledEnd % dayInMs : null;
  const scheduled = millisToString(scheduledMs);

  return (
    <>
      <span className={style.start}>
        <span className={style.tag}>Started at</span>
        <span className={style.time}>{started}</span>
      </span>
      {showScheduledEnd && (
        <span className={style.finish}>
          <span className={style.tag}>Scheduled end</span>
          <span className={style.time}>{scheduled}</span>
        </span>
      )}
      <span className={style.finish}>
        <span className={style.tag}>Projected end</span>
        <span className={style.time}>{finish}</span>
      </span>
    </>
  );
}

function StoppedStatus() {
  const { data } = useReport();
  const hasReport = Object.keys(data).length > 0;

  if (hasReport) {
    return <AppLink search='settings=sharing__report'>Go to report management</AppLink>;
  }

  return null;
}
