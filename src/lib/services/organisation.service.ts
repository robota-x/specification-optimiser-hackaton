/**
 * Organisation Service - Manages user organisation relationships
 */

import { supabase } from '@/integrations/supabase/client';

// Fallback organisation ID from seed data
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Get the organisation ID for the current user
 * Creates a default organisation if none exists
 */
export async function getUserOrganisationId(): Promise<string> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    // For now, use the default organisation from seed data
    // In a production multi-tenant system, you would:
    // 1. Check if user has an organisation_id in their profile
    // 2. Or query a user_organisation junction table
    // 3. Create a new organisation if needed

    // Verify the default organisation exists
    const { data: org, error } = await supabase
      .from('organisation')
      .select('organisation_id')
      .eq('organisation_id', DEFAULT_ORG_ID)
      .single();

    if (error || !org) {
      // If the seed organisation doesn't exist, create it
      const { data: newOrg, error: createError } = await supabase
        .from('organisation')
        .insert({
          organisation_id: DEFAULT_ORG_ID,
          name: 'Default Organisation',
        })
        .select('organisation_id')
        .single();

      if (createError) {
        console.error('Error creating default organisation:', createError);
        // Return the ID anyway, RLS might allow the insert
        return DEFAULT_ORG_ID;
      }

      return newOrg.organisation_id;
    }

    return org.organisation_id;
  } catch (error) {
    console.error('Error getting user organisation:', error);
    // Fallback to default
    return DEFAULT_ORG_ID;
  }
}

/**
 * Create a new organisation for a user
 * (For future multi-tenant support)
 */
export async function createOrganisation(name: string): Promise<string> {
  const { data, error } = await supabase
    .from('organisation')
    .insert({ name })
    .select('organisation_id')
    .single();

  if (error) {
    throw new Error(`Failed to create organisation: ${error.message}`);
  }

  return data.organisation_id;
}
