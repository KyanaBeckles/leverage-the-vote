import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, folderId, fileId } = await req.json();
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const headers = { Authorization: `Bearer ${accessToken}` };

    // List files/folders in a folder (or root)
    if (action === 'list') {
      const parent = folderId || 'root';
      const q = encodeURIComponent(`'${parent}' in parents and trashed=false`);
      const fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime)');
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=name&pageSize=100`,
        { headers }
      );
      const data = await res.json();
      return Response.json({ files: data.files || [] });
    }

    // Download a file and return its content as base64
    if (action === 'download') {
      // First get file metadata to check mimeType
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,name`,
        { headers }
      );
      const meta = await metaRes.json();

      let downloadUrl;
      let contentType;

      // Google Workspace files need export instead of direct download
      if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`;
        contentType = 'text/csv';
      } else {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        contentType = meta.mimeType || 'application/octet-stream';
      }

      const res = await fetch(downloadUrl, { headers });
      if (!res.ok) return Response.json({ error: 'Failed to download file' }, { status: 400 });
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      return Response.json({ base64, contentType, fileName: meta.name });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});