const choices=[['quiet','Quiet'],['expressive','Expressive'],['warm','Warm']];

export function designDesk(){return `<section class="design-desk" id="design-desk" data-design-desk aria-labelledby="design-desk-title">
 <header class="design-desk-heading"><p class="eyebrow">The design desk</p><h2 id="design-desk-title">See what a design choice changes.</h2><p>The same fictional garden business, shown in three directions.</p></header>
 <div class="design-desk-layout">
  <div class="design-desk-controls" data-desk-controls hidden>
   <fieldset><legend>Design direction</legend><div class="desk-choice-list">${choices.map(([value,label])=>`<label><input type="radio" name="desk-direction" value="${value}"${value==='quiet'?' checked':''}><span>${label}</span></label>`).join('')}</div></fieldset>
   <fieldset data-desk-width-controls hidden><legend>Layout preview</legend><div class="desk-width-choices"><label><input type="radio" name="desk-width" value="desktop" checked><span>Desktop</span></label><label><input type="radio" name="desk-width" value="phone"><span>Phone</span></label></div></fieldset>
   <p class="desk-fit-note" data-desk-fit>Preview fits your screen.</p>
  </div>
  <div class="design-desk-preview" data-desk-space><div class="desk-specimen-container" data-desk-container><div class="desk-specimen" data-desk-specimen data-direction="quiet">
   <p class="desk-brand">Fieldwork <span>Gardens &amp; seasonal landscapes</span></p>
   <div class="desk-specimen-layout"><div class="desk-specimen-copy"><h3>A garden to come home to.</h3><p>Garden care and planting for homes across Erie County. Tell us what you want to change, then choose seasonal care, a planting refresh or a garden assessment.</p><a class="desk-service-link" href="/work/fieldwork/landscaping/">Explore the garden services <span aria-hidden="true">→</span></a></div><figure><img src="/assets/work/concepts/fieldwork.svg" width="1200" height="900" alt="Illustrated garden plan with curved planting beds, a stepping-stone path and layered foliage." loading="lazy" decoding="async"><figcaption>Planting, paths and room to enjoy the everyday.</figcaption></figure></div>
  </div></div></div>
  <div class="design-desk-notes"><p class="desk-explanation" data-desk-explanation>A balanced layout gives the service and the garden equal space.</p><dl><div><dt>Type</dt><dd data-desk-type>Serif headings give the introduction a calm rhythm.</dd></div><div><dt>Layout</dt><dd data-desk-layout>Balanced space for the service and the garden.</dd></div><div><dt>Color</dt><dd data-desk-color>Warm paper and forest green.</dd></div></dl><p class="desk-static-note" data-desk-static>The Quiet direction. The full concept works without the comparison controls.</p></div>
 </div>
 <p class="desk-status" role="status" aria-live="polite" aria-atomic="true" data-desk-status></p>
 <footer class="design-desk-footer"><span>Fictional studio concept</span><a href="/work/fieldwork/">Explore the full Fieldwork concept <span aria-hidden="true">→</span></a><a href="/contact/?offer=unsure&amp;goal=new_website&amp;concept=fieldwork&amp;request_kind=question#inquiry">Ask about a Fieldwork direction</a></footer>
</section><script type="module" src="/assets/design-desk.js"></script>`;}
