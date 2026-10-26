import {test,expect} from './fixtures.mjs';
const identity=href=>{const u=new URL(href,'http://127.0.0.1:4187'),p=u.pathname.split('/').filter(Boolean);return p[1]+'/'+(u.hash?u.hash.slice(1):p[2].replace(/-county$/,''));};
const cases=[
  {
    "state": "nevada",
    "count": 17,
    "slug": "churchill",
    "name": "Churchill",
    "communities": [
      "Fallon",
      "Fallon Station"
    ],
    "queries": [
      [
        "Fallon city NV",
        [
          "nevada/churchill"
        ]
      ],
      [
        "Fallon Station CDP NV",
        [
          "nevada/churchill"
        ]
      ],
      [
        "Fallon CCD NV",
        [
          "nevada/churchill"
        ]
      ],
      [
        "Fallon Station city NV",
        []
      ],
      [
        "Carson City independent city NV",
        [
          "nevada/carson-city"
        ]
      ]
    ],
    "hasCdps": true
  },
  {
    "state": "washington",
    "count": 39,
    "slug": "benton",
    "name": "Benton",
    "communities": [
      "Kennewick",
      "Finley",
      "Hanford Site"
    ],
    "queries": [
      [
        "Coulee Dam town WA",
        [
          "washington/douglas",
          "washington/grant",
          "washington/okanogan"
        ]
      ],
      [
        "Woodland city WA",
        [
          "washington/clark",
          "washington/cowlitz"
        ]
      ],
      [
        "Enumclaw city WA",
        [
          "washington/king",
          "washington/pierce"
        ]
      ],
      [
        "Finley CDP WA",
        [
          "washington/benton"
        ]
      ],
      [
        "Hanford Site CCD WA",
        [
          "washington/benton"
        ]
      ]
    ],
    "hasCdps": true
  }
];
for(const item of cases)test(`${item.state} typed search retains independent-city, cross-county and statistical place identities`,async({page},testInfo)=>{
 const apiRequests=[],dataRequests=[];page.on('request',r=>{const p=new URL(r.url()).pathname;if(p.startsWith('/api/'))apiRequests.push(p);if(/^\/assets\/county-search-[a-f0-9]+\.bin$/.test(p))dataRequests.push(p);});
 for(const route of ['/areas/'+item.state+'/','/areas/']){
  await page.goto(route+'?qa=1');
  await expect(page.locator('[data-cs]')).toHaveCount(route==='/areas/'?3064:item.count);
  if(route==='/areas/')expect(dataRequests).toEqual([]);
  const search=page.getByRole('searchbox',{name:'County, parish, municipio, region or community'}),results=page.locator('[data-county-results] li');
  for(const [query,expected] of item.queries){
   await search.fill(query);await expect(results).toHaveCount(expected.length);
   expect((await results.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')))).map(identity).sort()).toEqual(expected);
  }
 }
 expect(dataRequests).toHaveLength(1);expect(apiRequests).toEqual([]);
 await page.goto('/areas/'+item.state+'/?qa=1#'+item.slug);
 const entry=page.locator('details#'+item.slug);await expect(entry).toHaveAttribute('open','');
 for(const name of item.communities)await expect(entry).toContainText(name);
 if(item.hasCdps)await expect(entry.getByRole('heading',{name:'Census-designated places',exact:true})).toBeVisible();
 await expect(entry.getByRole('heading',{name:'Census county divisions (statistical)',exact:true})).toBeVisible();
 await expect(entry.getByRole('heading',{name:'Cities',exact:true})).toBeVisible();
 if(item.state==='oregon')await expect(entry).toContainText('Inactive incorporated governmental unit');
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:testInfo.outputPath(item.state+'-directory.png'),fullPage:false});
});
test.describe('Nevada and Washington native directories',()=>{
 test.use({javaScriptEnabled:false});
 test('every county remains keyboard-accessible with statistical labels and source links',async({page})=>{
  for(const item of cases){
   await page.goto('/areas/'+item.state+'/?qa=1');await expect(page.locator('[data-county-area]')).toHaveCount(item.count);
   const browse=page.locator('[data-county-browse-all]');await browse.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   const entry=page.locator('details#'+item.slug),group=entry.locator('xpath=ancestor::details[contains(@class,"county-section")]');
   await group.locator(':scope > summary').focus();await page.keyboard.press('Enter');await entry.locator(':scope > summary').focus();await page.keyboard.press('Enter');
   await expect(entry).toHaveAttribute('open','');await expect(entry.locator(':scope > summary')).toHaveText(item.name+' County');
   await expect(entry.getByRole('link',{name:'Place definitions and sources',exact:true})).toBeVisible();
   await expect(entry.getByRole('heading',{name:'Census county divisions (statistical)',exact:true})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
 });
});
