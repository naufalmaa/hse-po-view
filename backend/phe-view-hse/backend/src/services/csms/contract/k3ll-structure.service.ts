import { sql, like } from "drizzle-orm";
import { db } from "../../../db/index.ts";
import { contractFolder } from "../../../db/schema/csms.schema.ts";
import { randomUUID } from "node:crypto";
import { isFolderStructureComplete } from "./folder-completion.service.ts";

// K3LL folder structure as specified
export const K3LL_STRUCTURE = [
  {
    name: "A. RENCANA K3LL",
    children: [
      {
        name: "1 Kepemimpinan dan Komitmen",
      },
      {
        name: "2 Kebijakan dan Sasaran Strategis K3LL",
      },
      {
        name: "3 Organisasi, Tanggung Jawab, Sumber Daya, Standar dan Dokumentasi",
        children: [
          {
            name: "3.1 Struktur Organisasi untuk Pengelolaan K3LL",
          },
          {
            name: "3.2 Pelatihan K3LL untuk para Manajer, pengawas (supervisor) dan pemegang jabatan penting K3LL",
          },
          {
            name: "3.3 Pelatihan K3LL Umum (pada seluruh pekerja dan pihak yang terkait)",
          },
          {
            name: "3.4 Pemenuhan Kompetensi Teknis dan K3LL",
          },
          {
            name: "3.5 Pengelolaan K3LL kontraktor (Mitra Kerja)",
          },
          {
            name: "3.6 Peraturan dan Standar K3LL",
          },
        ],
      },
      {
        name: "4 Manajemen Risiko",
        children: [
          {
            name: "4.1 Penilaian dan Pengendalian Risiko*",
          },
          {
            name: "4.2 Bahaya Terhadap Kesehatan Kerja",
          },
          {
            name: "4.3 Bahaya Terhadap Keselamatan Kerja",
          },
          {
            name: "4.4 Bahaya Terhadap Kegiatan Logistik",
          },
          {
            name: "4.5 Bahaya Terhadap Lingkungan",
          },
          {
            name: "4.6 Bahaya Terhadap Keamanan",
          },
          {
            name: "4.7 Bahaya Terhadap Aspek Sosial",
          },
          {
            name: "4.8 Alat Pelindung Diri (APD)",
          },
        ],
      },
      {
        name: "5 Prosedur Kerja K3LL",
        children: [
          {
            name: "5.1 Manual Operasi K3LL*",
          },
          {
            name: "5.2 Kehandalan Infrastruktur dan Peralatan",
          },
          {
            name: "5.3 Manajemen Perubahan",
          },
          {
            name: "5.4 Implementasi Tanggap Darurat",
          },
        ],
      },
      {
        name: "6 Implementasi dan Pemantauan Kinerja K3LL",
        children: [
          {
            name: "6.1 Sistem pemantauan kinerja K3LL secara aktif",
          },
          {
            name: "6.2 lndikator kinerja K3LL",
          },
          {
            name: "6.3 Pemantauan kinerja K3LL (Butir a-g)",
          },
          {
            name: "6.4 Investigasi dan tindak lanjut insiden K3LL",
          },
          {
            name: "6.5 Insiden yang harus dilaporkan sesuai undang-undang dan catatan ketidakpatuhan",
          },
        ],
      },
      {
        name: "7 Audit dan Tinjauan Manajemen K3LL",
        children: [
          {
            name: "7.1 Audit",
          },
          {
            name: "7.2 Tinjauan Manajemen K3LL",
          },
        ],
      },
      {
        name: "8 Manajemen K3LL – Pencapaian Lainnya",
        children: [
          {
            name: "8.1 Sertifikasi sistem pengelolaan K3LL",
          },
          {
            name: "8.2 Ciri-ciri tambahan sistem Pengelolaan K3LL",
          },
        ],
      },
    ],
  },
];

/**
 * Get only the scoreable K3LL children (1-8 and their descendants)
 * This is used for PDF exports to exclude the "A. RENCANA K3LL" header
 */
export function getK3LLScoreableFolders(): any[] {
  // Find the A. RENCANA K3LL container and return only its children
  const rencanaK3LL = K3LL_STRUCTURE.find(item => item.name === "A. RENCANA K3LL");
  return rencanaK3LL?.children || [];
}

/**
 * Get all K3LL folder names (scoreable + header)
 */
export function getAllK3LLNames(): Set<string> {
  const names = new Set<string>();
  const traverse = (items: any[]) => {
    for (const item of items) {
      names.add(item.name);
      if (item.children) traverse(item.children);
    }
  };
  traverse(K3LL_STRUCTURE);
  return names;
}

/**
 * Get only scoreable K3LL folder names (1-8 and their descendants, excludes "A. RENCANA K3LL")
 */
export function getK3LLScoreableNames(): Set<string> {
  const names = new Set<string>();
  const traverse = (items: any[]) => {
    for (const item of items) {
      names.add(item.name);
      if (item.children) traverse(item.children);
    }
  };
  traverse(getK3LLScoreableFolders());
  return names;
}

/**
 * Create K3LL folder structure under a parent folder
 * @param contractId 
 * @param parentId 
 * @param parentPath 
 * @param structure 
 */
export async function createK3LLStructure(
  contractId: string,
  parentId: string,
  parentPath: string,
  structure: any[] = K3LL_STRUCTURE
) {
  for (let i = 0; i < structure.length; i++) {
    const item = structure[i];
    const folderId = randomUUID();
    const folderPath = `${parentPath}.${folderId}`;

    // Create folder
    await db.insert(contractFolder).values({
      id: folderId,
      contractId,
      parentId,
      name: item.name,
      description: item.name,
      path: sql`${folderPath}::ltree`,
      fileType: "folder",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Recursively create children if they exist
    if (item.children && item.children.length > 0) {
      await createK3LLStructure(contractId, folderId, folderPath, item.children);
    }
  }
}

/**
 * Check if a K3LL structure is complete for an assessment folder
 * @param folderId 
 * @returns Boolean indicating if the K3LL structure is complete
 */
export async function isK3LLStructureComplete(folderId: string): Promise<boolean> {
  return await isFolderStructureComplete(folderId);
}

/**
 * Initialize K3LL structure for all assessment folders of a contract
 * @param contractId 
 */
export async function initializeK3LLStructureForContract(contractId: string) {
  // Get all PB and PA folders for this contract (exclude PSB as it doesn't need K3LL structure)
  const mainFolders = await db.query.contractFolder.findMany({
    where: (fields, { eq, and, or }) => 
      and(
        eq(fields.contractId, contractId),
        or(
          like(fields.name, '% - PB'),
          like(fields.name, '% - PA')
        )
      ),
  });

  // Create K3LL structure under each main folder
  for (const folder of mainFolders) {
    await createK3LLStructure(contractId, folder.id, folder.path);
  }
}
