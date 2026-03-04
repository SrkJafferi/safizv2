import { supabase } from '../lib/supabase';

export const logAction = async (
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: any
) => {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: user?.id ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata: metadata ?? null
    });

  if (error) {
    throw error;
  }
};
