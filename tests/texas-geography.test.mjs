import test from 'node:test';
import {escapeHtml} from '../src/shared.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {texasGeography,texasAreaInventory} from '../src/texas-geography.mjs';
import {regionalProfiles} from '../src/regional-content.mjs';
import {serviceStates,countyDirectory,countySearchText} from '../src/service-area-directory.mjs';
import {parseCountyQuery,countyMatch,decodeCountyNames,unpackCountySearch} from '../src/assets/county-directory.js';
import config from '../config/site.json' with {type:'json'};

const geography=texasGeography.texas,state=serviceStates.find(s=>s.id==='texas');
const cards=serviceStates.flatMap(s=>s.counties.map(c=>({state:s.id,slug:c.slug,terms:countySearchText(c,s,s.regions.find(r=>r.slugs.includes(c.slug))).split('|')})));
const matches=query=>cards.filter(c=>countyMatch(c,parseCountyQuery(query)).score).map(c=>c.state+'/'+c.slug).sort();
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const entities=c=>[...c.municipalityDetails,...c.communities,...c.administrativeDistricts];

// Fixed review fixtures generated from the independent raw-source reconstruction,
// not from the public module or its producer. Each digest binds county identity,
// every full entity identity/classification/membership and ordered representatives.
const expectedCountyDigests={
 "anderson": "20cead141567ce64eb77d2e63729ad4430b0d7149f5c7bbe5250d050c07dd0a2",
 "andrews": "aace203f105e13d4a252d8c05f68c55436753cf0ffd9e5cccfb93a61513e9a80",
 "angelina": "d11e739895bf6fcd53af2d0ac9ab4dc17d4936abd1e32d60545fb84cd4063ed2",
 "aransas": "d093c799d618c0ec6fd4887fa24a0a906825c70049dbf5969400c97c4fa0e49d",
 "archer": "66641db0e7c390556c73c3b3cbca839163b5e0bd639d9e8cd4269339f7c5612d",
 "armstrong": "2de200d3a37589de210aaf52696a33b7ed11fa78000455558a971cef6d004e3c",
 "atascosa": "8963fcd9727d2689e703f4d233406b3b06a84aea5d5dbb5fcde6c158d7383382",
 "austin": "612ec50acca29f3b7819c0464e46c0bb2fda54b384804022f15253d66745cb7b",
 "bailey": "3f91fff8404f0af1eb9e1848925504ff91b7e8abb906aa0bd5f01b01d51d7817",
 "bandera": "1d09b6b1ca01d47ee0421a4db831ae656ef4196323287be32e8528f5cc1f9303",
 "bastrop": "765d60997ddccad5bb2de0314eddde914cc0d765ef61574007b1ac39d2fd1d4f",
 "baylor": "fdb5227816078464275964000a43590f5ba4ca0fe9134229714f39336cc96ead",
 "bee": "0d63d2168641815efe47bf0d3043ddd50b858014d674426ae2290b14f6feb61d",
 "bell": "7e3d1244048291b8b0c9c6aff6f3740034b5b594072548fe325fbb47ebcbcddc",
 "bexar": "31f63a917eb8075beb1e73ef87cbbc5b49f49d7d73d5d929fb6cdf3b22fbb668",
 "blanco": "f7287ad604e4ce0120468f041ad9c742fa28daaede51571a4d490782aa200885",
 "borden": "67a1093b89bf23b722bd601769dcd36375d2ec3cd71c2218e4d35214e1df317b",
 "bosque": "15b0e3a777ca0122971502280b1b3d3a4b2d56037eabd67cb226a494443dd96b",
 "bowie": "8f7807401785b3444b012a8eafe862c0bb1a885e6e7ec7ca472d75dc05e422e7",
 "brazoria": "3fdcbf1f88fd44d28594b7cdae33a1a0d184d773ccf0c7916d9bf43a67c31da7",
 "brazos": "28db70203135b08caadec01681eb290b787f24433eea313750aaadd463bcccb1",
 "brewster": "84db8e48eb3b7e8769a10174da518c02316b19b9c8be6a81b70e2568eb5fdd7d",
 "briscoe": "2d0e2f2701b494909cb52b949891f0c4dbb117bcc376ae2a224c16e2bd995397",
 "brooks": "b96b9107aa817090cfc926938f2388b15a646de9654c2f4a9bc0354e32956a29",
 "brown": "3631c20b3a6130756e0a844b473b1cc55a1a345fb589c30d9f8ae9dd910e99e2",
 "burleson": "e408573b3b207b87735b6074eb99bb483544986b575a9b69f06ed4d14df53ea1",
 "burnet": "445a43bb3298d202a3cbc13754ceabcfbc406e11ce6120d4754dea559d63ad1a",
 "caldwell": "a21507922de94cad4a2647a1b5c41d8c9af4e50482da944396b350dcdf349292",
 "calhoun": "af41271efa78b55c72d9b174a7f66963661283a6d3d064954f1020944515a8db",
 "callahan": "ac80834dfa7c417ff0cc57c2e1ac5c0e44762e6e70e7c52999560d4a14bd9524",
 "cameron": "0ec7c9a567f0c254c8a0b9ba5371aa82384c86ad74f491d2f7a92725432bb004",
 "camp": "dc562ca326694fcdd06d24c422a01218bb989cecaf05a9ff344368ca867ae74d",
 "carson": "79dfe0af548adf670a9dd540a4143c43d6bd9ccbcb7f7756e2be0b658174b1a0",
 "cass": "5fab10a1c37783e70fc2cc463f5fe6b17368cec39e932b6723f281cff5381aff",
 "castro": "8314a510fd96258a032cd48f70ac99dd39d08dd07a6ae784d56f5548d71d8f20",
 "chambers": "5028fbb5fbe28223396d9fab95ae307101b91fbebe9fc079b4607bd617eea8a3",
 "cherokee": "a954d92cc313438cdee4c594c567380f9507a163ee858950d93cb370ff823040",
 "childress": "3f3e0c73d58d8f5e0bca150531ec09c752791af5dcadcbe7218fc08f2c1c48bb",
 "clay": "c3c1fe3d8c61bb77c44c46d4e16f33695721f596bf4445ed55bec5784acff719",
 "cochran": "c97bb3f25084c236c5df9e118af7deac992f6be937ce55f563d2bdcb74c73330",
 "coke": "9e54e584e0682214917ef9ea4b769d889686b060500101e6199a8870c5dda14e",
 "coleman": "52cbcaf8500613c8fd27fd0642bbeb90b042dd08ca905ce3c12a661940cf6ff5",
 "collin": "ece642059df56fe7f8224b903ebb65caef1412b10ad485afeea991cb50aa06a8",
 "collingsworth": "571d7992541f23c98d0074fa3384534dac57c2f4d1adb1d5c8f530d02c2f04c8",
 "colorado": "376bc0a972cdc842f5d9826f106ca44dbdc6bb6f48415f0219eefa8befa21cdc",
 "comal": "094b4998ea7122dd28abd2812796ef08022176f82c12b3f9d525fccb6ca19ee2",
 "comanche": "64133cc7931165f87e46662e0a008493f27500228c2101a59d852f1d936cbad9",
 "concho": "63a56922362b26f46dadf9e8c58461038a66b5c9bcd3b324cc1e0e278fd67e4e",
 "cooke": "27174ff0aa3356b8416b7773d67122a7c6c68c75c11e838420f880d134186f96",
 "coryell": "d836f80bd5128480fb1041ba57ea7e2d19f0c6398800b9dcf63982360c140696",
 "cottle": "8c4e61f95806bf3d2288962c414d501b31c2eedb23b6c66f93e265ead1ae8bf7",
 "crane": "e06ddf603936bca6b5497e0da1fb8eb55f47eef3b58e095164e77a00ee63b5a7",
 "crockett": "da131df672a3b39b1fe20841f5a9dc4c98b26b302e9b548a3a54521612ff5ca6",
 "crosby": "60e7a9f87489b873ef22034c88ca6025c569b9119bc9e491bfce2a6836041dd1",
 "culberson": "629b7b21324b52571414b2cc8e2287c18f04500150fbb5617ed9f7e8d722e16f",
 "dallam": "7864f3603ed1d9f329641d7560c6c1db3d4e3a4544a0be982937eb242554b3b5",
 "dallas": "19bc66800fae1af6ffbaf32160148c085c380140a1fd27049da4fdb2b17bdd17",
 "dawson": "1c5a1cb185010714c6cf260161758b125ae99f98d0593698819689979cde2561",
 "deaf-smith": "f10c626b9673243cd3b6c9791099c01642c7cef393c15f2f7d5f8f80e3b21cc9",
 "delta": "ffec2b70846bb44b4b4d236458e89f5075549b7b532d3ba5dff95fd11900a606",
 "denton": "905e49cebf1bf6b4aeec1de78dffd23b684d37f9dbea7a68f45eccf51077d0a8",
 "dewitt": "2fbdfc4d2e868d4dfc2747ba8f8baf72ced83aad3221b950c4861d3f26463dee",
 "dickens": "fb336354d1dbe69c1fbe2c4458d876c95fc6ab34899ad0dcf77b8620df438720",
 "dimmit": "0579ffb5f5017f3f0305c61b8a0e3912b5b2e3a913441356fe1bdb27e74a5f9b",
 "donley": "827007347f0637355374b1596e73dd85f46b8cf58c72d8a3b4d1389feb33477e",
 "duval": "66bfbe48d73d81160e065532a30d90db9b667bebfd1d961f352eaebc9ec43705",
 "eastland": "2f7f48d594ec9c2c9aead0cff25731a7506a7b0cd7b7b683af8af1cdc5047a60",
 "ector": "09a479559e2d6fcd4ab7945dcce69bb2fc110abb7d3c3cea4b77c31ee951b77f",
 "edwards": "109f86560258b5b04b104ac628e262b072acb88b0cd10c2d1d27ae482c0386a7",
 "ellis": "dff149cda9f5d5a2313ab78c1c236dff70ecec348ab5892961f22d1403c5fcc1",
 "el-paso": "c73b02aec75740969fa04444bfe9d1727d5c78f0d883937fec3dc4285099ddb3",
 "erath": "e22cd10330c189d95867b986a619f80d791269d74a7244049842d72d11fbd43b",
 "falls": "39d08c4b510657803ffb2bf1154b585e0bd360f1e285ce66fd446eba8cf9de95",
 "fannin": "3518043e57f549f0bbaf2c8f8b36624f5f0603cf27752654099cfac0e6aec210",
 "fayette": "73c6f694e2170a8a84cdcde83f399a50861374f768b2f4371f47e276187d66e6",
 "fisher": "9d9324ce6ad9d86cdc452ff051ef0d49305c36bbc246cd5a7cc8dd2187018dfd",
 "floyd": "96dd02c3d1da17b35410cbcf081d78dcbec2e1cb393c4ec903fc8ffeb9f53329",
 "foard": "ce47d60d00bc9b29940a661843d9fdf85534cb4d3ab8ca15406d68b2b7df07cf",
 "fort-bend": "424548d2a2ff0d3a621f2d066d61627b1895fafc0ae6f432929ff53272bb2ae2",
 "franklin": "582fce6dbacff58dd58e8d71825e48b2bd723b2cabb06f3f6f46efa0a6019cfd",
 "freestone": "2e3c4c24889656e3f0f4cd0a474432f802655ebf9e2da350624d833d1c09c706",
 "frio": "f3c44e929af15795d6decccfb46c81a4163c1b821bcc0557481f3af261ca66ee",
 "gaines": "4b70ad193872f826f5b94f99a8029f2e02385577e9ad0d7ecaac9dd8b44a89f7",
 "galveston": "ae7fd307acbd0dc350528e7d5968f7ba9d92566b42647c596becbcc9497d66df",
 "garza": "68f842d560e31c3b4c2acc842d6a0af6c3f5c5e7be40c96bc8ca6fd836fdad68",
 "gillespie": "e25d470920651df638817c3b3c81c581b44b1aa88037699c025cb90a7aa201d0",
 "glasscock": "044dcd8e5572cab510e62caebe5213fb95da9c416a886f4f8a3abf2267df345a",
 "goliad": "c1cc16aabcef4cd96b7c7ce001d3e894b5abae427f50a885260e7ba22d9fc965",
 "gonzales": "366527ccacbbab82e1727b15fc0a9c0f82347053498e863bfee332f2917ecc1f",
 "gray": "87f8fbeaf456830e8e1667a0c5af4295f8e46ae816eaf4f97be2f9103c9a273a",
 "grayson": "e0cad6ca101c90120c19f71a89c34e0ed9bd330ef485132d7af76148d31072f0",
 "gregg": "39a47d2693ffcbce8b304c5609de013a2ca24dab0b46ab122bc32d967bdb6544",
 "grimes": "f66e86493830f3a701dd29909d2ce2f0e2591a468286881edba3d65609973606",
 "guadalupe": "5e1887fd0514a6b42baeadcd30ab4e8abb5a200f0acc2ac9c4547c216c58dfe3",
 "hale": "c570e798ad7d5326d4c1b3baff0f41b781c4de19be0a5dbc1db1972ac70589ba",
 "hall": "e3cf0f926de46a5054ef335a8fbea3753d179295c9c25c1033541b3fe75848d5",
 "hamilton": "e91863ad7d370ccdc53ee65cb271be502bc25d87077cdf6c8d3000199f2114a1",
 "hansford": "55caa9b68f24efef65fd63d7042d214d6f76861c5e250556faad7bad4af91c6f",
 "hardeman": "7aa95466b498ce036ff05452fba2119755c5405a9a7640473a4a3f85d4622e92",
 "hardin": "4aea29b40ad359839d2301376dc7d545227820174d715b265267d74f131f88de",
 "harris": "06cb17364d0768df02b8c093217fe2a7b050bbb52c084d35c0dc9f9ce84d1d18",
 "harrison": "c3f16f66dd1aaccaae1f099038cba5ae83de064e5d561c1b69b38fce7d2ce988",
 "hartley": "f464ecd095c0a8a78243fd5e4799b27d03e7805707df7cca3ae43cd8c5194a23",
 "haskell": "7c89751fe1e14a9f0e700ebe8e46a33fb48443bb27698d6090808be4d3d73378",
 "hays": "adbb683badb1bb328b98224b5ecfc10c7221aa3d319ad377a48f7656553ee902",
 "hemphill": "c5200c91279f9b9e6bb25d4a219b424ef43bb0559dce75ed7746eefa7033ca7b",
 "henderson": "2c5bbd8662d188ba1f79d7d2ef5404c30388623656d87988c26bf192f1b6db34",
 "hidalgo": "598a75f07ac6560472741dd74d27ae10d8ab9a7cab72fcf04377c133c4e6d850",
 "hill": "59fc77dae6c74b5ad1d2f579175c3ebe427087755413cf4539beac4e6c64c4d2",
 "hockley": "11b4fe0946f5e761e6deb3eca7245f9e04e6c6f92a98a27bb06ab4d6e1a1c60b",
 "hood": "4170fea61d84c77a2ffcb79c39ef74f26894fe5d2934a9eb5735a33a2ac279ef",
 "hopkins": "5c72aa8143f6b912a47f611ed232b2b86e19144260e11bf9f9626523c55b37b1",
 "houston": "e2b154223bb6d18b949c006bb05e1be3e6639431446aa6c198689450aae4f518",
 "howard": "741d274e7566b32814d08c59990a3153d617b0ef33d6945f8ea0be73147ad5fe",
 "hudspeth": "850898eaf93365e38639866bcae876cc6d3fc52bf950405d5f33754e385d001b",
 "hunt": "f6b24bd776e547ab9531581909a2234c3f0f87e0bc7df311c24d0dbf535d5d67",
 "hutchinson": "6c987a303d1e4230546933ea2c442e4078e4e25ac17cf6bcd29b2af035b75e61",
 "irion": "e0d0fcb34dea276913b24932a1ff41aa71d4cd6871c96e78e038e13ab84c417f",
 "jack": "a5f5dd5458537a51575a188de014be79dbccd3c9cf8ade760c1796c01d1dcf04",
 "jackson": "5c3f105b865442237e230840f4dda55e01d80a1e946892edee93834ee4452748",
 "jasper": "a3e0758ebafac62d2c61a338726e6a1abf628b6f5b18be683d91c367a7a91ccb",
 "jeff-davis": "3eafd0bf0a2517f7cacc8abb2420444ffc862c2661ff9ee3d153082b4f02f27d",
 "jefferson": "677e5f131e5d68b07faacc377730db5083d6db121984dbd121ca68b530c405ec",
 "jim-hogg": "697dcad8c50fd03dd5125359f808abd671fa188547a4a90df393bbc4bf52c74f",
 "jim-wells": "977ce6830399cd17ce40720502991bb907c2b6d92d5f9748d0cb1bea59f48bf8",
 "johnson": "07c9f73b7157c461cc05a85aabc920a7a3aedca44e4f6e52608df0c7ee2a6e13",
 "jones": "4be5cf6f3c46fdb81a30f163639733e5db8d067a32f711ef37f1d406127077cd",
 "karnes": "c9d55be063a8031d30d835b4518e065f88b20ffd7993d911d9d3101e950a381e",
 "kaufman": "8a772cfad8a6eb637f405ab6189fbeeceba15d9c607f79e20b417ff0dbf0da76",
 "kendall": "0a6c4fbeb368d5ff662a8f4d935979f533b409eba93e8faf6ac48aa7cee59b66",
 "kenedy": "49ec4b8833a69ae458306fb09159505ef35170ab065213ede96407aa32729ddd",
 "kent": "037d7c41c144fa10339955859f5d1e9d8fc6344645c5439fccf9b8679ed1c94f",
 "kerr": "5b3ef2f9ccca2d24c660dc8574bdd7b352c3aed70ce76d647a3b8b3308a8c47f",
 "kimble": "8f290ca7fa5ff307177125779f0c86043612618ffe17896b90abc050ac62e16b",
 "king": "80b1eaeb79b3fc03355d0a56319106cc4be454e1bb83c2491f9208381bff442f",
 "kinney": "7fca3746845c92d6501f0dd6fb23c34147c447d1fd2a00bd3d5f1b877d132a32",
 "kleberg": "d21f3ce46a7fce53122afeacdeb0ca3e2719c4156a234e8b0d9fda9f9b1a9eef",
 "knox": "2635dfb2cc236c381b5217b4ab2a200e6103894ac8103d25716a5a4cec23b400",
 "lamar": "66a2d69c4fb54b8e5be5b4e2cf5b57c58f86d9643b1e67fd8b5c2cacbb5bc1ef",
 "lamb": "4cf800d69eb589f33c0772ba3350d96ccfa9a6aee9704ad51689b37d94f4d138",
 "lampasas": "c1a65d1b46f1cfd48acd1d9275f0439fa4272df1bc27612ef4bd95580763c310",
 "la-salle": "f84e8193bbb2615780f886959391b0ff7b13dc87d1d240459eb10ebbf5b88537",
 "lavaca": "4e18a4685b2ea90675e48210b1bc0765ad2df0d3711f6a6a70bcc1ec5b8f0961",
 "lee": "fce9a932a1ca8457b0c091f0d6257593286e6a5726d37dd1350242fdc83a4afd",
 "leon": "cc084d760e765ca1d7c6cce824a79a51bd08f85a1fdcd94e281114d449172245",
 "liberty": "9c31a50ced6521dddb7b0f90d3d00b435721522e37d21e1ef60be39432633d37",
 "limestone": "b7e3242ae65ab8c69ca3cd0713ac4da61c06a9b93441792c3354859a6c6a5ca1",
 "lipscomb": "1932dd92b24bf91915413181b59e3787ecda57f7c50edc80428e757f9791ca3f",
 "live-oak": "fbfe2990e6c2677e16919ba45d98bc1bf93f4a347443536a1a7d8d04327849a7",
 "llano": "94fc132a33f82c3d7c6073ac83adbbfff43cf494825ac0a6cdf23f94d797cad6",
 "loving": "f0b2ae60cec59303e3adc31f840b48b1197ce80d810e06df859c6e908b900bcb",
 "lubbock": "07e1ee2d95be3a69501731e40a097d780b60b6d379213b0ddf477b0cc66cdf33",
 "lynn": "4e9169f601499c75c231a0bac0352597b34888b77edb019c5fa0ce28b51e3ca9",
 "mcculloch": "a4348c99c65c11935a269b918a25cde27dd5df9082954d8125571cde240d266e",
 "mclennan": "393f38b201811f02d8cda4edf02c2c44ffd09f3a759728a7841beeb407b6f67e",
 "mcmullen": "e519a8de2b03ae0c214792447c069cd05d5c4d221c6ab843120399e4edd90060",
 "madison": "7b196ff4e527c9774c5d48664b8089dfbec57f8143f436fa16d6fd0a3f92c5e7",
 "marion": "b77ca995110428f6dc2bdd0ae2823a1f74417fed629de2bc2b24f8362580cbba",
 "martin": "a5e296377824151a7c5d15c132454d2516c295abdd36a35cf1a32cc5a1bf7dcf",
 "mason": "e413abf91f039312f8d8702171814861f768f8b72a95d4cdf4b703757ce4cc47",
 "matagorda": "eec9eb49b150b18eecc144b9154f87487e8b60ea9653991d67c19b49c4e8d87a",
 "maverick": "3fc640c1b610fba12290ddc2fb9ab969b2aa18b91705f62c7c4f10910cbeec0e",
 "medina": "f24c6abff0177f21c6d3078b56674d2f95395b8472c81d878ef824b94bc70750",
 "menard": "b7d7f2caa3c30a98cc43e2073cf3ac281d964c489c2a82aa4742ee66d6d1ac07",
 "midland": "387f3183673a8f8c12b0603187344f634aea53415c179359a6331e6cf3fccc48",
 "milam": "3032bead1f35b1216e8a7eacb26a9728f20ba5dc43dff181232f8c805783300e",
 "mills": "337adbd62d083551b20965a37a0c20cd1700673639fd7eba50ae1ef67899716f",
 "mitchell": "1123919d61713e3a54e4a5729c8c8e40f261d0436c7f45710ea93d3176342f03",
 "montague": "6928ad4b05538a9b892bda36618025b65862bcc38b791e1f9b16dce92e809fbb",
 "montgomery": "3001a5f08467940b17d9bbe07d200ecff9d7e03d3a8015225aa39af90a9c162f",
 "moore": "9a89bb08f43b6b5d5a9a0b8de719023119db9815173dc108b231d49969429dd6",
 "morris": "672499cfa489e7278d509dc56bc9efe8b477b669e975d240cc8cd3ed5a1529bc",
 "motley": "19db5779b7171121f833a023dffe4efd1842503363809d3bfc5835e809dda3b7",
 "nacogdoches": "c8579d5fd3e9a28bb8bdfaf4b3a52ba67b00a747a60117e2da914731e3de8b1b",
 "navarro": "db0c36eb8073549ee9e3c96eaf0e9b9902a5d2d5d0c28ab938fe66a94d5b602e",
 "newton": "ad58e7b3dd300d85b857776db76d6d5e33b0092ce5ad3dfb87e7cf6da40e29f1",
 "nolan": "6d0be614b74418639f49d3cedf1c5dc25d624f9b066692c57ade1bd723048da2",
 "nueces": "891f15430104fbebad365a1caa1a3d4d3bdd7b6ec114e78576e093e1bba2f9fa",
 "ochiltree": "41d686f76df781868d1735a5ea8833bf235d00f2ffd35829d28c8bd378ecd706",
 "oldham": "01394a0e9c01ed52ca86d3cb2e59328301c16ce1c4f5da4943f29ade4674b53f",
 "orange": "e93e9176eb7296d614881a53a7a50c41ec1e9e7bfe27843c86d4adf2cc5267d8",
 "palo-pinto": "58f5164a256dba621f71f64c7134823ff8604daaaa6321a732a0c6bc90aca18b",
 "panola": "0a15f4a050fbf8a9a1c6c19e5552530d106ce26c1e28312ae300b35934e8898b",
 "parker": "87d027999b7c4b0fb3befcb50ec9119f70e167497d5d11576f428721614f2106",
 "parmer": "be141b87f8dc3abfa7435b02cc99b8efde677273dcec4c1cf13a3420b5931d9f",
 "pecos": "3f7e849557a72a2cd87efec1c407483e653912e677c8a59c56353affbe8899e5",
 "polk": "8c2af210643b1581988dac009bab5751d039b7e8575ebb6d671f62373b29f57f",
 "potter": "9583bd0ea209fb0f45124fe024b9fc260f128fe2e9f4fe6b291a081204f69080",
 "presidio": "0bbefc20c1563bb89d84ab3f6e98acffe0bee27830dfae14df6eb90a5873a1e3",
 "rains": "e3b1fb9e088722054b399d9ea572f84eacba308e19da369527e5bb791717d6e8",
 "randall": "4be140e34ee8e9dd4d4682d5524682e8dd05ce32f23798e26a2564e1009379ef",
 "reagan": "4d98d5a46ed5524ac3223074465174765c015212121712cc93b212f260cb419e",
 "real": "02f66090e5014487044d0e31ef9daf7ff2d334d1ff9e6e9f9a31443ff01167bf",
 "red-river": "5df02fd2a724eb5a82024e613036583cd8d45d97efb6ca9b0fbb2f06b2e298be",
 "reeves": "434eacb2a809e21e4d83d4677c4c27ca0d302b63e0b0daf17a769c5a6ee00396",
 "refugio": "fcdd85b61953828f7ed52d4db360aa745f646f6bb4515fad72632d47443a3b24",
 "roberts": "ffa555ca172ef066e68bfe5b4d1d6de6568f449e70dcf4c3ebab5930c1533d25",
 "robertson": "7dc9334b753784d774402d922aa6e7f169fa63672dd599cd94f2c0b3bbdadb37",
 "rockwall": "e50e3cd85d155dcbd5dd37a36f367f21fd4add0bb8294225d79b1344255e9628",
 "runnels": "059ea738b05d23633de8169dc36e226ba48d771bd9496a796033dab04f51a341",
 "rusk": "00088bf9e3aecc885d127518fd37b179d5d523a22348dd89f373faec6bd85f79",
 "sabine": "2c167eaebc7d200a524c2a9592ec5e1ceea9eab557086d4a4b430f5b95eaef1a",
 "san-augustine": "021c1214b64c6e3295b5f8401f9a913eaa3e0f3b54e20f21e4ef22703afdf49f",
 "san-jacinto": "d1fd141e2611449268ecff4ac27182404990226ee46d30e4237233de43ecad86",
 "san-patricio": "119eec9bb65de11a9c0d5c7474d3f42aa720680c548584ef9d1094c4119e3491",
 "san-saba": "c8fa5d1d80f74213e43c36b63f3e5b0b8950905ef8a226af593e3be976e50c8d",
 "schleicher": "978331de3d975f20973f4b3cbdc201fe39dd973688d1494f2af8527962dbb665",
 "scurry": "bf8980f50ae7d53157ba5b8c0cca4dedce0bccaa6853ecde236356844d5bf22d",
 "shackelford": "5394b856d1e09ba04a6a4706686b63d91816404468d93d38b9ee996f7fc62b99",
 "shelby": "dd5eba68dfb19491929222821639dd32f826b79a187ecb133542b705fc4e8d47",
 "sherman": "b7c919b251e3f7028ae4bd0126a006ed49cd75dd1954a7be38c50beee2585023",
 "smith": "13746232a7fd6135725a98f15fd5aa05c1f836704bcb22517f74e18235fe9f51",
 "somervell": "9a2b12ad84930d12ebba5c25e013c5f4d0e8440aa11050b5a5596180ce4f9f34",
 "starr": "257caa49f653b021ec42f29a2a9a3c052c7e181061a459a335d0999c3a63a784",
 "stephens": "2d01f5749cf28e41ef471c83b4cdb9a1fa9448545f80844470f6b599d2314020",
 "sterling": "d5fb22b5e3fc9cc914e4e02bf8008ca6be44c46d873180aaa8801ed44d22211c",
 "stonewall": "639e9ff8b0abd15b2c619855a06119c01e73143151fc4e8bed88e76b566f1c3e",
 "sutton": "8481ef61ff59d93309875890878277ab285efc03f88be716898e1369426bd3b9",
 "swisher": "216f6aa79099cdb51b7611467d7ac15be2bfc1e3bb7b1915971d765dd91b96bb",
 "tarrant": "f02ab2a435ab3afc0fa2bc19f13e26068b6284ee2540f8e77b985392dd6ee9b4",
 "taylor": "61aea07b01467c70afe2a9433136a7f816e064e24c7b5eef8594f14b444eb480",
 "terrell": "d37fb8d753939e8c52aedda6310a111e1247d5da9dce18e2f358de4c97bd85e2",
 "terry": "0f140c366a29295da6dc1b2a418c181e2dcfc91e662463042f2cc0825ca27932",
 "throckmorton": "05734f7cd7b05dab8ebe0c891f084c1cd0a5d1b9a52fe3428c7c21ebd670baf9",
 "titus": "325d17396f4a1fba33263ec4352443996b0b6216bb1ce25caaf30960cf844a71",
 "tom-green": "3cfc5000c1e75052c965cb5e41516d826b2c6a832b12906b8011dc3434b0d049",
 "travis": "1697a00713a20279631638a02c57865ba354eabf0cad534f3ff9bb50106d95ee",
 "trinity": "871e1d0c35e58feb3a065bb4d813a9049e0f4d9cbc3a623a12dd5a4030a1625d",
 "tyler": "0dfaf3db47ad54e50024a1f1328020abe0df8df7567699913e6090a96d368a04",
 "upshur": "6902abf4614bd8106569b7c564a9f78581e1cc2be43d6bcd222211497249dc33",
 "upton": "a13e637377ace78009a4372a2669af12aab65f109cd768ba736c9de2e8aaf34e",
 "uvalde": "c6b1ef7ec85ceb3092c215474eef721207bf8273acc12d7fc027da794ee54aa0",
 "val-verde": "ab44285e3376bf5952aa62339968f87baad4dc6770b3234a3b571683a405c90c",
 "van-zandt": "2cb62b64093923083d3e298f827a02240bc45b6ce20fb9bb9a07a0da5f7e6b32",
 "victoria": "72d5bccbc02b0a9019687eaf086381c4ef01a61fe456e0e93bd1e705c877dc42",
 "walker": "0e633d63210a3f8b3e128f49b7112e2a37099461bad9a9ce4974310c0f4db48a",
 "waller": "68d07863e589f17662ef37b682f33c5d34fe37bb65fb4566a35f37e5045d5e54",
 "ward": "ff1f8e7317075993857b5c892156d81fb131637499fec8d0d7183633f6dcee3d",
 "washington": "8b5e42c8f0c290db6588b32d7508664b1b917e807a3773ebd0574a541093b4b2",
 "webb": "d38e1dcd3a93b7ea39881b978fbe6a5fc33a376f2132da8a13abc95ba86e97cf",
 "wharton": "f609fbd80186884fd56d04747dd477c0ef677dcefa10cb0584ab355abcfa8662",
 "wheeler": "8229e16faa2913de9e8f0b3e1c314a2c4e4befc9c3310a7f7f734de307b54179",
 "wichita": "de835814a0cba2a63a1a1e95c467dc9ac70d0b6381b0b8d50883dad2fd42c19a",
 "wilbarger": "caf26ccb77b5f12a7989d0a430fb80472c1a1b8de8a5dad21e80a87e5f4eab74",
 "willacy": "16b0ff749f5e32dc8eb7341f684702ad7fd7a62f10e0fbda8f6cd42b088ded4c",
 "williamson": "b631ec9d500607efcf5c24ae9eb7cd6d42cf6a67276e525885e8a64196dc9246",
 "wilson": "f44e7ec1bd2d1b38e8857cf0abc2275ec2e7e555a8c92dca027dd91ded864f84",
 "winkler": "f00d4a7c26df764ba00b779b11d0f73f568d1e9e907d66c5e0d111e2f5e14e85",
 "wise": "e98c00ae8427629654c9c723b7a248d9fa5dec9ea837578c21be89bf6e0755be",
 "wood": "c15d950c3145101936d2e705f274d5bfdf01001649702e96438a1ce0cfa1cfd5",
 "yoakum": "0c6e9515dbae259c9db2889b976cad33d67c4930cd0fcefec81d9a6f56895c6d",
 "young": "db807b462312cd9319c5b541528f3fae5b1069d51fed01c9b6a3da3e382521ee",
 "zapata": "813a58d931ef3e1e36de4f6749a9d93a5235cbe8dd43a925477290c45f8212c9",
 "zavala": "728b1949dea118dd4ae16c92ce1f783f48d2ce4ca9d75cad8c4af99c360017f9"
};
const zeroPopulationMemberships=[["aransas","4817000"],["bastrop","4805000"],["bastrop","4850200"],["bell","4816624"],["bexar","4814920"],["brazos","4850472"],["caldwell","4865600"],["chambers","4849380"],["chambers","4866392"],["chambers","4867688"],["chambers","4872392"],["collin","4833020"],["collin","4873592"],["collin","4874924"],["comal","4865000"],["cooke","4857476"],["cooke","4865408"],["coryell","4845672"],["dallas","4830644"],["denton","4830644"],["denton","4832720"],["denton","4850920"],["erath","4833548"],["falls","4810828"],["fisher","4831964"],["gaines","4819984"],["grayson","4857476"],["grayson","4873592"],["gregg","4822168"],["guadalupe","4865600"],["guadalupe","4874408"],["johnson","4827000"],["kaufman","4819000"],["kaufman","4845804"],["montgomery","4873316"],["navarro","4870604"],["nueces","4836008"],["nueces","4858904"],["rains","4801636"],["san-jacinto","4815436"],["shackelford","4845048"],["tarrant","4850772"],["upshur","4815172"],["van-zandt","4845324"],["waller","4835000"],["wilson","4851588"],["winkler","4848936"],["wise","4827000"],["wise","4869800"]];

