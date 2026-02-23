import {
    createClient
} from "@supabase/supabase-js";

export default async function handler(req, res) {
    try {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return res.status(500).json({
                error: "Supabase env vars not set on server"
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const id = req.query?.id;
        if (!id) return res.status(400).json({
            error: "Missing id"
        });

        const {
            data,
            error
        } = await supabase
            .from("codeflow")
            .select("id,title,language,code,flow,updated_at")
            .eq("id", id)
            .single();

        if (error) return res.status(404).json({
            error: error.message
        });

        // NEW: ensure flow is always returned as { type:"program", children:[...] }
        let flowObj = data.flow;
        if (Array.isArray(flowObj)) {
            flowObj = {
                type: "program",
                children: flowObj
            };
        } else if (!flowObj || typeof flowObj !== "object") {
            flowObj = {
                type: "program",
                children: []
            };
        } else if (flowObj.type !== "program" || !Array.isArray(flowObj.children)) {
            // last-resort sanitise
            flowObj = {
                type: "program",
                children: Array.isArray(flowObj.children) ? flowObj.children : []
            };
        }

        return res.status(200).json({
            project: {
                ...data,
                flow: flowObj,
            },
        });
    } catch (err) {
        return res.status(500).json({
            error: err?.message || "Unknown error"
        });
    }
}