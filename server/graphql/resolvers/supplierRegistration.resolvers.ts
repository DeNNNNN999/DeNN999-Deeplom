import { GraphQLError } from 'graphql';
import { eq } from 'drizzle-orm';
import { suppliers, supplierCategoryMap } from '../../db/schema';
import { Context } from '../context';
import { createNotification } from '../../services/notification.service';
import { invalidateCacheByPattern } from '../../redis';

export const supplierRegistrationResolvers = {
  Mutation: {
    // Register a new supplier (public endpoint)
    registerSupplier: async (
      _: any,
      { input }: { input: any },
      { db, pubsub, req, redis }: Context
    ) => {
      try {
        // Extract category IDs from input and remove from main object
        const { categoryIds, ...supplierData } = input;
        
        // Check if supplier with same email or tax ID already exists
        const existingSupplier = await db.select()
          .from(suppliers)
          .where(
            eq(suppliers.email, supplierData.email)
          );
        
        if (existingSupplier.length) {
          return {
            success: false,
            message: 'A supplier with this email already exists',
            supplier: null
          };
        }
        
        // Check for duplicate tax ID
        const existingTaxId = await db.select()
          .from(suppliers)
          .where(
            eq(suppliers.taxId, supplierData.taxId)
          );
        
        if (existingTaxId.length) {
          return {
            success: false,
            message: 'A supplier with this tax ID already exists',
            supplier: null
          };
        }
        
        // Check for duplicate registration number
        const existingRegNumber = await db.select()
          .from(suppliers)
          .where(
            eq(suppliers.registrationNumber, supplierData.registrationNumber)
          );
        
        if (existingRegNumber.length) {
          return {
            success: false,
            message: 'A supplier with this registration number already exists',
            supplier: null
          };
        }
        
        // Create supplier with PENDING status
        const result = await db.insert(suppliers).values({
          ...supplierData,
          status: 'PENDING',
          notes: 'Self-registered supplier',
        }).returning();
        
        const newSupplier = result[0];
        
        // Add categories if provided
        if (categoryIds && categoryIds.length > 0) {
          const categoryEntries = categoryIds.map((categoryId: string) => ({
            supplierId: newSupplier.id,
            categoryId,
          }));
          
          await db.insert(supplierCategoryMap).values(categoryEntries);
        }
        
        // Create notification for procurement managers
        await createNotification(
          db,
          {
            type: 'SUPPLIER_CREATED',
            roleFilter: 'PROCUREMENT_MANAGER',
            title: 'New Supplier Registration',
            message: `A new supplier "${newSupplier.name}" has registered and is pending approval.`,
            entityType: 'SUPPLIER',
            entityId: newSupplier.id,
          }
        );
        
        // Publish subscription event
        pubsub.publish('SUPPLIER_STATUS_UPDATED', { 
          supplierStatusUpdated: newSupplier 
        });
        
        // Invalidate cache
        await invalidateCacheByPattern(redis, 'suppliers:*');
        
        return {
          success: true,
          message: 'Supplier registration submitted successfully. Your application is pending review.',
          supplier: newSupplier
        };
      } catch (error: any) {
        console.error('Error registering supplier:', error);
        
        return {
          success: false,
          message: error.message || 'An error occurred during registration',
          supplier: null
        };
      }
    },
  },
};