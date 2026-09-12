import { Modal } from '../Modal';
import { PlanGeneratorForm } from '../PlanGeneratorForm';
import type { PlanInput, WorkoutPlanRecord } from '../../lib/workoutTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: PlanInput;
  onGenerated: (record: WorkoutPlanRecord) => void;
}

/** Workout preferences → AI plan generation (spec 6.2). */
export function WorkoutPreferencesModal({ open, onClose, initial, onGenerated }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Workout preferences" maxWidth="max-w-2xl">
      <PlanGeneratorForm
        initial={initial}
        onGenerated={(record) => {
          onGenerated(record);
          onClose();
        }}
      />
    </Modal>
  );
}
