import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
    ChevronRight,
    ChevronDown,
    Folder,
    File,
} from 'lucide-react';
import { ContractFolder } from '@/service/csms/folder-detail';
import { cn } from '@/lib/utils';

interface FolderTreeProps {
    folders: ContractFolder[];
    expandedFolders: Set<string>;
    onToggleFolder: (folderId: string) => void;
    onViewFile?: (file: ContractFolder) => void; // Add this prop
    isFinal?: boolean;
}

export const FolderTreeEvaluation = ({ folders, expandedFolders, onToggleFolder, onViewFile, isFinal }: FolderTreeProps) => {
    // Render folder tree recursively
    const renderFolderTree = (nodes: ContractFolder[], level: number = 0) => {
        return nodes.map(node => {
            const isFolder = node.fileType === 'folder';
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedFolders.has(node.id);
            const indent = level * 20;

            return (
                <React.Fragment key={node.id}>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
                                {isFolder ? (
                                    hasChildren ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="mr-2 h-6 w-6 p-0 flex-shrink-0"
                                            onClick={() => onToggleFolder(node.id)}
                                        >
                                            {isExpanded ?
                                                <ChevronDown className="h-4 w-4 flex-shrink-0" /> :
                                                <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                            }
                                        </Button>
                                    ) : (
                                        <div className="mr-2 h-6 w-6 flex-shrink-0" />
                                    )
                                ) : (
                                    <div className="mr-2 h-6 w-6 flex-shrink-0" />
                                )}
                                {isFolder ? (
                                    <Folder className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                                ) : (
                                    <File className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                                )}

                                {isFolder ? (
                                    <span className={cn("line-clamp-2")}>{node.name}</span>
                                ) : (
                                    <span
                                        className={cn("line-clamp-2 cursor-pointer hover:underline")}
                                        onClick={() => {
                                            if (onViewFile) {
                                                onViewFile(node);
                                            }
                                        }}
                                    >
                                        {node.name}
                                    </span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell>
                            {node.updatedAt ? new Date(node.updatedAt).toLocaleString() : 'N/A'}
                        </TableCell>
                    </TableRow>
                    {isFolder && hasChildren && isExpanded && (
                        <TableRow>
                            <TableCell colSpan={6} className="p-0">
                                <Table>
                                    <TableBody>
                                        {renderFolderTree(node.children || [], level + 1)}
                                    </TableBody>
                                </Table>
                            </TableCell>
                        </TableRow>
                    )}
                </React.Fragment>
            );
        });
    };

    return <>{renderFolderTree(folders)}</>;
};