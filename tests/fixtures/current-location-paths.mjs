import original from './location-release-paths.json' with {type:'json'};
import followup from './location-followup-paths.json' with {type:'json'};
import next from './location-next-paths.json' with {type:'json'};
import waveOne from './location-wave-one-paths.json' with {type:'json'};
import waveTwo from './location-wave-two-paths.json' with {type:'json'};
import waveThree from './location-wave-three-paths.json' with {type:'json'};
import waveFour from './location-wave-four-paths.json' with {type:'json'};
// Reviewed release fixtures remain fixed and independent from production data.
export default Object.freeze([...original,...followup,...next,...waveOne,...waveTwo,...waveThree,...waveFour].sort());