test('Texas preserves all 254 independently reconstructed county/entity memberships and representatives',()=>{
 assert.equal(state.counties.length,254);assert.equal(texasAreaInventory.length,254);
 assert.equal(new Set(texasAreaInventory.map(c=>c.fips)).size,254);
 assert.equal(regionalProfiles.texas.length,254);
 let memberships=0;const distinct=new Map();
 for(const county of texasAreaInventory){
  const g=geography[county.slug];
  const rows=entities(g).map(p=>[p.geoid,p.name,p.censusName,p.type,p.censusFunctionalStatus,p.censusLSAD,p.countyFips]).sort((a,b)=>a[0].localeCompare(b[0]));
  assert.equal(digest({fips:county.fips,name:county.name,records:rows,representatives:g.representativePlaces}),expectedCountyDigests[county.slug],county.slug);
  for(const p of entities(g)){assert.ok(p.countyFips.includes(county.fips));distinct.set(p.geoid,p);memberships++;}
  assert.ok(g.representativePlaces.length>0&&g.representativePlaces.length<=3);
 }
 assert.equal(memberships,2926);assert.equal(distinct.size,2726);
 assert.equal([...distinct.values()].filter(p=>p.countyFips.length>1).length,164);
 assert.equal([...distinct.values()].filter(p=>p.type==='Census county division').length,862);
 assert.equal([...distinct.values()].filter(p=>p.type==='Census-designated place').length,634);
 assert.equal([...distinct.values()].filter(p=>['City','Town','Village'].includes(p.type)).length,1230);
 assert.equal(Object.values(geography).reduce((n,g)=>n+g.representativePlaces.length,0),616);
 assert.ok(config.serviceCoverage.regions.includes('Texas'));
 assert.ok(state.counties.every(c=>c.directoryOnly&&c.path==='/areas/texas/#'+c.slug));
});

