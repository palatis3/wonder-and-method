import React from 'react';
import {AbsoluteFill, staticFile, useVideoConfig} from 'remotion';
import {Video} from '@remotion/media';

export const BuffaloPaperWord = () => {
  const {fps} = useVideoConfig();
  return <AbsoluteFill style={{backgroundColor: '#ffffff'}}>
    <Video src={staticFile('buffalo-paper/paper-study.mp4')} muted premountFor={fps}
      durationInFrames={8 * fps} objectFit="contain" style={{width: '100%', height: '100%'}} />
  </AbsoluteFill>;
};
