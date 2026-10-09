import { supabase } from '../../core/supabaseClient';

export interface LinkedPerson {
  id: string;
  name: string;
}

export interface ParentLink {
  id: string;
  email: string;
  name: string | null; // filled once that parent has an adult account
}

// Child adds a parent by email. Works even if the parent has not signed up yet.
export async function addParentByEmail(email: string): Promise<void> {
  const { error } = await supabase.rpc('add_parent_by_email', { p_email: email.trim().toLowerCase() });
  if (error) throw new Error(error.message);
}

// Child: linked parents, including ones still waiting to sign up
export async function listMyParents(): Promise<ParentLink[]> {
  const { data, error } = await supabase
    .from('parent_links')
    .select('id, parent_email, parent:profiles!parent_links_parent_id_fkey(name)')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  type Row = { id: string; parent_email: string; parent: { name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    email: r.parent_email,
    name: r.parent?.name ?? null,
  }));
}

// Adult: children who linked this account
export async function listMyChildren(): Promise<LinkedPerson[]> {
  const { data, error } = await supabase
    .from('parent_links')
    .select('child:profiles!parent_links_child_id_fkey(id, name)');
  if (error) throw new Error(error.message);
  type Row = { child: LinkedPerson | null };
  return ((data ?? []) as unknown as Row[])
    .map((r) => r.child)
    .filter((c): c is LinkedPerson => c !== null);
}

export async function removeLink(linkId: string): Promise<void> {
  const { error } = await supabase.from('parent_links').delete().eq('id', linkId);
  if (error) throw new Error(error.message);
}