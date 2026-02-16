// ================================================================
// Bridge helpers (Auth headers, optional helpers)
// Extracted from alphaos_single_project.gs
// ================================================================

function bridge_getAuthHeaders_() {
  const sp = PropertiesService.getScriptProperties();
  const token =
    sp.getProperty('AOS_BRIDGE_TOKEN') ||
    sp.getProperty('BRIDGE_TOKEN') ||
    '';
  if (!token) return {};
  return { 'X-Bridge-Token': token };
}
