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
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers }
      );
      if (!res.ok) return Response.json({ error: 'Failed to download file' }, { status: 400 });
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Convert to base64
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      return Response.json({ base64, contentType });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});