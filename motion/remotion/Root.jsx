import React from 'react';
import {Composition} from 'remotion';
import {WaterfrontFilm} from './WaterfrontFilm';
import {ExperienceOpening} from './ExperienceOpening';
import {BuffaloPaperWord} from './BuffaloPaperWord';
import {BuffaloAssembly} from './BuffaloAssembly';
export const Root=()=> <>
  <Composition id="BuffaloAssembly" component={BuffaloAssembly} durationInFrames={450} fps={30} width={1600} height={1000}/>
  <Composition id="BuffaloPaperWord" component={BuffaloPaperWord} durationInFrames={192} fps={24} width={1600} height={800}/>
  <Composition id="ExperienceOpening" component={ExperienceOpening} durationInFrames={288} fps={24} width={1440} height={900}/>
  <Composition id="WaterfrontFilm" component={WaterfrontFilm} durationInFrames={96} fps={24} width={1440} height={900} defaultProps={{title:'Water & Grain.'}} />
  <Composition id="WaterfrontFilmPortrait" component={WaterfrontFilm} durationInFrames={96} fps={24} width={1080} height={1350} defaultProps={{title:'Water & Grain.'}} />
</>;
