function b64(s) {
    return Buffer.from(String(s?? ""), "utf8").toString("base64");
}

function unb64(s) {
    if (!s) return "";
    return Buffer.from(String(s), "base64").toString("utf8");
}

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") return res.status(405).json({
            error: "Method not allowed"
        });

        const base = process.env.JUDGE0_BASE_URL;
        if (!base) return res.status(500).json({
            error: "JUDGE0_BASE_URL not set"
        });

        const headers = {
            "Content-Type": "application/json"
        };
        const key = process.env.JUDGE0_API_KEY;
        const keyHeader = process.env.JUDGE0_API_KEY_HEADER || "X-Auth-Token";
        if (key) headers[keyHeader] = key;

        const {
            language_id,
            source_code,
            stdin
        } = req.body || {};
        if (!language_id || typeof source_code !== "string") {
            return res.status(400).json({
                error: "Missing required fields: language_id, source_code"
            });
        }

        const submitUrl = `${base.replace(/\/$/, "")}/submissions?base64_encoded=true&wait=false`;
        const submitBody = {
            language_id,
            source_code: b64(source_code),
            stdin: stdin?b64(stdin) : null,
        };

        const submitResp = await fetch(submitUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(submitBody),
        });

        const submitData = await submitResp.json().catch(() => null);
        if (!submitResp.ok) {
            return res.status(submitResp.status).json({
                error: submitData?.error || "Submission failed"
            });
        }

        const token = submitData?.token;
        if (!token) return res.status(500).json({
            error: "Judge0 did not return a token"
        });

        const getUrl = `${base.replace(/\/$/, "")}/submissions/${encodeURIComponent(token)}?base64_encoded=true`;

        // Poll until status.id not in {1: In Queue, 2: Processing}
        let last = null;
        const maxPolls = 25;
        for (let i = 0; i < maxPolls; i++) {
            const r = await fetch(getUrl, {
                headers
            });
            last = await r.json().catch(() => null);
            if (!r.ok) return res.status(r.status).json({
                error: last?.error || "Failed to fetch result"
            });

            const statusId = last?.status?.id;
            if (statusId && statusId !== 1 && statusId !== 2) break;

            // small delay
            await new Promise(ok => setTimeout(ok, 300));
        }

        if (!last) return res.status(500).json({
            error: "No result received"
        });

        // Decode base64 fields
        const result = {
            status: last.status,
            time: last.time,
            memory: last.memory,
            stdout: unb64(last.stdout),
            stderr: unb64(last.stderr),
            compile_output: unb64(last.compile_output),
            message: unb64(last.message),
        };

        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({
            error: err?.message || "Unknown error"
        });
    }
}