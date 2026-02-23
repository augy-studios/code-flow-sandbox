export default async function handler(req, res) {
    try {
        const base = process.env.JUDGE0_BASE_URL;
        if (!base) return res.status(500).json({
            error: "JUDGE0_BASE_URL not set"
        });

        const headers = {};
        const key = process.env.JUDGE0_API_KEY;
        const keyHeader = process.env.JUDGE0_API_KEY_HEADER || "X-Auth-Token";
        if (key) headers[keyHeader] = key;

        const r = await fetch(`${base.replace(/\/$/, "")}/languages`, {
            headers
        });
        const data = await r.json().catch(() => null);

        if (!r.ok) return res.status(r.status).json({
            error: data?.error || "Failed to fetch languages"
        });

        return res.status(200).json({
            languages: data
        });
    } catch (err) {
        return res.status(500).json({
            error: err?.message || "Unknown error"
        });
    }
}