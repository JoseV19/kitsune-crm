import { SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';
import { useSupabaseClient } from '@/lib/services/supabase/client';

/**
 * Storage service with organization context
 * All file operations are scoped to organization
 */
export class StorageService {
  private organizationId: string | null = null;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Set the organization context for all operations
   */
  setOrganizationId(organizationId: string | null) {
    this.organizationId = organizationId;
  }

  /**
   * Ensure organization context is set
   */
  private ensureOrganizationContext() {
    if (!this.organizationId) {
      throw new Error('Organization context is required. Please set organization ID.');
    }
  }

  /**
   * Upload organization logo
   */
  async uploadOrganizationLogo(file: File): Promise<string> {
    this.ensureOrganizationContext();
    const fileExt = file.name.split('.').pop();
    const fileName = `${this.organizationId}/logo.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage
      .from('organization-logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = this.supabase.storage
      .from('organization-logos')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Upload client logo
   */
  async uploadClientLogo(file: File, clientId: string): Promise<string> {
    this.ensureOrganizationContext();
    const fileExt = file.name.split('.').pop();
    const fileName = `${this.organizationId}/clients/${clientId}.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage
      .from('logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = this.supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Upload deal attachment
   */
  async uploadDealAttachment(file: File, dealId: string): Promise<string> {
    this.ensureOrganizationContext();
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${this.organizationId}/deals/${dealId}/${timestamp}.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage
      .from('deal_attachments')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = this.supabase.storage
      .from('deal_attachments')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Upload product image
   */
  async uploadProductImage(file: File, productId: string): Promise<string> {
    this.ensureOrganizationContext();
    const fileExt = file.name.split('.').pop();
    const fileName = `${this.organizationId}/products/${productId}.${fileExt}`;

    const { error: uploadError } = await this.supabase.storage
      .from('product-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = this.supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    this.ensureOrganizationContext();
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  }
}

export function useStorageService(): StorageService {
  const supabase = useSupabaseClient();
  return useMemo(() => new StorageService(supabase), [supabase]);
}
