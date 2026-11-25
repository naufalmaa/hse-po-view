import MsgReaderModule from "@kenjiuno/msgreader";
import { decompressRTF } from "@kenjiuno/decompressrtf";
import { deEncapsulateSync } from "rtf-stream-parser";
import { Buffer } from "buffer";
import iconv from "iconv-lite";
import { simpleParser } from "mailparser";
import type { ParsedMail, AddressObject } from "mailparser";
import type { UploadedFile } from "../types/file.ts";

const MsgReader = MsgReaderModule.default;

export async function msgFileReader(file: UploadedFile): Promise<any> {
  // Check if it's an .eml file based on filename or mimetype
  if (file.filename?.toLowerCase().endsWith('.eml') || file.mimetype === 'message/rfc822') {
    return await emlFileReader(file);
  }

  // Handle .msg files as before
  let msgInfo: any = null;
  let msgReader: any = null;

  const arrayBuffer = new Uint8Array(file.buffer).buffer;

  try {
    msgReader = new MsgReader(arrayBuffer);
    msgInfo = msgReader.getFileData();
  } catch (error) {
    console.error("Error creating a MsgReader instance:", error);
    throw new Error("Invalid .msg file format.");
  }

  if (!msgInfo) throw new Error("msgInfo is null");

  let emailBodyContent = msgInfo.bodyHTML || msgInfo.body;
  let emailBodyContentHTML = "";

  try {
    const compressedRtfArray = Object.values(msgInfo.compressedRtf) as number[];
    const decompressedRtf = decompressRTF(compressedRtfArray);
    const tryDecode = (buf: Buffer, encodingList: string[]) => {
      for (const enc of encodingList) {
        try {
          const decoded = iconv.decode(buf, enc);
          // Check for proper text (avoid replacement characters or excessive special chars)
          const specialCharRatio = (decoded.match(/\uFFFD|[\u3400-\u9FBF]/g) || []).length / decoded.length;
          if (specialCharRatio < 0.3 || enc === encodingList[encodingList.length - 1]) { // Less than 30% special chars
            return decoded;
          }
        } catch (decodeErr: any) {
          console.warn(`Failed to decode with ${enc}:`, decodeErr?.message || decodeErr);
          continue;
        }
      }
      return iconv.decode(buf, "utf8"); // fallback
    };
    const deEncapsulate_ = deEncapsulateSync(decompressedRtf as any, {
      decode: (buf) => tryDecode(buf, ["utf8", "windows-1252", "latin1", "utf16le", "gb2312", "big5"]),
    });
    emailBodyContentHTML =
      typeof deEncapsulate_.text === "string"
        ? deEncapsulate_.text
        : deEncapsulate_.text.toString();
  } catch (err) {
    console.warn("RTF parsing failed:", err);
    emailBodyContentHTML = emailBodyContent;
  }

  if (msgInfo.attachments && msgInfo.attachments.length > 0) {
    msgInfo.attachments.forEach((attachment: any, index: number) => {
      const contentUint8Array = msgReader.getAttachment(attachment).content;
      const contentBuffer = Buffer.from(contentUint8Array);
      const contentBase64 = contentBuffer.toString("base64");

      const base64String = `data:${attachment.attachMimeTag};base64,${contentBase64}`;

      // Replace CID dengan inline base64
      if (attachment.attachMimeTag?.startsWith("image/")) {
        emailBodyContentHTML = emailBodyContentHTML.replace(
          `cid:${attachment.pidContentId}`,
          base64String
        );
      } else {
        emailBodyContentHTML = emailBodyContentHTML.replace(
          `href="cid:${attachment.pidContentId}"`,
          `href="${base64String}"`
        );
      }

      msgInfo.attachments[index].contentBase64 = base64String;
    });
  }

  return {
    ...msgInfo,
    bodyContent: emailBodyContent,
    bodyContentHTML: emailBodyContentHTML,
  };
}

