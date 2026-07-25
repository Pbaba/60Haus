import { useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';

/**
 * A robust double-tap gesture utilizing react-native-gesture-handler.
 * Avoids conflicts with manual timestamp checks and allows passing through a single tap handler.
 */
export const useDoubleTap = (onDoubleTap: () => void, onSingleTap?: () => void) => {
  const gesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250) // Maximum delay between taps to register as double-tap
    .onStart(() => {
      onDoubleTap();
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onStart(() => {
      if (onSingleTap) {
        onSingleTap();
      }
    });

  if (onSingleTap) {
    // If a single tap is provided, ensure it waits for the double tap to fail
    singleTapGesture.requireExternalGestureToFail(gesture);
    return Gesture.Exclusive(gesture, singleTapGesture);
  }

  return gesture;
};