test('Texas distinguishes statistical CCDs, CDPs and inactive incorporated towns',()=>{
 for(const g of Object.values(geography)){
  for(const p of g.administrativeDistricts){assert.equal(p.type,'Census county division');assert.equal(p.censusLSAD,'22');assert.equal(p.censusFunctionalStatus,'S');assert.match(p.governmentStatus,/Statistical.*not a governmental unit/);}
  for(const p of g.communities)assert.equal(p.type,'Census-designated place');
  assert.ok(!g.municipalityDetails.some(p=>p.type==='Census county division'));
 }
 for(const [county,name] of [['gonzales','Harwood'],['navarro','Mustang'],['harrison','Nesbitt']]){
  const p=geography[county].municipalityDetails.find(p=>p.name===name);
  assert.equal(p.type,'Town');assert.equal(p.censusFunctionalStatus,'I');assert.match(p.governmentStatus,/Inactive incorporated governmental unit/);
 }
});

test('missing estimates never imply complete rankings and all 49 zero-population memberships survive',()=>{
 const expected={cameron:['4860644','4870070'],gonzales:['4832684'],harrison:['4850724'],hunt:['4842352'],navarro:['4850184'],victoria:['4808800']};
 for(const [slug,g] of Object.entries(geography)){
  assert.equal(g.representativeRankingComplete,!expected[slug],slug);
  assert.deepEqual([...g.representativePopulationMissingGeoids].sort(),expected[slug]||[],slug);
  if(expected[slug]){assert.match(g.directoryNote,/ranking is incomplete/);assert.match(g.representativeSelection,/Incomplete ranking/);assert.ok(g.representativePlaces.every(p=>!expected[slug].includes(p.geoid)));}
 }
 assert.equal(zeroPopulationMemberships.length,49);
 for(const [slug,geoid] of zeroPopulationMemberships)assert.ok(geography[slug].municipalityDetails.some(p=>p.geoid===geoid),slug+'/'+geoid);
 const fallback=['borden','crockett','glasscock','jim-hogg','kenedy','king','loving','mcmullen','terrell','zapata'];
 for(const slug of fallback){const g=geography[slug];assert.equal(g.municipalityDetails.length,0);assert.match(g.representativeSelection,/alphabetical order, not population-ranked/);assert.ok(g.representativePlaces.every(p=>p.type==='Census-designated place'));}
});

