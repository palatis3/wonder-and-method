import historical from './search-excluded-public-paths.json' with {type:'json'};
import additions from './v3-offer-paths.json' with {type:'json'};
export default [...historical,...additions.filter(path=>path.startsWith('/checkout/'))].sort();
