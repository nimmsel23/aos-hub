// ================================================================
// INLINE MAP RENDERER (used by Index inline templates)
// ================================================================

function renderInlineMapHtml_(key) {
  const normalized = String(key || '').toLowerCase();
  const map = {
    door: 'Door_Index',
    voice: 'voicecentre',
    frame: 'Game_Frame_Index',
    freedom: 'Game_Freedom_Index',
    focus: 'Game_Focus_Centre',
    fire: 'Game_Fire_Index',
    tent: 'Game_Tent_Index'
  };

  const file = map[normalized];
  if (!file) return '';

  const t = HtmlService.createTemplateFromFile(file);
  if (normalized === 'fire') {
    t.gcalUrl = fireGetProp_(FIRE_GCAL_EMBED_PROP) || '';
  }
  if (normalized === 'voice') {
    t.clientConfig = {
      centreLabel: 'Voice',
      centreKey: 'VOI',
      build: 'inline',
      ts: new Date().toISOString()
    };
  }
  if (normalized === 'tent' && typeof getTentCentreLinks_ === 'function') {
    t.centreLinks = getTentCentreLinks_();
  }

  const html = t.evaluate().getContent();
  return resolveInlineIncludes_(html);
}

function resolveInlineIncludes_(html) {
  let out = String(html || '');
  const pattern = /<\?!=?\s*include\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*\?>/g;
  let guard = 0;

  while (guard < 8 && pattern.test(out)) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, (_, name) => {
      try {
        return HtmlService.createHtmlOutputFromFile(name).getContent();
      } catch (e) {
        return `<!-- missing include: ${name} -->`;
      }
    });
    guard += 1;
  }

  return out;
}
