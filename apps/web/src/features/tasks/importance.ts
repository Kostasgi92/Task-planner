import type { Importance } from '@tasknest/domain';

export const importanceLabels: Record<Importance, { label: string; description: string; className: string }> =
  {
    low: { label: 'Low', description: 'Nice to have', className: 'bg-[#edf0ea] text-[#5d715f]' },
    medium: { label: 'Medium', description: 'Keep moving', className: 'bg-[#fff3d8] text-[#a06d20]' },
    high: { label: 'High', description: 'Do first', className: 'bg-[#fbe3de] text-[#a34d42]' },
  };
