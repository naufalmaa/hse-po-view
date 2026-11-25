import { db } from '../../db/index.ts';
import { subContractors, userContractors, users, contractorVessels, vessels } from '../../db/schema/auth.schema.ts';
import { employees } from '../../db/schema/employee.schema.ts';
import { eq, inArray, ilike, count, and, or, sql } from 'drizzle-orm';

export async function getAllSubContractors(
  category?: string[],
  page?: number,
  limit?: number,
  search?: string
): Promise<{
  data: { id: string; name: string; category: string | null; vessels: { id: string; vesselName: string; type: string | null; personnelCount: number }[] }[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
}> {
  // Calculate offset for pagination
  const pageNumber = page !== undefined ? Math.max(0, page) : 0;
  const limitNumber = limit !== undefined ? Math.max(1, limit) : 10;
  const offset = pageNumber * limitNumber;

  // If pagination is requested, get total count and apply limits
  if (page !== undefined && limit !== undefined) {
    // For search by vessel name, we need to get subcontractor IDs that match the search criteria
    let subcontractorIdsForSearch: string[] | null = null;
    
    if (search) {
      // Get subcontractor IDs that match the search in subcontractor name or vessel name
      const subcontractorResults = await db
        .selectDistinct({ id: subContractors.id })
        .from(subContractors)
        .leftJoin(contractorVessels, eq(subContractors.id, contractorVessels.contractorId))
        .leftJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
        .where(
          or(
            ilike(subContractors.name, `%${search}%`),
            ilike(vessels.vesselName, `%${search}%`)
          )
        );
      
      subcontractorIdsForSearch = subcontractorResults.map(result => result.id);
      
      // If no subcontractors match the search, return empty results
      if (subcontractorIdsForSearch.length === 0) {
        return {
          data: [],
          meta: {
            total: 0,
            page: pageNumber,
            limit: limitNumber,
            totalPages: 0
          }
        };
      }
    }

    // Build conditions for filtering
    const conditions = [];
    
    // Apply search filter if provided
    if (search && subcontractorIdsForSearch) {
      conditions.push(inArray(subContractors.id, subcontractorIdsForSearch));
    }
    
    // Apply category filter if provided
    if (category && category.length > 0) {
      // Separate null from other categories
      const nonNullCategories = category.filter(c => c !== 'null');
      const hasNull = category.includes('null');
      
      if (nonNullCategories.length > 0 && hasNull) {
        // Filter for specific categories OR null category
        conditions.push(
          or(
            inArray(subContractors.category, nonNullCategories),
            sql`${subContractors.category} IS NULL`
          )
        );
      } else if (nonNullCategories.length > 0) {
        // Filter for specific categories only
        conditions.push(inArray(subContractors.category, nonNullCategories));
      } else if (hasNull) {
        // Filter for null category only
        conditions.push(sql`${subContractors.category} IS NULL`);
      }
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // First get the total count
    const totalCountResult = await db.select({ count: count() })
      .from(subContractors)
      .where(whereClause);
      
    const total = Number(totalCountResult[0].count);
    const totalPages = Math.ceil(total / limitNumber);

    // Now get the actual data with pagination
    const subcontractors = await db.select({
      id: subContractors.id,
      name: subContractors.name,
      category: subContractors.category,
    })
    .from(subContractors)
    .where(whereClause)
    .limit(limitNumber)
    .offset(offset);

    // Get vessels for filtered subcontractors
    let vesselData: any[] = [];
    if (subcontractors.length > 0) {
      const subcontractorIds = subcontractors.map(s => s.id);
      vesselData = await db.select({
        contractorId: contractorVessels.contractorId,
        vesselId: vessels.id,
        vesselName: vessels.vesselName,
        type: vessels.type,
      })
      .from(contractorVessels)
      .innerJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
      .where(inArray(contractorVessels.contractorId, subcontractorIds));
    }

    // Get personnel count for each vessel
    const vesselPersonnelCount: Record<string, number> = {};
    if (vesselData.length > 0) {
      const vesselIds = vesselData.map(v => v.vesselId);
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

    // Group vessels by contractor ID
    const vesselMap = new Map<string, { id: string; vesselName: string; type: string | null; personnelCount: number }[]>();
    vesselData.forEach(vessel => {
      if (!vesselMap.has(vessel.contractorId)) {
        vesselMap.set(vessel.contractorId, []);
      }
      vesselMap.get(vessel.contractorId)?.push({
        id: vessel.vesselId,
        vesselName: vessel.vesselName,
        type: vessel.type,
        personnelCount: vesselPersonnelCount[vessel.vesselId] || 0,
      });
    });

    // Combine subcontractors with their vessels
    const data = subcontractors.map(subcontractor => ({
      id: subcontractor.id,
      name: subcontractor.name,
      category: subcontractor.category,
      vessels: vesselMap.get(subcontractor.id) || []
    }));

    return {
      data,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages
      }
    };
  } else {
    // No pagination - return all results (following the existing pattern)
    // For search by vessel name, we need to get subcontractor IDs that match the search criteria
    let subcontractorIdsForSearch: string[] | null = null;
    
    if (search) {
      // Get subcontractor IDs that match the search in subcontractor name or vessel name
      const subcontractorResults = await db
        .selectDistinct({ id: subContractors.id })
        .from(subContractors)
        .leftJoin(contractorVessels, eq(subContractors.id, contractorVessels.contractorId))
        .leftJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
        .where(
          or(
            ilike(subContractors.name, `%${search}%`),
            ilike(vessels.vesselName, `%${search}%`)
          )
        );
      
      subcontractorIdsForSearch = subcontractorResults.map(result => result.id);
      
      // If no subcontractors match the search, return empty results
      if (subcontractorIdsForSearch.length === 0) {
        return { 
          data: [],
          meta: {
            total: 0,
            page: 0,
            limit: 10,
            totalPages: 0
          }
        };
      }
    }

    // If category is provided and is an empty array, return all subcontractors (same as no filter)
    if (category && category.length === 0) {
      // Build conditions for the subcontractors query
      const subContractorConditions = [];
      
      // Apply search filter if provided
      if (search && subcontractorIdsForSearch) {
        subContractorConditions.push(inArray(subContractors.id, subcontractorIdsForSearch));
      }
      
      const subContractorWhereClause = subContractorConditions.length > 0 ? and(...subContractorConditions) : undefined;
      
      const subcontractors = await db.select({
        id: subContractors.id,
        name: subContractors.name,
        category: subContractors.category,
      }).from(subContractors)
      .where(subContractorWhereClause);

      // Build conditions for the vessel query
      const vesselConditions = [];
      
      // Filter vessels by subcontractor IDs if search is applied
      if (search && subcontractorIdsForSearch) {
        vesselConditions.push(inArray(contractorVessels.contractorId, subcontractorIdsForSearch));
      }
      
      const vesselWhereClause = vesselConditions.length > 0 ? and(...vesselConditions) : undefined;

      // Get all vessels for all subcontractors
      const vesselData = await db.select({
        contractorId: contractorVessels.contractorId,
        vesselId: vessels.id,
        vesselName: vessels.vesselName,
        type: vessels.type,
      })
      .from(contractorVessels)
      .innerJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
      .where(vesselWhereClause);

      // Get personnel count for each vessel
      const vesselPersonnelCount: Record<string, number> = {};
      if (vesselData.length > 0) {
        const vesselIds = vesselData.map(v => v.vesselId);
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

      // Group vessels by contractor ID
      const vesselMap = new Map<string, { id: string; vesselName: string; type: string | null; personnelCount: number }[]>();
      vesselData.forEach(vessel => {
        if (!vesselMap.has(vessel.contractorId)) {
          vesselMap.set(vessel.contractorId, []);
        }
        vesselMap.get(vessel.contractorId)?.push({
          id: vessel.vesselId,
          vesselName: vessel.vesselName,
          type: vessel.type,
          personnelCount: vesselPersonnelCount[vessel.vesselId] || 0,
        });
      });

      // Combine subcontractors with their vessels
      const data = subcontractors.map(subcontractor => ({
        id: subcontractor.id,
        name: subcontractor.name,
        category: subcontractor.category,
        vessels: vesselMap.get(subcontractor.id) || []
      }));

      return { 
        data,
        meta: {
          total: data.length,
          page: 0,
          limit: data.length,
          totalPages: 1
        }
      };
    }

    // If category is provided and not empty, filter by category
    if (category && category.length > 0) {
      // Build conditions for the subcontractors query
      const subContractorConditions = [];
      
      // Apply category filter - include null categories if 'null' is in the filter
      const nonNullCategories = category.filter(c => c !== 'null');
      const hasNull = category.includes('null');
      
      if (nonNullCategories.length > 0 && hasNull) {
        // Filter for specific categories OR null category
        subContractorConditions.push(
          or(
            inArray(subContractors.category, nonNullCategories),
            sql`${subContractors.category} IS NULL`
          )
        );
      } else if (nonNullCategories.length > 0) {
        // Filter for specific categories only
        subContractorConditions.push(inArray(subContractors.category, nonNullCategories));
      } else if (hasNull) {
        // Filter for null category only
        subContractorConditions.push(sql`${subContractors.category} IS NULL`);
      }
      
      // Apply search filter if provided
      if (search && subcontractorIdsForSearch) {
        subContractorConditions.push(inArray(subContractors.id, subcontractorIdsForSearch));
      }
      
      const subContractorWhereClause = subContractorConditions.length > 0 ? and(...subContractorConditions) : undefined;
      
      const subcontractors = await db.select({
        id: subContractors.id,
        name: subContractors.name,
        category: subContractors.category,
      }).from(subContractors)
      .where(subContractorWhereClause);

      // Get vessels for filtered subcontractors
      if (subcontractors.length === 0) {
        return { 
          data: [],
          meta: {
            total: 0,
            page: 0,
            limit: 10,
            totalPages: 0
          }
        };
      }

      const subcontractorIds = subcontractors.map(s => s.id);
      
      // Build conditions for the vessel query
      const vesselConditions = [];
      
      // Always filter by subcontractor IDs
      vesselConditions.push(inArray(contractorVessels.contractorId, subcontractorIds));
      
      // Additionally filter by search if provided
      if (search && subcontractorIdsForSearch) {
        vesselConditions.push(inArray(contractorVessels.contractorId, subcontractorIdsForSearch));
      }
      
      const vesselWhereClause = vesselConditions.length > 0 ? and(...vesselConditions) : undefined;

      // Get vessels for filtered subcontractors
      const vesselData = await db.select({
        contractorId: contractorVessels.contractorId,
        vesselId: vessels.id,
        vesselName: vessels.vesselName,
        type: vessels.type,
      })
      .from(contractorVessels)
      .innerJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
      .where(vesselWhereClause);

      // Get personnel count for each vessel
      const vesselPersonnelCount: Record<string, number> = {};
      if (vesselData.length > 0) {
        const vesselIds = vesselData.map(v => v.vesselId);
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

      // Group vessels by contractor ID
      const vesselMap = new Map<string, { id: string; vesselName: string; type: string | null; personnelCount: number }[]>();
      vesselData.forEach(vessel => {
        if (!vesselMap.has(vessel.contractorId)) {
          vesselMap.set(vessel.contractorId, []);
        }
        vesselMap.get(vessel.contractorId)?.push({
          id: vessel.vesselId,
          vesselName: vessel.vesselName,
          type: vessel.type,
          personnelCount: vesselPersonnelCount[vessel.vesselId] || 0,
        });
      });

      // Combine subcontractors with their vessels
      const data = subcontractors.map(subcontractor => ({
        id: subcontractor.id,
        name: subcontractor.name,
        category: subcontractor.category,
        vessels: vesselMap.get(subcontractor.id) || []
      }));

      return { 
        data,
        meta: {
          total: data.length,
          page: 0,
          limit: data.length,
          totalPages: 1
        }
      };
    }

    // If no category filter, return all subcontractors (excluding null categories)
    // Build conditions for the subcontractors query
    const subContractorConditions = [];
    
    // Apply search filter if provided
    if (search && subcontractorIdsForSearch) {
      subContractorConditions.push(inArray(subContractors.id, subcontractorIdsForSearch));
    }
    
    const subContractorWhereClause = subContractorConditions.length > 0 ? and(...subContractorConditions) : undefined;
    
    const subcontractors = await db.select({
      id: subContractors.id,
      name: subContractors.name,
      category: subContractors.category,
    }).from(subContractors)
    .where(subContractorWhereClause);

    // Build conditions for the vessel query
    const vesselConditions = [];
    
    // Filter vessels by subcontractor IDs if search is applied
    if (search && subcontractorIdsForSearch) {
      vesselConditions.push(inArray(contractorVessels.contractorId, subcontractorIdsForSearch));
    }
    
    const vesselWhereClause = vesselConditions.length > 0 ? and(...vesselConditions) : undefined;

    // Get all vessels for all subcontractors
    const vesselData = await db.select({
      contractorId: contractorVessels.contractorId,
      vesselId: vessels.id,
      vesselName: vessels.vesselName,
      type: vessels.type,
    })
    .from(contractorVessels)
    .innerJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
    .where(vesselWhereClause);

    // Get personnel count for each vessel
    const vesselPersonnelCount: Record<string, number> = {};
    if (vesselData.length > 0) {
      const vesselIds = vesselData.map(v => v.vesselId);
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

    // Group vessels by contractor ID
    const vesselMap = new Map<string, { id: string; vesselName: string; type: string | null; personnelCount: number }[]>();
    vesselData.forEach(vessel => {
      if (!vesselMap.has(vessel.contractorId)) {
        vesselMap.set(vessel.contractorId, []);
      }
      vesselMap.get(vessel.contractorId)?.push({
        id: vessel.vesselId,
        vesselName: vessel.vesselName,
        type: vessel.type,
        personnelCount: vesselPersonnelCount[vessel.vesselId] || 0,
      });
    });

    // Combine subcontractors with their vessels
    const data = subcontractors.map(subcontractor => ({
      id: subcontractor.id,
      name: subcontractor.name,
      category: subcontractor.category,
      vessels: vesselMap.get(subcontractor.id) || []
    }));

    return { 
      data,
      meta: {
        total: data.length,
        page: 0,
        limit: data.length,
        totalPages: 1
      }
    };
  }
}

export async function getSubContractorsByUserId(
  userId: string,
  page?: number,
  limit?: number,
  search?: string
): Promise<{
  data: { id: string; name: string; category: string | null }[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
}> {
  // Calculate offset for pagination
  const pageNumber = page !== undefined ? Math.max(0, page) : 0;
  const limitNumber = limit !== undefined ? Math.max(1, limit) : 10;
  const offset = pageNumber * limitNumber;

  // If pagination is requested, get total count and apply limits
  if (page !== undefined && limit !== undefined) {
    // For search by vessel name, we need to get subcontractor IDs that match the search criteria
    let subcontractorIdsForSearch: string[] | null = null;
    
    if (search) {
      // Get subcontractor IDs that match the search in subcontractor name or vessel name
      const subcontractorResults = await db
        .selectDistinct({ id: subContractors.id })
        .from(subContractors)
        .innerJoin(userContractors, eq(subContractors.id, userContractors.contractorId))
        .leftJoin(contractorVessels, eq(subContractors.id, contractorVessels.contractorId))
        .leftJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
        .where(
          and(
            eq(userContractors.userId, userId),
            or(
              ilike(subContractors.name, `%${search}%`),
              ilike(vessels.vesselName, `%${search}%`)
            )
          )
        );
      
      subcontractorIdsForSearch = subcontractorResults.map(result => result.id);
      
      // If no subcontractors match the search, return empty results
      if (subcontractorIdsForSearch.length === 0) {
        return {
          data: [],
          meta: {
            total: 0,
            page: pageNumber,
            limit: limitNumber,
            totalPages: 0
          }
        };
      }
    }

    // Build conditions for filtering
    const conditions = [eq(userContractors.userId, userId)];
    
    // Apply search filter if provided
    if (search && subcontractorIdsForSearch) {
      conditions.push(inArray(subContractors.id, subcontractorIdsForSearch));
    }
    
    const whereClause = and(...conditions);

    // First get the total count
    const totalCountResult = await db.select({ count: count() })
      .from(userContractors)
      .innerJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
      .where(whereClause);
      
    const total = Number(totalCountResult[0].count);
    const totalPages = Math.ceil(total / limitNumber);

    // Now get the actual data with pagination
    const data = await db
      .select({
        id: subContractors.id,
        name: subContractors.name,
        category: subContractors.category,
      })
      .from(userContractors)
      .innerJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
      .where(whereClause)
      .limit(limitNumber)
      .offset(offset);

    return {
      data,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages
      }
    };
  } else {
    // No pagination - return all results
    // For search by vessel name, we need to get subcontractor IDs that match the search criteria
    let subcontractorIdsForSearch: string[] | null = null;
    
    if (search) {
      // Get subcontractor IDs that match the search in subcontractor name or vessel name
      const subcontractorResults = await db
        .selectDistinct({ id: subContractors.id })
        .from(subContractors)
        .innerJoin(userContractors, eq(subContractors.id, userContractors.contractorId))
        .leftJoin(contractorVessels, eq(subContractors.id, contractorVessels.contractorId))
        .leftJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
        .where(
          and(
            eq(userContractors.userId, userId),
            or(
              ilike(subContractors.name, `%${search}%`),
              ilike(vessels.vesselName, `%${search}%`)
            )
          )
        );
      
      subcontractorIdsForSearch = subcontractorResults.map(result => result.id);
      
      // If no subcontractors match the search, return empty results
      if (subcontractorIdsForSearch.length === 0) {
        return { data: [] };
      }
    }

    // Build the base query
    let query = db
      .select({
        id: subContractors.id,
        name: subContractors.name,
        category: subContractors.category,
      })
      .from(userContractors)
      .innerJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
      .where(eq(userContractors.userId, userId));
    
    // Apply search filter if provided
    if (search && subcontractorIdsForSearch) {
      query = db
        .select({
          id: subContractors.id,
          name: subContractors.name,
          category: subContractors.category,
        })
        .from(userContractors)
        .innerJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
        .where(
          and(
            eq(userContractors.userId, userId),
            inArray(subContractors.id, subcontractorIdsForSearch)
          )
        );
    }
    
    const data = await query;
    
    return { data };
  }
}

export async function getUserWithSubContractorsById(userId: string) {
  // First, fetch the complete user object
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  
  if (!user) return null;

  const base: any = { ...user };

  // Then fetch contractor info separately
  const result = await db
    .select({
      contractorId: subContractors.id,
      contractorName: subContractors.name,
    })
    .from(userContractors)
    .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
    .where(eq(userContractors.userId, userId));

  // Only add subContractors for contractor role
  if ((base as any).role === 'contractor') {
    base.subContractors = [] as { id: string; name: string }[];
    for (const row of result) {
      if (row.contractorId && row.contractorName) {
        base.subContractors.push({
          id: row.contractorId,
          name: row.contractorName,
        });
      }
    }
  }

  // If user is a crew member, also fetch vessel information
  if (base.role === 'crew') {
    const vesselInfo = await db
      .select({
        vesselId: vessels.id,
        vesselName: vessels.vesselName,
        vesselType: vessels.type,
      })
      .from(users)
      .leftJoin(userContractors, eq(users.id, userContractors.userId))
      .leftJoin(contractorVessels, eq(userContractors.contractorId, contractorVessels.contractorId))
      .leftJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
      .where(eq(users.id, userId))
      .limit(1);
    
    if (vesselInfo.length > 0 && vesselInfo[0].vesselId) {
      (base as any).vessel = {
        id: vesselInfo[0].vesselId,
        name: vesselInfo[0].vesselName,
        type: vesselInfo[0].vesselType,
      };
    }
  }

  return base;
}

export async function getUsersWithSubContractorsByIds(userIds: string[]) {
  if (userIds.length === 0) return {};

  const subs = await db
    .select({
      userId: userContractors.userId,
      contractorId: subContractors.id,
      contractorName: subContractors.name,
    })
    .from(userContractors)
    .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
    .where(inArray(userContractors.userId, userIds));

  const map: Record<string, { id: string; name: string }[]> = {};

  for (const row of subs) {
    if (row.contractorId && row.contractorName) {
      if (!map[row.userId]) map[row.userId] = [];
      map[row.userId].push({
        id: row.contractorId,
        name: row.contractorName,
      });
    }
  }

  return map;
}

/**
 * Get vessel information for crew users
 * @param userIds Array of user IDs to fetch vessel information for
 * @returns A map of user IDs to their vessel information
 */
export async function getCrewVesselsByUserIds(userIds: string[]) {
  if (userIds.length === 0) return {};

  const result = await db
    .select({
      userId: users.id,
      vesselId: vessels.id,
      vesselName: vessels.vesselName,
      vesselType: vessels.type,
    })
    .from(users)
    .leftJoin(userContractors, eq(users.id, userContractors.userId))
    .leftJoin(contractorVessels, eq(userContractors.contractorId, contractorVessels.contractorId))
    .leftJoin(vessels, eq(contractorVessels.vesselId, vessels.id))
    .where(inArray(users.id, userIds));

  const map: Record<string, { id: string; name: string; type: string | null } | null> = {};

  for (const row of result) {
    // Only set vessel info if the user is a crew member and has a vessel
    if (row.vesselId) {
      map[row.userId] = {
        id: row.vesselId,
        name: row.vesselName || '',
        type: row.vesselType,
      };
    } else {
      map[row.userId] = null;
    }
  }

  return map;
}

/**
 * Get sub-contractors and vessel information for users
 * @param userIds Array of user IDs to fetch information for
 * @returns A map of user IDs to their sub-contractors and vessel information
 */
export async function getUsersWithSubContractorsAndVessels(userIds: string[]) {
  if (userIds.length === 0) return {};

  // First, get sub-contractors for all users
  const subs = await db
    .select({
      userId: userContractors.userId,
      contractorId: subContractors.id,
      contractorName: subContractors.name,
    })
    .from(userContractors)
    .leftJoin(subContractors, eq(userContractors.contractorId, subContractors.id))
    .where(inArray(userContractors.userId, userIds));

  // Then, get vessel information for crew members using vesselId from userContractors
  const vesselResult = await db
    .select({
      userId: users.id,
      role: users.role,
      vesselId: userContractors.vesselId,
      vesselName: vessels.vesselName,
      vesselType: vessels.type,
    })
    .from(users)
    .leftJoin(userContractors, eq(users.id, userContractors.userId))
    .leftJoin(vessels, eq(userContractors.vesselId, vessels.id))
    .where(inArray(users.id, userIds));

  // ... existing code ...
  // Build the map with both sub-contractors and vessel information
  const map: Record<string, { 
    subContractors: { id: string; name: string }[]; 
    vessel: { id: string; name: string; type: string | null } | null 
  }> = {};

  // Initialize all users in the map
  for (const userId of userIds) {
    map[userId] = {
      subContractors: [],
      vessel: null
    };
  }

  // Populate sub-contractors
  for (const row of subs) {
    if (row.contractorId && row.contractorName) {
      if (!map[row.userId].subContractors) map[row.userId].subContractors = [];
      map[row.userId].subContractors.push({
        id: row.contractorId,
        name: row.contractorName,
      });
    }
  }

  // Populate vessel information for crew members
  for (const row of vesselResult) {
    // Only set vessel info if the user is a crew member and has a vessel
    if (row.role === 'crew' && row.vesselId) {
      map[row.userId].vessel = {
        id: row.vesselId,
        name: row.vesselName || '',
        type: row.vesselType,
      };
    }
  }

  return map;
}