test('real Texas queries distinguish CCDs from cities and governmental divisions',()=>{
 for(const [query,expected] of [
  ['Ward County TX',['texas/ward']],
  ['Austin city TX',['texas/bastrop','texas/hays','texas/travis','texas/williamson']],
  ['Dallas city TX',['texas/collin','texas/dallas','texas/denton','texas/kaufman','texas/rockwall']],
  ['Houston city Texas',['texas/fort-bend','texas/harris','texas/montgomery','texas/waller']],
  ['San Antonio city TX',['texas/bexar','texas/comal','texas/medina']],
  ['Leonard city TX',['texas/fannin','texas/hunt']],
  ['Austin CCD TX',['texas/travis']],['CCD Austin TX',['texas/travis']],
  ['Austin Census county division Texas',['texas/travis']],
  ['Census county division of Austin TX',['texas/travis']],
  ['Census county division Austin TX',['texas/travis']],
  ['CCD Rio Grande City TX',['texas/starr']],
  ['Census county division Colorado City TX',['texas/mitchell']],
  ['Cayuga CCD TX',['texas/anderson']],['Cayuga township TX',[]],['Cayuga district TX',[]],['Cayuga town TX',[]],
  ['Gail CDP TX',['texas/borden']],['Gail North CCD TX',['texas/borden']],
  ['Harwood town TX',['texas/gonzales']],['Starbase city TX',['texas/cameron']],
  ['Rangerville city TX',['texas/cameron']]
 ])assert.deepEqual(matches(query),expected,query);
 assert.equal(matches('TX').length,254);
 for(const county of state.counties){const card=cards.find(c=>c.state==='texas'&&c.slug===county.slug);for(const ccd of geography[county.slug].administrativeDistricts){for(const query of [`${ccd.name} CCD TX`,`CCD ${ccd.name} TX`]){const parsed=parseCountyQuery(query);assert.equal(parsed.type,'ccd',query);assert.ok(countyMatch(card,parsed).score,query);}}}
 const card=cards.find(c=>c.state==='texas'&&c.slug==='travis');
 assert.equal(countyMatch(card,parseCountyQuery('Austin CCD TX')).type,'Census county division (statistical)');
 for(const county of state.counties)assert.ok(matches(county.name+' county TX').includes('texas/'+county.slug),county.name);
});

