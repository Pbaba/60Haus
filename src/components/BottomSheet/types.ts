import { ReactNode } from 'react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: (string | number)[];
}
