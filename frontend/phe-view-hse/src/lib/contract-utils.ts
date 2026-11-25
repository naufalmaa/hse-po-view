import {APP_BASE_URL} from '@/constants/app-api'

export function getContractFileUrl (contractId: string, folderId: string, fileIdfileId: string) {
  return(`${APP_BASE_URL}/contracts/${contractId}/${folderId}/${fileIdfileId}`)
}

/**
 * Builds a hierarchical folder tree structure from a flat array of folders
 * @param folders - Array of folder objects with potential parentId references
 * @returns Array of root-level folders with nested children
 */
export function buildFolderTree(folders: any[]): any[] {
  // Create a map of folders by ID for quick lookup
  const folderMap: { [key: string]: any } = {};
  folders.forEach(folder => {
    folder.children = [];
    folderMap[folder.id] = folder;
  });
  
  // Build the tree structure
  const rootFolders: any[] = [];
  folders.forEach(folder => {
    if (folder.parentId) {
      if (folderMap[folder.parentId]) {
        folderMap[folder.parentId].children.push(folder);
      }
    } else {
      rootFolders.push(folder);
    }
  });
  
  // Sort root folders to ensure proper chronological order with PB before PA
  rootFolders.sort((a, b) => {
    // Extract date and type from folder names
    // Format: DD-MM-YYYY - PB/PA
    
    // Check if folders are PB or PA
    const aIsPB = a.name.endsWith(' - PB');
    const bIsPB = b.name.endsWith(' - PB');
    const aIsPA = a.name.endsWith(' - PA');
    const bIsPA = b.name.endsWith(' - PA');
    
    // If one is PB and the other is PA, PB comes first
    if (aIsPB && bIsPA) return -1;
    if (aIsPA && bIsPB) return 1;
    
    // If both are same type, sort by date
    if ((aIsPB && bIsPB) || (aIsPA && bIsPA)) {
      // Extract dates
      const aDateStr = a.name.substring(0, 10); // DD-MM-YYYY
      const bDateStr = b.name.substring(0, 10); // DD-MM-YYYY
      
      // Convert DD-MM-YYYY to Date objects for proper comparison
      const [aDay, aMonth, aYear] = aDateStr.split('-').map(Number);
      const [bDay, bMonth, bYear] = bDateStr.split('-').map(Number);
      
      const aDate = new Date(aYear, aMonth - 1, aDay); // Month is 0-indexed
      const bDate = new Date(bYear, bMonth - 1, bDay); // Month is 0-indexed
      
      return aDate.getTime() - bDate.getTime();
    }
    
    // Default alphabetical sorting
    return a.name.localeCompare(b.name);
  });
  
  // Sort children arrays to ensure proper K3LL ordering
  function sortChildren(nodes: any[]) {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        // Sort children based on K3LL ordering rules
        node.children.sort((a: any, b: any) => {
          // A. RENCANA K3LL comes first
          if (a.name === 'A. RENCANA K3LL') return -1;
          if (b.name === 'A. RENCANA K3LL') return 1;
          
          // Extract the number prefix for K3LL items
          const aMatch = a.name.match(/^([1-8])\s/);
          const bMatch = b.name.match(/^([1-8])\s/);
          
          if (aMatch && bMatch) {
            return parseInt(aMatch[1]) - parseInt(bMatch[1]);
          }
          
          // If one has a number prefix and the other doesn't, prioritize the numbered one
          if (aMatch) return -1;
          if (bMatch) return 1;
          
          // For sub-items like 3.1, 3.2, etc.
          const aSubMatch = a.name.match(/^([1-8])\.(\d+)/);
          const bSubMatch = b.name.match(/^([1-8])\.(\d+)/);
          
          if (aSubMatch && bSubMatch && aSubMatch[1] === bSubMatch[1]) {
            return parseInt(aSubMatch[2]) - parseInt(bSubMatch[2]);
          }
          
          // Default alphabetical sorting
          return a.name.localeCompare(b.name);
        });
        
        // Recursively sort children of children
        sortChildren(node.children);
      }
    });
  }
  
  // Sort children for all nodes
  sortChildren(rootFolders);
  
  return rootFolders;
}