test('literal City names and District-prefixed names preserve explicit type semantics',()=>{
 for(const [name,abbr,expected] of [
  ['Texas City','TX',['texas/chambers','texas/galveston']],
  ['League City','TX',['texas/galveston','texas/harris']],
  ['Rio Grande City','TX',['texas/starr']],
  ['Colorado City','TX',['texas/mitchell']]
 ])for(const query of [`${name} ${abbr}`,`${name} city ${abbr}`,`City of ${name} ${abbr}`])assert.deepEqual(matches(query),expected,query);
 for(const [name,abbr] of [['Traverse City','MI'],['Bay City','MI'],['Michigan City','IN'],['Johnson City','TN']]){
  const explicit=matches(`City of ${name} ${abbr}`);assert.ok(explicit.length,name);assert.deepEqual(matches(`${name} ${abbr}`),explicit,name);
 }
 for(const query of ['District Heights city MD','City of District Heights MD'])assert.deepEqual(matches(query),['maryland/prince-georges'],query);
 for(const query of ['Texas City town TX','Town of Texas City TX','City of Texas TX','Texas City city MD'])assert.deepEqual(matches(query),[],query);
 // The same-type literal fallback never becomes a prefix/substring search.
 assert.deepEqual(matches('Grande City TX'),[]);
 assert.deepEqual(matches('Heights city MD'),[]);
 assert.deepEqual(matches('Ward County TX'),['texas/ward']);
 assert.deepEqual(matches('CCD Rio Grande City TX'),['texas/starr']);
 assert.deepEqual(matches('Census county division Rio Grande City TX'),['texas/starr']);
});

