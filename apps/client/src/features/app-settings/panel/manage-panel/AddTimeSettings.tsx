import { MILLIS_PER_HOUR, parseUserTime } from 'ontime-utils';

import TimeInput from '../../../../common/components/input/time-input/TimeInput';
import Switch from '../../../../common/components/switch/Switch';
import { useEditorSettings } from '../../../../common/stores/editorSettings';
import { MAX_ADD_TIME_PRESETS } from '../../../../common/utils/addTimePresets';
import * as Panel from '../../panel-utils/PanelUtils';

export default function AddTimeSettings() {
  const addTimePresets = useEditorSettings((state) => state.addTimePresets);
  const setAddTimePresets = useEditorSettings((state) => state.setAddTimePresets);
  const showAddTimeInput = useEditorSettings((state) => state.showAddTimeInput);
  const setShowAddTimeInput = useEditorSettings((state) => state.setShowAddTimeInput);

  // show every configured preset plus one empty slot to add another (until the cap)
  const slotCount = Math.min(addTimePresets.length + 1, MAX_ADD_TIME_PRESETS);

  const handlePresetChange = (index: number, value: string) => {
    const parsed = Math.min(parseUserTime(value), MILLIS_PER_HOUR);
    const next = [...addTimePresets];
    next[index] = parsed;
    // the store sanitises: a 0/empty value drops that preset, and the set is compacted
    setAddTimePresets(next);
  };

  return (
    <Panel.Card>
      <Panel.SubHeader>Add-time presets</Panel.SubHeader>
      <Panel.Divider />
      <Panel.Section>
        <Panel.Title>Quick add/remove-time buttons on the playback controls</Panel.Title>
        <Panel.ListGroup>
          <Panel.ListItem>
            <Panel.Field
              title='Show type-in amount field'
              description='Whether to show the free-form add-time amount field and its +/- buttons'
            />
            <Switch
              size='large'
              checked={showAddTimeInput}
              onCheckedChange={setShowAddTimeInput}
              aria-label='Show type-in amount field'
              data-testid='toggle-add-time-input'
            />
          </Panel.ListItem>
        </Panel.ListGroup>
        <Panel.ListGroup>
          {Array.from({ length: slotCount }, (_, index) => {
            const preset = addTimePresets[index];
            return (
              <Panel.ListItem key={index}>
                <Panel.Field
                  title={`Preset ${index + 1}`}
                  description={
                    preset === undefined
                      ? 'Set an amount to add a preset'
                      : 'Applied as a −/+ button pair; set to 0 to remove'
                  }
                />
                <TimeInput
                  name={`preset-${index}`}
                  submitHandler={(_field, value) => handlePresetChange(index, value)}
                  time={preset}
                />
              </Panel.ListItem>
            );
          })}
        </Panel.ListGroup>
      </Panel.Section>
    </Panel.Card>
  );
}
