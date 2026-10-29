# Independent visual reference review

**Selective approval: 15 candidates approved; retain the existing phone/work.png reference.**

Reviewed Linux capture run `40791187888` for source `05374ca6e4bf25eb67606a2efc41dfca70b3cef8`, artifact `12860914501`. Independently compared all 82 candidate/original files and verified the hashes and bounds of all 16 changed images; 66 files are byte-identical. Exact approved hashes and per-file reasons are in `visual-reference-review.json`.

Visually inspected every changed reference: all seven desktop homepage viewports, both floating-home references, the phone homepage changed region, collapsed and full expanded desktop footer, service questions, all vertical regions of full desktop Work and Web Design, and the phone Work hero. No clipped or removed content, missing links, changed line wrapping, or page-text readability regression was found.

Approved changes are the smaller decorative moon, AssetRounds desktop derivative resampling, and small downstream fractional alignment differences. The FAQ element capture is one pixel taller and desktop Work is one pixel shorter; neither loses content. The illustrative AssetRounds screenshot is slightly softer, while its main content remains recognizable and surrounding page copy remains clear. All expanded footer directory entries remain legible and present.

Retain **phone/work.png** at `e14a071b6b335198159f385343ddf3514a2f93b1897f231598b6b81eda2f4bed`: its changed region is confined to the unchanged mobile hero source and the ordinary Linux test already passed. There is no intended phone hero change to justify replacing that reference.

The visual test source, content-only stylesheet, Playwright visual configuration, browser fixture and capture workflow are unchanged from base `714cb18`; no assertion, mask or threshold was relaxed. Ordinary first-run results were 69 passed, five failed, with phone Work explicitly passed. The reviewer edited no source or baseline files. Copy only the 15 approved candidates, preserve the other 67 references, then rerun all required gates on the resulting exact commit.
