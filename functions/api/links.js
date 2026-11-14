export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;
  const url = new URL(request.url);

  try {
    // 1. GET：获取云端全部书签
    if (method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT id, cat, name, url, desc FROM nav_links ORDER BY CASE WHEN cat = '资源' THEN 0 ELSE 1 END, id ASC"
      ).all();
      return Response.json({ success: true, links: results });
    }

    // 校验管理密码（从请求头读取）
    const clientPwd = request.headers.get("X-Admin-Password") || "";
    if (env.ADMIN_PASSWORD && clientPwd !== env.ADMIN_PASSWORD) {
      return Response.json({ error: "管理密码错误，无权修改书签" }, { status: 401 });
    }

    // 2. POST：新增云端书签
    if (method === "POST") {
      const body = await request.json();
      const cat = (body.cat || "未分类").trim().slice(0, 30);
      const name = (body.name || "").trim().slice(0, 40);
      const linkUrl = (body.url || "").trim();
      const desc = (body.desc || "").trim().slice(0, 80);

      if (!name || !linkUrl) {
        return Response.json({ error: "名称和网址不能为空" }, { status: 400 });
      }

      const res = await env.DB.prepare(
        "INSERT INTO nav_links (cat, name, url, desc) VALUES (?, ?, ?, ?)"
      ).bind(cat, name, linkUrl, desc).run();

      return Response.json({ success: true, id: res.meta.last_row_id });
    }

    // 3. DELETE：删除指定书签
    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "缺少书签 ID" }, { status: 400 });

      await env.DB.prepare("DELETE FROM nav_links WHERE id = ?").bind(id).run();
      return Response.json({ success: true });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
