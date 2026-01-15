import { supabase } from './client';
import { Client, Deal, Product, Contact, Activity, DealItem } from '@/types/crm';
import { OrganizationSettings } from '@/types/crm';

/**
 * Database service with organization context
 * All operations automatically filter by organization_id from organization context
 */
export class DatabaseService {
  private organizationId: string | null = null;

  /**
   * Set the organization context for all operations
   */
  setOrganizationId(organizationId: string | null) {
    this.organizationId = organizationId;
  }

  /**
   * Get current organization ID
   */
  getOrganizationId(): string | null {
    return this.organizationId;
  }

  /**
   * Ensure organization context is set
   */
  private ensureOrganizationContext() {
    if (!this.organizationId) {
      throw new Error('Organization context is required. Please set organization ID.');
    }
  }

  // ========== CLIENT OPERATIONS ==========

  async getClients(): Promise<Client[]> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', this.organizationId!)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getClientById(id: string): Promise<Client | null> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('organization_id', this.organizationId!)
      .single();

    if (error) return null;
    return data;
  }

  async createClient(client: Omit<Client, 'id' | 'created_at'>): Promise<Client> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...client,
        organization_id: this.organizationId!,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', this.organizationId!)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteClient(id: string): Promise<void> {
    this.ensureOrganizationContext();
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('organization_id', this.organizationId!);

    if (error) throw error;
  }

  // ========== DEAL OPERATIONS ==========

  async getDeals(): Promise<Deal[]> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('organization_id', this.organizationId!)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getDealById(id: string): Promise<Deal | null> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .eq('organization_id', this.organizationId!)
      .single();

    if (error) return null;
    return data;
  }

  async createDeal(deal: Omit<Deal, 'id' | 'created_at'>): Promise<Deal> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('deals')
      .insert({
        ...deal,
        organization_id: this.organizationId!,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', this.organizationId!)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteDeal(id: string): Promise<void> {
    this.ensureOrganizationContext();
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id)
      .eq('organization_id', this.organizationId!);

    if (error) throw error;
  }

  // ========== PRODUCT OPERATIONS ==========

  async getProducts(): Promise<Product[]> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', this.organizationId!)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...product,
        organization_id: this.organizationId!,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', this.organizationId!)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProduct(id: string): Promise<void> {
    this.ensureOrganizationContext();
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('organization_id', this.organizationId!);

    if (error) throw error;
  }

  // ========== CONTACT OPERATIONS ==========

  async getContacts(clientId: string): Promise<Contact[]> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createContact(contact: Omit<Contact, 'id' | 'created_at'>): Promise<Contact> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('contacts')
      .insert(contact)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ========== ACTIVITY OPERATIONS ==========

  async getActivities(clientId: string): Promise<Activity[]> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('client_activities')
      .select('*')
      .eq('client_id', clientId)
      .eq('organization_id', this.organizationId!)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createActivity(activity: Omit<Activity, 'id' | 'created_at'>): Promise<Activity> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('client_activities')
      .insert({
        ...activity,
        organization_id: this.organizationId!,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ========== DEAL ITEM OPERATIONS ==========

  async getDealItems(dealId: string): Promise<DealItem[]> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('deal_items')
      .select('*, product:products(name, sku)')
      .eq('deal_id', dealId)
      .eq('organization_id', this.organizationId!);

    if (error) throw error;
    return data || [];
  }

  async createDealItem(item: Omit<DealItem, 'id' | 'organization_id'>): Promise<DealItem> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('deal_items')
      .insert({
        ...item,
        organization_id: this.organizationId!,
      })
      .select('*, product:products(name)')
      .single();

    if (error) throw error;
    return data;
  }

  async updateDealItem(id: string, updates: Partial<DealItem>): Promise<DealItem> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('deal_items')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', this.organizationId!)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteDealItem(id: string): Promise<void> {
    this.ensureOrganizationContext();
    const { error } = await supabase
      .from('deal_items')
      .delete()
      .eq('id', id)
      .eq('organization_id', this.organizationId!);

    if (error) throw error;
  }

  // ========== ORGANIZATION SETTINGS ==========

  async getOrganizationSettings(): Promise<OrganizationSettings | null> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', this.organizationId!)
      .single();

    if (error) return null;
    return data;
  }

  async updateOrganizationSettings(settings: Partial<OrganizationSettings>): Promise<OrganizationSettings> {
    this.ensureOrganizationContext();
    const { data, error } = await supabase
      .from('organization_settings')
      .update(settings)
      .eq('organization_id', this.organizationId!)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// Export singleton instance
export const db = new DatabaseService();
