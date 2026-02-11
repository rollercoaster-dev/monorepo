import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('expo-video', () => {
  const { View } = require('react-native');
  return {
    useVideoPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), loop: false })),
    VideoView: (props: Record<string, unknown>) => <View testID="video-player" {...props} />,
  };
});

import { VideoPlayerModal } from '../VideoPlayerModal';

describe('VideoPlayerModal', () => {
  it('renders nothing when uri is null', () => {
    const { toJSON } = render(
      <VideoPlayerModal visible={true} uri={null} onClose={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders video player when visible with uri', () => {
    render(
      <VideoPlayerModal
        visible={true}
        uri="/path/to/video.mp4"
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId('video-player')).toBeTruthy();
    expect(screen.getByLabelText('Close video player')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(
      <VideoPlayerModal
        visible={true}
        uri="/path/to/video.mp4"
        onClose={onClose}
      />,
    );

    fireEvent.press(screen.getByLabelText('Close video player'));
    expect(onClose).toHaveBeenCalled();
  });
});
