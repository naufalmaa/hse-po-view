import { db } from '../../db/index.ts';
import { contractorVessels, subContractors, vessels, userContractors } from '../../db/schema/auth.schema.ts';
import { employees } from '../../db/schema/employee.schema.ts';
import { eq, and, like, asc, desc, count, or, inArray } from 'drizzle-orm';
import type { ListContractorsVesselsParams } from '../../types/user.ts';

interface AssignVesselToContractorInput {
  contractorId: string;
  vesselId: string;
}

// New interface for bulk assignment
interface AssignVesselsToContractorInput {
  contractorId: string;
  vesselId: string[];
}

interface RemoveVesselFromContractorInput {
  contractorId: string;
  vesselId: string;
}

// Define the return type for listAllContractorVessels
interface ContractorVessel {
  id: string;
  vesselName: string;
  type: string | null;
  personnelCount: number | null;
}

interface ContractorVesselGroup {
  contractor: {
    id: string;
    name: string;
  };
  vessels: ContractorVessel[];
}

interface ListContractorVesselsResult {
  data: ContractorVesselGroup[];
  meta: {
    total: number;
    page: number;
    view: number;
    totalPages: number;
  };
}


/**
 * Assign a vessel to a contractor
 */
export async function assignVesselToContractor(input: AssignVesselToContractorInput): Promise<any | undefined> {
  const { contractorId, vesselId } = input;

  try {
    // Check if contractor exists
    const contractorExists = await db.select().from(subContractors).where(eq(subContractors.id, contractorId));
    if (contractorExists.length === 0) {
      return { success: false, error: 'Contractor not found' };
    }

    // Check if vessel exists
    const vesselExists = await db.select().from(vessels).where(eq(vessels.id, vesselId));
    if (vesselExists.length === 0) {
      return { success: false, error: 'Vessel not found' };
    }

    // Check if the relationship already exists
    const existingRelationship = await db.select()
      .from(contractorVessels)
      .where(and(
        eq(contractorVessels.contractorId, contractorId),
        eq(contractorVessels.vesselId, vesselId)
      ));
      
    if (existingRelationship.length > 0) {
      return { success: false, error: 'Vessel is already assigned to this contractor' };
    }

    // Create the relationship
    const result = await db.insert(contractorVessels).values({
      contractorId,
      vesselId
    }).returning();

    return { success: true, data: result[0] };
  } catch (err) {
    return {
      success: false,
      error: typeof err === 'object' && err !== null ? String(err) : 'Unknown error',
    };
  }
}

/**
 * Assign multiple vessels to a contractor
 */
export async function assignVesselsToContractor(input: AssignVesselsToContractorInput): Promise<any | undefined> {
  const { contractorId, vesselId } = input;

  try {
    // Check if contractor exists
    const contractorExists = await db.select().from(subContractors).where(eq(subContractors.id, contractorId));
    if (contractorExists.length === 0) {
      return { success: false, error: 'Contractor not found' };
    }

    // Validate all vessels exist
    const existingVessels = await db.select().from(vessels).where(inArray(vessels.id, vesselId));
    if (existingVessels.length !== vesselId.length) {
      return { success: false, error: 'One or more vessels not found' };
    }

    // Check for existing relationships to avoid duplicates
    const existingRelationships = await db.select()
      .from(contractorVessels)
      .where(and(
        eq(contractorVessels.contractorId, contractorId),
        inArray(contractorVessels.vesselId, vesselId)
      ));

    if (existingRelationships.length > 0) {
      const existingVesselIds = existingRelationships.map(rel => rel.vesselId);
      return { success: false, error: `Vessels with IDs [${existingVesselIds.join(', ')}] are already assigned to this contractor` };
    }

    // Create all relationships
    const values = vesselId.map(vesselId => ({
      contractorId,
      vesselId
    }));

    const result = await db.insert(contractorVessels).values(values).returning();
    return { result };
  } catch (err) {
    return {
      success: false,
      error: typeof err === 'object' && err !== null ? String(err) : 'Unknown error',
    };
  }
}

/**
 * Remove a vessel from a contractor
 */
export async function removeVesselFromContractor(input: RemoveVesselFromContractorInput): Promise<any | undefined> {
  const { contractorId, vesselId } = input;

  try {
    // Check if the relationship exists
    const existingRelationship = await db.select()
      .from(contractorVessels)
      .where(and(
        eq(contractorVessels.contractorId, contractorId),
        eq(contractorVessels.vesselId, vesselId)
      ));
      
    if (existingRelationship.length === 0) {
      return { success: false, error: 'Vessel is not assigned to this contractor' };
    }

    // Check if the vessel is connected to any users
    const usersWithVessel = await db.select({ count: count() })
      .from(userContractors)
      .where(eq(userContractors.vesselId, vesselId));

    if (usersWithVessel[0].count > 0) {
      return { success: false, error: `Cannot delete this vessel because it is already assigned to ${usersWithVessel[0].count} user(s). Please remove all user associations first.` };
    }

    // Remove the relationship
    await db.delete(contractorVessels)
      .where(and(
        eq(contractorVessels.contractorId, contractorId),
        eq(contractorVessels.vesselId, vesselId)
      ));
    
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: typeof err === 'object' && err !== null ? String(err) : 'Unknown error',
    };
  }
}

