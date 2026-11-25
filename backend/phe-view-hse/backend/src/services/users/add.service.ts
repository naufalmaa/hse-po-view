import { db } from '../../db/index.ts';
import { users, userContractors } from '../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';
import { getUserWithSubContractorsById } from './list.service.ts';
import { getContractorByVesselId } from './contractor-vessel.service.ts';

interface AssignRoleInput {
  userId: string;
  role?: 'user' | 'admin' | 'evaluator' | 'verifikator' | 'manager' | 'contractor' | 'crew';
  sub_contractor?: string[];
  vesselId?: string; // For crew role
}

type AssignRoleResult =
  | { success: true; user: any }
  | { success: false; error: string };

export async function assignUserRole(input: AssignRoleInput): Promise<AssignRoleResult> {
  const { userId, role, sub_contractor, vesselId } = input;

  try {
    if (role) {
      await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
    }

    // Handle contractor role
    if (role === 'contractor' && Array.isArray(sub_contractor) && sub_contractor.length > 0) {
      await db.insert(userContractors).values(
        sub_contractor.map(contractorId => ({ userId, contractorId }))
      );
    }

    // Handle crew role
    if (role === 'crew' && vesselId) {
      // Get the contractorId from the contractorVessels table using the vesselId
      const contractor = await getContractorByVesselId(vesselId);
      
      if (contractor) {
        // Insert the relationship between user, contractor, and vessel
        await db.insert(userContractors).values({
          userId,
          contractorId: contractor.id,
          vesselId
        });
      } else {
        return { success: false, error: 'No contractor found for the specified vessel' };
      }
    }

    const user = await getUserWithSubContractorsById(userId);
    if (!user) return { success: false, error: 'User not found after update' };

    return { success: true, user };
  } catch (err) {
    return {
      success: false,
      error: typeof err === 'object' && err !== null ? String(err) : 'Unknown error',
    };
  }
}