import { supabase } from './supabase.js';

// ---------------------------------------------------------------------------
// Audit trail helper.
// role changes & payments are audited automatically inside the DB RPCs;
// this helper is used for other significant actions (fire-and-forget).
// ---------------------------------------------------------------------------

export function logAudit(action, entity = 'system', entityId = null, details = {}) {
  void supabase.rpc('log_audit', {
    p_action: action,
    p_entity: entity,
    p_entity_id: entityId,
    p_details: details,
  });
}