export async function emlFileReader(file: UploadedFile): Promise<any> {
  try {
    // Parse the EML file using mailparser
    const parsed: ParsedMail = await simpleParser(file.buffer);
    
    // Extract the body content
    let bodyContent = '';
    let bodyContentHTML = '';
    
    if (parsed.html) {
      bodyContentHTML = parsed.html;
      bodyContent = parsed.text || '';
    } else {
      bodyContent = parsed.text || '';
      bodyContentHTML = `<pre>${bodyContent}</pre>`;
    }
    
    // Helper function to normalize address objects
    const normalizeAddresses = (addrObj: AddressObject | AddressObject[] | undefined): any[] => {
      if (!addrObj) return [];
      // If it's an array, return it as is
      if (Array.isArray(addrObj)) {
        return addrObj.flatMap(a => 
          a.value.map((addr: any) => ({
            recipType: 'to', // This will be overridden by the caller
            name: addr.name || '',
            smtpAddress: addr.address || ''
          }))
        );
      }
      // If it's a single object, return its value array
      return addrObj.value.map((addr: any) => ({
        recipType: 'to', // This will be overridden by the caller
        name: addr.name || '',
        smtpAddress: addr.address || ''
      }));
    };
    
    // Return in the same format as msgFileReader for compatibility
    return {
      senderName: parsed.from?.text || '',
      senderEmail: Array.isArray(parsed.from?.value) ? parsed.from.value[0]?.address || '' : '',
      subject: parsed.subject || '',
      messageDeliveryTime: parsed.date || new Date(),
      recipients: [
        ...normalizeAddresses(parsed.to).map((recipient: any) => ({ ...recipient, recipType: 'to' })),
        ...normalizeAddresses(parsed.cc).map((recipient: any) => ({ ...recipient, recipType: 'cc' })),
        ...normalizeAddresses(parsed.bcc).map((recipient: any) => ({ ...recipient, recipType: 'bcc' }))
      ],
      bodyContent: bodyContent,
      bodyContentHTML: bodyContentHTML,
    };
  } catch (error) {
    console.error("Error parsing EML file:", error);
    throw new Error("Invalid .eml file format.");
  }
}

interface MsgRecipient {
  recipType: 'to' | 'cc' | 'bcc';
  name: string;
  smtpAddress: string;
}

export function msgInfoToHtml(msgInfo : any) {
    const toRecipients = (msgInfo?.recipients as MsgRecipient[]).filter((recipient) => recipient.recipType === 'to')
      .map((recipient) => `${recipient.name} &lt;<a href="mailto:${recipient.smtpAddress}">${recipient.smtpAddress}
       </a>&gt;`).join(', ');
    const ccRecipients = (msgInfo?.recipients as MsgRecipient[]).filter((recipient) => recipient.recipType === 'cc')
      .map((recipient) => `${recipient.name} &lt;<a href="mailto:${recipient.smtpAddress}">${recipient.smtpAddress}
      </a>&gt;`).join(', ');
    // const emailHeader =
    //     `<div class="flex flex-col mb-4 gap-y-3">
		// 	<div class="text-neutral-800"><strong>From:</strong> ${msgInfo.senderName} &lt;<a href="mailto:${msgInfo.senderEmail}">${msgInfo.senderEmail}</a>&gt;</div>
		// 		${toRecipients ? `<div class="text-neutral-800"><strong>To:</strong> ${toRecipients}</div>` : ''}
		// 		${ccRecipients ? `<div class="text-neutral-800"><strong>CC:</strong> ${ccRecipients}</div>` : ''}
		// 		<div class="text-neutral-800"><strong>Subject:</strong> ${msgInfo.subject}</div>
		// 		<div class="text-neutral-800"><strong>Date:</strong> ${new Date(msgInfo.messageDeliveryTime).toLocaleString()}</div>
		// </div>`;
    const emailBody = `<div class="prose max-w-none">${msgInfo.bodyContentHTML || msgInfo.bodyContent || '<p>(No content)</p>'}</div>`;

    let emailAttachments = '';
    if (msgInfo.attachments && msgInfo.attachments.length > 0) {
        emailAttachments = '<div class="mt-6"><strong>Attachments:</strong><div class="mt-2 space-y-2">';
        msgInfo.attachments.forEach((attachment : any, index : number) => {
            if (attachment.attachMimeTag && attachment.attachMimeTag.startsWith('image/')) {
                emailAttachments += `
							<div class="flex items-center space-x-2">
								<a href="${attachment.contentBase64}" download="${attachment.fileName}" style="text-decoration:none;">
									<div class="flex items-center space-x-2 rounded border p-1">
										<div class="border rounded w-12 h-12 flex-shrink-0">
											<img src="${attachment.contentBase64}" alt="Attachment ${index + 1}" class="w-12 h-12 object-cover">
										</div>
										<div class="no-underline">
											<p class="no-underline text-sm text-neutral-900">${attachment.fileName}</p>
											<p class="no-underline text-xs text-neutral-700">${attachment.attachMimeTag} - ${attachment.contentLength} bytes</p>
										</div>
									</div>
								</a>
							</div>
						`;
            } else {
                emailAttachments += `
						<a href="${attachment.contentBase64}" download="${attachment.fileName}" class="text-sm text-gray-600 no-underline">${attachment.fileName}
							<div class="rounded border">
								<p class="text-xs text-gray-500">${attachment.attachMimeTag} - ${attachment.contentLength} bytes</p>
							</div>
						</a>
						`;
            }
        });
        emailAttachments += '</div></div>';
    }

    return {header: {from: msgInfo.senderName, to: toRecipients, cc: ccRecipients, subject: msgInfo.subject,
            date: new Date(msgInfo.messageDeliveryTime).toLocaleString()},
            body: emailBody, attachments: emailAttachments
    };
}