/**
 * Enhanced function to list contractor vessels with more flexible filtering options
 */
export async function listAllContractorVessels(
  input: ListContractorsVesselsParams
): Promise<ListContractorVesselsResult> {
  const {
    contractorId,
    vesselId,
    search = '',
    sortBy = 'contractorName',
    orderBy = 'asc',
    page,
    limit,
  } = input;

  const offset = page !== undefined && limit !== undefined ? page * limit : 0;
  const hasPagination = page !== undefined && limit !== undefined;
  
  // Base query for data
  let baseQuery = db
    .select({
      contractorId: subContractors.id,
      contractorName: subContractors.name,
      vesselId: vessels.id,
      vesselName: vessels.vesselName,
      type: vessels.type,
    })
    .from(contractorVessels)
    .innerJoin(subContractors, eq(contractorVessels.contractorId, subContractors.id))
    .innerJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
    .$dynamic();

  // Apply filters
  const conditions = [];
  
  if (contractorId) {
    conditions.push(eq(contractorVessels.contractorId, contractorId));
  }
  
  if (vesselId) {
    conditions.push(eq(contractorVessels.vesselId, vesselId));
  }

  // Search filter (across contractor name and vessel name)
  if (search?.trim()) {
    const searchTerm = `%${search.trim()}%`;
    conditions.push(
      or(
        like(subContractors.name, searchTerm),
        like(vessels.vesselName, searchTerm)
      )
    );
  }

  // Date filters would typically be applied to a date field in the database
  // Since contractorVessels doesn't have date fields, we'll just pass through
  // the date parameters to maintain API consistency

  if (conditions.length > 0) {
    baseQuery.where(and(...conditions));
  }

  // Apply sorting
  const orderDirection = orderBy === 'asc' ? asc : desc;
  const sortColumn = {
    vesselName: vessels.vesselName,
    type: vessels.type,
    personnelCount: vessels.personnelCount,
    contractorName: subContractors.name,
  }[sortBy] ?? subContractors.name;

  baseQuery.orderBy(orderDirection(sortColumn));

  // Count query for pagination
  let countQuery = db
    .select({ count: count() })
    .from(contractorVessels)
    .innerJoin(subContractors, eq(contractorVessels.contractorId, subContractors.id))
    .innerJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
    .$dynamic();

  if (conditions.length > 0) {
    countQuery.where(and(...conditions));
  }
  
  // Apply pagination to the base query
  if (hasPagination) {
    baseQuery.limit(limit!).offset(offset);
  }

  const results = await baseQuery;

  // Get personnel count for all vessels in the results
  const vesselPersonnelCount: Record<string, number> = {};
  if (results.length > 0) {
    const vesselIds = [...new Set(results.map(r => r.vesselId))];
    const personnelCountData = await db.select({
      vesselId: employees.vesselId,
      count: count(),
    })
    .from(employees)
    .where(inArray(employees.vesselId, vesselIds))
    .groupBy(employees.vesselId);
    
    personnelCountData.forEach(item => {
      if (item.vesselId) {
        vesselPersonnelCount[item.vesselId] = Number(item.count);
      }
    });
  }

  // Group vessels by contractor
  const contractorMap = new Map<string, {
    contractor: {
      id: string;
      name: string;
    };
    vessels: Array<{
      id: string;
      vesselName: string;
      type: string | null;
      personnelCount: number | null;
    }>;
  }>();

  results.forEach(row => {
    const contractorKey = row.contractorId;
    
    if (!contractorMap.has(contractorKey)) {
      contractorMap.set(contractorKey, {
        contractor: {
          id: row.contractorId,
          name: row.contractorName,
        },
        vessels: []
      });
    }
    
    const contractorEntry = contractorMap.get(contractorKey)!;
    contractorEntry.vessels.push({
      id: row.vesselId,
      vesselName: row.vesselName,
      type: row.type,
      personnelCount: vesselPersonnelCount[row.vesselId] || 0,
    });
  });
  
  // Calculate totalPages based on unique contractors rather than contractor-vessel pairs
  const uniqueContractors = new Set(results.map(r => r.contractorId)).size;
  const totalPages = hasPagination ? Math.ceil(uniqueContractors / limit!) : 1;

  // Since we don't have actual date fields in contractorVessels, we'll return empty strings
  // In a real implementation, these would be derived from actual date data
  return {
    data: Array.from(contractorMap.values()),
    meta: {
      total: uniqueContractors,
      page: hasPagination ? page! : 0,
      view: hasPagination ? limit! : uniqueContractors,
      totalPages,
    },
  };
}

/**
 * Get contractor by vessel ID
 */
export async function getContractorByVesselId(vesselId: string) {
  const result = await db
    .select({
      id: subContractors.id,
      name: subContractors.name,
    })
    .from(contractorVessels)
    .innerJoin(subContractors, eq(contractorVessels.contractorId, subContractors.id))
    .where(eq(contractorVessels.vesselId, vesselId))
    .limit(1);
    
  return result.length > 0 ? result[0] : null;
}