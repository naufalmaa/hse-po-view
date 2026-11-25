import { db } from '../../db/index.ts';
import { employees } from '../../db/schema/employee.schema.ts';
import { subContractors } from '../../db/schema/auth.schema.ts';
import { eq } from 'drizzle-orm';

interface EmployeeSuggestion {
  id: string;
  employeeName: string | null;
  companyName: string | null;
  similarity: number;
}

// Levenshtein distance
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, () => [] as number[]);
  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  const maxLength = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLength;
}

export async function findEmployeeMatch(
  name: string,
  companyName: string
): Promise<{ employee: any; suggestions: EmployeeSuggestion[] }> {
  const allEmployees = await db
    .select({
      id: employees.id,
      employeeName: employees.employeeName,
      identityNumber: employees.identityNumber,
      hssePassportNumber: employees.hssePassportNumber,
      subContractorId: employees.subContractorId,
      companyName: subContractors.name,
    })
    .from(employees)
    .leftJoin(subContractors, eq(employees.subContractorId, subContractors.id));

  let exactMatch: any = null;
  const suggestions: EmployeeSuggestion[] = [];

  for (const emp of allEmployees) {
    const nameSim = calculateSimilarity(emp.employeeName || '', name);
    const compSim = calculateSimilarity(emp.companyName || '', companyName);
    
    // Weighted scoring: name (70%) + company (30%)
    const avgSim = (nameSim * 0.7) + (compSim * 0.3);

    // Exact match criteria: high name similarity and reasonable company similarity
    if (nameSim > 0.9 && compSim > 0.7 && !exactMatch) {
      exactMatch = emp;
    }

    // Include in suggestions if overall similarity is reasonable
    if (avgSim > 0.5) {
      suggestions.push({
        id: emp.id,
        employeeName: emp.employeeName,
        companyName: emp.companyName,
        similarity: avgSim
      });
    }
  }

  suggestions.sort((a, b) => b.similarity - a.similarity);

  return {
    employee: exactMatch,
    suggestions: suggestions.slice(0, 5),
  };
}