test('Texas directory renders all members and classification notes without claiming a population ranking',async()=>{
 const html=countyDirectory(state);
 assert.equal((html.match(/data-county-area/g)||[]).length,254);
 assert.match(html,/>Census county divisions \(statistical\)<\/h3>/);
 assert.match(html,/Statistical Census county division \(CCD\); no legal function and not a governmental unit/);
 assert.doesNotMatch(html,/Representative-place population ranking|ranked by population/);
  const alphabeticalGroups=[...html.matchAll(/<ul class="county-place-list">([\s\S]*?)<\/ul>/g)];assert.ok(alphabeticalGroups.length>0,'rendered place groups');
  for(const group of alphabeticalGroups){const names=[...group[1].matchAll(/<li>([^<]+)/g)].map(m=>m[1].trim());assert.ok(names.length>0,'nonempty place group');assert.deepEqual(names,names.toSorted((a,b)=>a.localeCompare(b,'en',{numeric:true})),'place groups are alphabetical, not population rankings');}
 for(const county of state.counties){
  const entry=html.slice(html.indexOf('id="'+county.slug+'"')).split('</details>')[0];
  for(const place of entities(geography[county.slug]))assert.ok(entry.includes(escapeHtml(place.name)),county.slug+'/'+place.name);
 }
 for(const name of ['Harwood','Mustang','Nesbitt'])assert.ok(html.includes(name+' <span class="county-place-note">Inactive incorporated governmental unit'));
 const names=await decodeCountyNames(JSON.parse(html.match(/data-county-place-names>(.*?)<\/script>/s)[1]));
 const decoded=[...html.matchAll(/data-cs="([^"]+)"/g)].map(m=>unpackCountySearch(m[1],names));
 const expected=state.regions.flatMap(r=>r.slugs.map(slug=>cards.find(c=>c.state==='texas'&&c.slug===slug).terms));
 assert.deepEqual(decoded,expected);
 assert.equal(new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])).size,[...html.matchAll(/\bid="([^"]+)"/g)].length);
});
