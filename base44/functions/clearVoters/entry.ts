import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const { campaign_id } = await req.json();
    if (!campaign_id) return Response.json({ error: 'campaign_id required' }, { status: 400 });

    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    let totalDeleted = 0;

    while (true) {
      const voters = await base44.asServiceRole.entities.Voter.filter({ campaign_id }, "-created_date", 50);
      if (voters.length === 0) break;

      for (const v of voters) {
        await base44.asServiceRole.entities.Voter.delete(v.id);
        await delay(50);
      }

      totalDeleted += voters.length;
      if (voters.length < 50) break;
      await delay(200);
    }

    return Response.json({ success: true, deleted: totalDeleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});