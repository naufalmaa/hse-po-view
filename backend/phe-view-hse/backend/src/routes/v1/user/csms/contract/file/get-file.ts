import type { FastifyRequest, FastifyReply } from "fastify";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type, type Static } from "@sinclair/typebox";
import fs from "node:fs";
import { db } from "../../../../../../db/index.ts";
import { contractFolder } from "../../../../../../db/schema/csms.schema.ts";
import { eq } from "drizzle-orm";
import { uploadsPath } from "../../../../../../config/env.config.ts";

const GetFileParams = Type.Object({
  fileId: Type.String({ format: 'uuid' }),
});

const getContractFileRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    "/:fileId",
    {
      schema: {
        tags: ["CSMS Contract"],
        description: "Get contract file securely (requires auth)",
        params: GetFileParams,
      },
    },
    async (request: FastifyRequest<{ Params: Static<typeof GetFileParams> }>, reply: FastifyReply) => {
      const { fileId } = request.params;

      // Prevent directory traversal attacks
      if (fileId.includes("..")) {
        return reply.badRequest("Access Denied");
      }

      // Look up the file in the database
      const file = await db.query.contractFolder.findFirst({
        where: eq(contractFolder.id, fileId)
      });

      if (!file || file.fileType !== 'file') {
        return reply.notFound("File not found");
      }

      // Check if this file is in DOKUMEN EVALUASI folder to determine path
      let isDokumenEvaluasi = false;
      let evaluasiFolderId = null;

      const allFolders = await db.query.contractFolder.findMany({
        where: eq(contractFolder.contractId, file.contractId),
        columns: {
          id: true,
          name: true,
          parentId: true,
          depth: true,
        },
      });

      let currentFolderId: string | null = file.id;
      while (currentFolderId) {
        const currentFolder = allFolders.find((f) => f.id === currentFolderId);
        if (!currentFolder) break;
        if (currentFolder.name === 'DOKUMEN EVALUASI') {
          isDokumenEvaluasi = true;
          evaluasiFolderId = currentFolder.id;
          break;
        }
        currentFolderId = currentFolder.parentId;
      }

      // Determine depth 0 folder ID if not final
      let depth0FolderId = file.id;
      if (file.depth !== 0) {
        let currentParentId: string | null = file.parentId;
        while (currentParentId) {
          const parentFolder = allFolders.find((f) => f.id === currentParentId);
          if (!parentFolder) break;
          if (parentFolder.depth === 0) {
            depth0FolderId = parentFolder.id;
            break;
          }
          currentParentId = parentFolder.parentId;
        }
      }

      const potentialPaths = [
        // Path 1: Default upload structure (with depth0FolderId)
        uploadsPath('csms', 'contracts', file.contractId, depth0FolderId, file.id, file.filePath || ''),
        // Path 2: Flat structure (often used when copying files/folders)
        uploadsPath('csms', 'contracts', file.contractId, file.id, file.filePath || ''),
      ];

      if (isDokumenEvaluasi && evaluasiFolderId) {
        // Path 3: Finalized folder structure
        potentialPaths.unshift(
          uploadsPath('csms', 'contracts', 'final', file.contractId, evaluasiFolderId, file.id, file.filePath || '')
        );
      }

      let filePath = "";
      for (const p of potentialPaths) {
        if (fs.existsSync(p)) {
          filePath = p;
          break;
        }
      }

      if (!filePath) {
        return reply.notFound("File not found on disk");
      }

      const fileStream = fs.createReadStream(filePath);
      const targetFilename = file.name || file.filePath || "file";

      let contentType = "application/octet-stream";
      if (targetFilename.toLowerCase().endsWith(".pdf")) {
        contentType = "application/pdf";
      } else if (targetFilename.toLowerCase().endsWith(".jpg") || targetFilename.toLowerCase().endsWith(".jpeg")) {
        contentType = "image/jpeg";
      } else if (targetFilename.toLowerCase().endsWith(".png")) {
        contentType = "image/png";
      }

      return reply
        .header("Content-Type", contentType)
        .header("Content-Disposition", `inline; filename="${encodeURIComponent(targetFilename)}"`)
        .send(fileStream);
    }
  );
};

export default getContractFileRoutes;
