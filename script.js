const LANGUAGES = {
    javascript: {
        name: "JavaScript",
        cmMode: "javascript",
        ext: "js"
    },
    python: {
        name: "Python",
        cmMode: "python",
        ext: "py"
    },
    java: {
        name: "Java",
        cmMode: "text/x-java",
        ext: "java"
    },
    c: {
        name: "C",
        cmMode: "text/x-csrc",
        ext: "c"
    },
    cpp: {
        name: "C++",
        cmMode: "text/x-c++src",
        ext: "cpp"
    },
    csharp: {
        name: "C#",
        cmMode: "text/x-csharp",
        ext: "cs"
    },
    php: {
        name: "PHP",
        cmMode: "application/x-httpd-php",
        ext: "php"
    },
    ruby: {
        name: "Ruby",
        cmMode: "ruby",
        ext: "rb"
    },
    go: {
        name: "Go",
        cmMode: "go",
        ext: "go"
    },
    swift: {
        name: "Swift",
        cmMode: "swift",
        ext: "swift"
    },
};

const DEFAULT_SNIPPETS = {
    javascript: `// JavaScript
function main() {
  console.log("Hello from CodeFlow!");
}
main();`,
    python: `# Python
def main():
    print("Hello from CodeFlow!")

if __name__ == "__main__":
    main()`,
    java: `// Java
public class Main {
  public static void main(String[] args) {
    System.out.println("Hello from CodeFlow!");
  }
}`,
    c: `// C
#include <stdio.h>

int main(void) {
  printf("Hello from CodeFlow!\\n");
  return 0;
}`,
    cpp: `// C++
#include <iostream>
int main() {
  std::cout << "Hello from CodeFlow!" << std::endl;
  return 0;
}`,
    csharp: `// C#
using System;

class Program {
  static void Main() {
    Console.WriteLine("Hello from CodeFlow!");
  }
}`,
    php: `<?php
// PHP
echo "Hello from CodeFlow!\\n";`,
    ruby: `# Ruby
puts "Hello from CodeFlow!"`,
    go: `// Go
package main
import "fmt"

func main() {
  fmt.Println("Hello from CodeFlow!")
}`,
    swift: `// Swift
import Foundation
print("Hello from CodeFlow!")`,
};

// --- DOM
const els = {
    languageSelect: document.getElementById("languageSelect"),
    modeCodeBtn: document.getElementById("modeCodeBtn"),
    modeFlowBtn: document.getElementById("modeFlowBtn"),
    codePane: document.getElementById("codePane"),
    flowPane: document.getElementById("flowPane"),
    runBtn: document.getElementById("runBtn"),
    output: document.getElementById("output"),
    sandboxFrame: document.getElementById("sandboxFrame"),
    themeBtn: document.getElementById("themeBtn"),

    wrapToggle: document.getElementById("wrapToggle"),
    lintHintToggle: document.getElementById("lintHintToggle"),

    newProjectBtn: document.getElementById("newProjectBtn"),
    copyBtn: document.getElementById("copyBtn"),
    downloadBtn: document.getElementById("downloadBtn"),

    // Flow
    flowList: document.getElementById("flowList"),
    flowLinks: document.getElementById("flowLinks"),
    generateBtn: document.getElementById("generateBtn"),
    clearFlowBtn: document.getElementById("clearFlowBtn"),
    exportFlowJsonBtn: document.getElementById("exportFlowJsonBtn"),
    importFlowJsonBtn: document.getElementById("importFlowJsonBtn"),

    // Save/Load
    saveBtn: document.getElementById("saveBtn"),
    loadBtn: document.getElementById("loadBtn"),

    // Modal
    modalBackdrop: document.getElementById("modalBackdrop"),
    modalTitle: document.getElementById("modalTitle"),
    modalBody: document.getElementById("modalBody"),
    modalFoot: document.getElementById("modalFoot"),
    modalClose: document.getElementById("modalClose"),
};

// --- State
let editor;
let currentLanguage = "javascript";
let currentTheme = localStorage.getItem("cf_theme") || "light";

// Flow is a simple ordered list of blocks
let flow = [];

/** block schema examples:
 * { id, type:"start" }
 * { id, type:"output", text:"Hello" }
 * { id, type:"assign", varName:"x", value:"10" }
 * { id, type:"if", condition:"x > 5", thenText:"Big!" }
 * { id, type:"while", condition:"i < 3", bodyText:"Looping..." }
 * { id, type:"end" }
 */
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

// --- Init
window.addEventListener("DOMContentLoaded", () => {
    applyTheme(currentTheme);
    initEditor();
    initUI();
    setLanguage("javascript");
    resetSandbox();
    renderFlow();
});

function initEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
        lineNumbers: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true,
        theme: currentTheme === "dark" ? "material-darker" : "eclipse",
        mode: LANGUAGES[currentLanguage].cmMode,
        viewportMargin: Infinity,
    });
}

function initUI() {
    els.languageSelect.addEventListener("change", (e) => setLanguage(e.target.value));

    els.modeCodeBtn.addEventListener("click", () => setMode("code"));
    els.modeFlowBtn.addEventListener("click", () => setMode("flow"));

    els.wrapToggle.addEventListener("change", () => editor.setOption("lineWrapping", els.wrapToggle.checked));

    els.themeBtn.addEventListener("click", () => {
        currentTheme = currentTheme === "light" ? "dark" : "light";
        localStorage.setItem("cf_theme", currentTheme);
        applyTheme(currentTheme);
        editor.setOption("theme", currentTheme === "dark" ? "material-darker" : "eclipse");
        // sandbox bg remains white; keep it predictable
    });

    els.runBtn.addEventListener("click", runCode);

    els.newProjectBtn.addEventListener("click", () => {
        const lang = currentLanguage;
        editor.setValue(DEFAULT_SNIPPETS[lang] || "");
        els.output.textContent = "";
        resetSandbox();
    });

    els.copyBtn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(editor.getValue());
        toast("Copied to clipboard.");
    });

    els.downloadBtn.addEventListener("click", () => {
        const lang = LANGUAGES[currentLanguage];
        const blob = new Blob([editor.getValue()], {
            type: "text/plain"
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `codeflow.${lang.ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
    });

    // Flow block add buttons (sidebar chips)
    document.querySelectorAll("[data-add]").forEach(btn => {
        btn.addEventListener("click", () => addBlock(btn.getAttribute("data-add")));
    });

    els.generateBtn.addEventListener("click", () => {
        const code = generateCodeFromFlow(flow, currentLanguage);
        editor.setValue(code);
        toast("Generated code into editor.");
        setMode("code");
    });

    els.clearFlowBtn.addEventListener("click", () => {
        flow = [];
        renderFlow();
    });

    els.exportFlowJsonBtn.addEventListener("click", () => {
        const json = JSON.stringify(flow, null, 2);
        openModal("Export Flow JSON", `<textarea class="modal-textarea">${escapeHtml(json)}</textarea>`, [{
            label: "Copy",
            kind: "primary",
            onClick: async () => {
                await navigator.clipboard.writeText(json);
                toast("Flow JSON copied.");
            }
        }, ]);
        // Make textarea editable after insertion
        const ta = els.modalBody.querySelector("textarea");
        ta.value = json;
    });

    els.importFlowJsonBtn.addEventListener("click", () => {
        openModal("Import Flow JSON", `
      <div class="modal-row">
        <div class="modal-hint">Paste JSON (exported from this app) to restore the flow.</div>
        <textarea class="modal-textarea" placeholder='[{"id":"...","type":"start"}, ...]'></textarea>
      </div>
    `, [{
            label: "Import",
            kind: "primary",
            onClick: () => {
                const ta = els.modalBody.querySelector("textarea");
                try {
                    const parsed = JSON.parse(ta.value);
                    if (!Array.isArray(parsed)) throw new Error("JSON must be an array.");
                    // shallow validate
                    parsed.forEach(b => {
                        if (!b || typeof b !== "object") throw new Error("Invalid block in array.");
                        if (!b.type) throw new Error("Every block must have 'type'.");
                        if (!b.id) b.id = uid();
                    });
                    flow = parsed;
                    closeModal();
                    renderFlow();
                    toast("Flow imported.");
                } catch (err) {
                    toast(`Import failed: ${err.message}`, true);
                }
            }
        }, ]);
    });

    // Save/Load
    els.saveBtn.addEventListener("click", () => saveProject());
    els.loadBtn.addEventListener("click", () => loadProjectPicker());

    // Modal close
    els.modalClose.addEventListener("click", closeModal);
    els.modalBackdrop.addEventListener("click", (e) => {
        if (e.target === els.modalBackdrop) closeModal();
    });
}

function setMode(mode) {
    const isCode = mode === "code";
    els.codePane.classList.toggle("hidden", !isCode);
    els.flowPane.classList.toggle("hidden", isCode);

    els.modeCodeBtn.classList.toggle("active", isCode);
    els.modeFlowBtn.classList.toggle("active", !isCode);

    // Show block add UI always in sidebar, but flow mode is where it matters
}

function setLanguage(langKey) {
    if (!LANGUAGES[langKey]) return;
    currentLanguage = langKey;
    editor.setOption("mode", LANGUAGES[langKey].cmMode);

    // If editor looks untouched-ish, load default snippet
    const cur = editor.getValue().trim();
    if (!cur || Object.values(DEFAULT_SNIPPETS).some(s => s.trim() === cur)) {
        editor.setValue(DEFAULT_SNIPPETS[langKey] || "");
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
}

// --- Runner (JS only)
function resetSandbox() {
    // reset iframe document
    els.sandboxFrame.srcdoc = `
<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; padding: 10px; }
  .line { white-space: pre-wrap; }
  .err { color: #b22b2b; }
</style>
</head>
<body>
<div id="root"></div>
<script>
  const root = document.getElementById('root');
  function line(text, cls){
    const d = document.createElement('div');
    d.className = 'line' + (cls ? ' ' + cls : '');
    d.textContent = text;
    root.appendChild(d);
  }
  console.log = (...args) => line(args.map(a => String(a)).join(' '));
  console.error = (...args) => line(args.map(a => String(a)).join(' '), 'err');
  window.addEventListener('error', (e) => line('Error: ' + e.message, 'err'));
<\/script>
</body></html>`;
}

function runCode() {
    els.output.textContent = "";
    const lang = currentLanguage;

    if (lang !== "javascript") {
        els.output.textContent =
            `Running is enabled locally for JavaScript only.

To run ${LANGUAGES[lang].name}, connect a serverless function to an external runner (e.g. Judge0),
then POST { language, code } and return stdout/stderr.

(Generation + editing still works for all 10 languages.)`;
        return;
    }

    resetSandbox();
    const code = editor.getValue();

    // Also log to output panel
    els.output.textContent = "Running JavaScript in sandbox…\n";

    // Inject code after short delay so iframe overrides console first
    setTimeout(() => {
        const doc = els.sandboxFrame.contentDocument;
        const s = doc.createElement("script");
        s.type = "text/javascript";
        s.textContent = `
try {
${code}
} catch (e) {
  console.error(e && e.stack ? e.stack : String(e));
}`;
        doc.body.appendChild(s);
        els.output.textContent += "Done.\n";
    }, 50);
}

// --- Flowchart
function addBlock(type) {
    const block = {
        id: uid(),
        type
    };

    if (type === "output") block.text = "Hello from Flowchart!";
    if (type === "assign") {
        block.varName = "x";
        block.value = "10";
    }
    if (type === "if") {
        block.condition = "x > 5";
        block.thenText = "Condition is true";
    }
    if (type === "while") {
        block.condition = "i < 3";
        block.bodyText = "Looping...";
    }

    // Encourage proper structure if empty
    if (flow.length === 0 && type !== "start") {
        flow.push({
            id: uid(),
            type: "start"
        });
    }
    flow.push(block);
    renderFlow();
}

function renderFlow() {
    els.flowList.innerHTML = "";
    flow.forEach((b, idx) => els.flowList.appendChild(renderFlowCard(b, idx)));
    requestAnimationFrame(drawFlowLinks);
}

function renderFlowCard(block, index) {
    const card = document.createElement("div");
    card.className = "flow-card";
    card.setAttribute("draggable", "true");
    card.dataset.id = block.id;

    const typeLabel = block.type.toUpperCase();
    card.innerHTML = `
    <div class="flow-card-head">
      <div class="flow-type">${typeLabel}</div>
      <div class="flow-meta">
        <span class="badge">#${index + 1}</span>
        <button class="icon-btn" data-up title="Move up">↑</button>
        <button class="icon-btn" data-down title="Move down">↓</button>
        <button class="icon-btn" data-del title="Delete">✕</button>
      </div>
    </div>
    <div class="flow-fields"></div>
  `;

    const fields = card.querySelector(".flow-fields");
    fields.appendChild(buildFields(block));

    // Move / Delete
    card.querySelector("[data-up]").addEventListener("click", () => {
        if (index <= 0) return;
        [flow[index - 1], flow[index]] = [flow[index], flow[index - 1]];
        renderFlow();
    });
    card.querySelector("[data-down]").addEventListener("click", () => {
        if (index >= flow.length - 1) return;
        [flow[index + 1], flow[index]] = [flow[index], flow[index + 1]];
        renderFlow();
    });
    card.querySelector("[data-del]").addEventListener("click", () => {
        flow = flow.filter(x => x.id !== block.id);
        renderFlow();
    });

    // Drag reorder
    card.addEventListener("dragstart", (e) => {
        card.classList.add("dragging");
        e.dataTransfer.setData("text/plain", block.id);
    });
    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        requestAnimationFrame(drawFlowLinks);
    });
    card.addEventListener("dragover", (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");
        if (!draggedId || draggedId === block.id) return;

        const draggedIndex = flow.findIndex(x => x.id === draggedId);
        const targetIndex = flow.findIndex(x => x.id === block.id);
        if (draggedIndex < 0 || targetIndex < 0) return;

        // Insert dragged before target (simple)
        const dragged = flow.splice(draggedIndex, 1)[0];
        flow.splice(targetIndex, 0, dragged);
        renderFlow();
    });

    return card;
}

function buildFields(block) {
    const wrap = document.createElement("div");

    if (block.type === "output") {
        wrap.appendChild(fieldInput("Text to output", block.text ?? "", (v) => {
            block.text = v;
        }));
    }
    if (block.type === "assign") {
        wrap.appendChild(fieldInput("Variable name", block.varName ?? "", (v) => {
            block.varName = v;
        }));
        wrap.appendChild(fieldInput("Value/expression", block.value ?? "", (v) => {
            block.value = v;
        }));
    }
    if (block.type === "if") {
        wrap.appendChild(fieldInput("Condition", block.condition ?? "", (v) => {
            block.condition = v;
        }));
        wrap.appendChild(fieldInput("Then output (simple)", block.thenText ?? "", (v) => {
            block.thenText = v;
        }));
    }
    if (block.type === "while") {
        wrap.appendChild(fieldInput("Condition", block.condition ?? "", (v) => {
            block.condition = v;
        }));
        wrap.appendChild(fieldInput("Body output (simple)", block.bodyText ?? "", (v) => {
            block.bodyText = v;
        }));
    }

    // Start / End have no fields
    return wrap;
}

function fieldInput(label, value, onChange) {
    const d = document.createElement("div");
    d.className = "field";
    d.innerHTML = `
    <label>${escapeHtml(label)}</label>
    <input type="text" />
  `;
    const input = d.querySelector("input");
    input.value = value;
    input.addEventListener("input", () => onChange(input.value));
    return d;
}

function drawFlowLinks() {
    // Draw simple connectors from each card to next using SVG lines.
    // We'll map cards into percentage coords in the SVG viewbox (0..100).
    const cards = Array.from(els.flowList.querySelectorAll(".flow-card"));
    if (cards.length <= 1) {
        els.flowLinks.innerHTML = "";
        return;
    }

    const canvasRect = els.flowList.getBoundingClientRect();
    const points = cards.map(card => {
        const r = card.getBoundingClientRect();
        const x = (r.left - canvasRect.left + r.width / 2) / canvasRect.width * 100;
        const yTop = (r.top - canvasRect.top) / canvasRect.height * 100;
        const yBottom = (r.bottom - canvasRect.top) / canvasRect.height * 100;
        return {
            x,
            yTop,
            yBottom
        };
    });

    const lines = [];
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const x1 = a.x,
            y1 = a.yBottom;
        const x2 = b.x,
            y2 = b.yTop;

        // Slight curve via quadratic path
        const midY = (y1 + y2) / 2;
        lines.push(`<path d="M ${x1} ${y1} Q ${x1} ${midY} ${x2} ${y2}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="0.5"/>`);
        // arrowhead near end
        lines.push(`<circle cx="${x2}" cy="${y2}" r="0.9" fill="rgba(0,0,0,.25)" />`);
    }
    els.flowLinks.innerHTML = lines.join("\n");
}

// --- Code generation
function generateCodeFromFlow(flowBlocks, lang) {
    const blocks = ensureStartEnd(flowBlocks);

    const emit = (s) => out.push(s);
    const out = [];

    const printer = makePrinter(lang);
    const assigner = makeAssigner(lang);
    const ifer = makeIf(lang);
    const whiler = makeWhile(lang);
    const prelude = makePrelude(lang);
    const postlude = makePostlude(lang);

    out.push(...prelude);

    for (const b of blocks) {
        if (b.type === "start" || b.type === "end") continue;

        if (b.type === "output") {
            emit(printer(b.text ?? ""));
            continue;
        }
        if (b.type === "assign") {
            emit(assigner(b.varName ?? "x", b.value ?? "0"));
            continue;
        }
        if (b.type === "if") {
            emit(...ifer(b.condition ?? "true", b.thenText ?? "Condition true"));
            continue;
        }
        if (b.type === "while") {
            emit(...whiler(b.condition ?? "true", b.bodyText ?? "Loop"));
            continue;
        }
    }

    out.push(...postlude);
    return out.join("\n");
}

function ensureStartEnd(arr) {
    const blocks = [...arr];
    if (blocks.length === 0) return [{
        id: uid(),
        type: "start"
    }, {
        id: uid(),
        type: "end"
    }];
    if (blocks[0].type !== "start") blocks.unshift({
        id: uid(),
        type: "start"
    });
    if (blocks[blocks.length - 1].type !== "end") blocks.push({
        id: uid(),
        type: "end"
    });
    return blocks;
}

function makePrelude(lang) {
    switch (lang) {
        case "javascript":
            return [
                `// Generated by CodeFlow (Flowchart → Code)`,
                `function main(){`,
            ];
        case "python":
            return [
                `# Generated by CodeFlow (Flowchart → Code)`,
                `def main():`,
            ];
        case "java":
            return [
                `// Generated by CodeFlow (Flowchart → Code)`,
                `public class Main {`,
                `  public static void main(String[] args) {`,
            ];
        case "c":
            return [
                `// Generated by CodeFlow (Flowchart → Code)`,
                `#include <stdio.h>`,
                ``,
                `int main(void){`,
            ];
        case "cpp":
            return [
                `// Generated by CodeFlow (Flowchart → Code)`,
                `#include <iostream>`,
                `using namespace std;`,
                ``,
                `int main(){`,
            ];
        case "csharp":
            return [
                `// Generated by CodeFlow (Flowchart → Code)`,
                `using System;`,
                ``,
                `class Program {`,
                `  static void Main(){`,
            ];
        case "php":
            return [
                `<?php`,
                `// Generated by CodeFlow (Flowchart → Code)`,
            ];
        case "ruby":
            return [
                `# Generated by CodeFlow (Flowchart → Code)`,
            ];
        case "go":
            return [
                `// Generated by CodeFlow (Flowchart → Code)`,
                `package main`,
                `import "fmt"`,
                ``,
                `func main(){`,
            ];
        case "swift":
            return [
                `// Generated by CodeFlow (Flowchart → Code)`,
                `import Foundation`,
            ];
        default:
            return [`// Generated by CodeFlow`];
    }
}

function makePostlude(lang) {
    switch (lang) {
        case "javascript":
            return [
                `}`,
                `main();`,
            ];
        case "python":
            return [
                ``,
                `if __name__ == "__main__":`,
                `    main()`,
            ];
        case "java":
            return [
                `  }`,
                `}`,
            ];
        case "c":
        case "cpp":
            return [
                `  return 0;`,
                `}`,
            ];
        case "csharp":
            return [
                `  }`,
                `}`,
            ];
        case "php":
            return [
                ``,
            ];
        case "go":
            return [
                `}`,
            ];
        case "swift":
            return [
                ``,
            ];
        case "ruby":
            return [
                ``,
            ];
        default:
            return [];
    }
}

function indentLine(lang, line, level = 1) {
    const pad = (lang === "python") ? "    " : "  ";
    return pad.repeat(level) + line;
}

function makePrinter(lang) {
    return (text) => {
        const safe = String(text).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
        switch (lang) {
            case "javascript":
                return indentLine(lang, `console.log("${safe}");`);
            case "python":
                return indentLine(lang, `print("${safe}")`);
            case "java":
                return indentLine(lang, `System.out.println("${safe}");`, 2);
            case "c":
                return indentLine(lang, `printf("${safe}\\n");`);
            case "cpp":
                return indentLine(lang, `cout << "${safe}" << endl;`);
            case "csharp":
                return indentLine(lang, `Console.WriteLine("${safe}");`, 2);
            case "php":
                return `echo "${safe}\\n";`;
            case "ruby":
                return `puts "${safe}"`;
            case "go":
                return indentLine(lang, `fmt.Println("${safe}")`);
            case "swift":
                return `print("${safe}")`;
            default:
                return `// output: ${text}`;
        }
    };
}

function makeAssigner(lang) {
    return (varName, value) => {
        const v = (varName || "x").trim() || "x";
        const expr = (value || "0").trim() || "0";

        switch (lang) {
            case "javascript":
                return indentLine(lang, `let ${v} = ${expr};`);
            case "python":
                return indentLine(lang, `${v} = ${expr}`);
            case "java":
                return indentLine(lang, `var ${v} = ${expr};`, 2);
            case "c":
                return indentLine(lang, `int ${v} = ${expr};`);
            case "cpp":
                return indentLine(lang, `auto ${v} = ${expr};`);
            case "csharp":
                return indentLine(lang, `var ${v} = ${expr};`, 2);
            case "php":
                return `$${v} = ${expr};`;
            case "ruby":
                return `${v} = ${expr}`;
            case "go":
                return indentLine(lang, `${v} := ${expr}`);
            case "swift":
                return `let ${v} = ${expr}`;
            default:
                return `// assign ${v} = ${expr}`;
        }
    };
}

function makeIf(lang) {
    const printer = makePrinter(lang);
    return (cond, thenText) => {
        const c = (cond || "true").trim() || "true";
        switch (lang) {
            case "python":
                return [
                    indentLine(lang, `if ${c}:`),
                    indentLine(lang, printer(thenText).trim(), 2),
                ];
            case "java":
                return [
                    indentLine(lang, `if (${c}) {`, 2),
                    indentLine(lang, printer(thenText).trim(), 3),
                    indentLine(lang, `}`, 2),
                ];
            case "c":
            case "cpp":
                return [
                    indentLine(lang, `if (${c}) {`),
                    indentLine(lang, printer(thenText).trim(), 2),
                    indentLine(lang, `}`),
                ];
            case "csharp":
                return [
                    indentLine(lang, `if (${c}) {`, 2),
                    indentLine(lang, printer(thenText).trim(), 3),
                    indentLine(lang, `}`, 2),
                ];
            case "php":
                return [
                    `if (${c}) {`,
                    `  ${printer(thenText).trim()}`,
                    `}`,
                ];
            case "ruby":
                return [
                    `if ${c}`,
                    `  ${printer(thenText).trim()}`,
                    `end`,
                ];
            case "go":
                return [
                    indentLine(lang, `if ${c} {`),
                    indentLine(lang, printer(thenText).trim(), 2),
                    indentLine(lang, `}`),
                ];
            case "swift":
                return [
                    `if ${c} {`,
                    `  ${printer(thenText).trim()}`,
                    `}`,
                ];
            case "javascript":
            default:
                return [
                    indentLine(lang, `if (${c}) {`),
                    indentLine(lang, printer(thenText).trim(), 2),
                    indentLine(lang, `}`),
                ];
        }
    };
}

function makeWhile(lang) {
    const printer = makePrinter(lang);
    return (cond, bodyText) => {
        const c = (cond || "true").trim() || "true";
        switch (lang) {
            case "python":
                return [
                    indentLine(lang, `while ${c}:`),
                    indentLine(lang, printer(bodyText).trim(), 2),
                    indentLine(lang, `break  # remove this if you want a real loop`, 2),
                ];
            case "java":
                return [
                    indentLine(lang, `while (${c}) {`, 2),
                    indentLine(lang, printer(bodyText).trim(), 3),
                    indentLine(lang, `break;`, 3),
                    indentLine(lang, `}`, 2),
                ];
            case "c":
            case "cpp":
                return [
                    indentLine(lang, `while (${c}) {`),
                    indentLine(lang, printer(bodyText).trim(), 2),
                    indentLine(lang, `break;`, 2),
                    indentLine(lang, `}`),
                ];
            case "csharp":
                return [
                    indentLine(lang, `while (${c}) {`, 2),
                    indentLine(lang, printer(bodyText).trim(), 3),
                    indentLine(lang, `break;`, 3),
                    indentLine(lang, `}`, 2),
                ];
            case "php":
                return [
                    `while (${c}) {`,
                    `  ${printer(bodyText).trim()}`,
                    `  break;`,
                    `}`,
                ];
            case "ruby":
                return [
                    `while ${c}`,
                    `  ${printer(bodyText).trim()}`,
                    `  break`,
                    `end`,
                ];
            case "go":
                return [
                    indentLine(lang, `for ${c} {`),
                    indentLine(lang, printer(bodyText).trim(), 2),
                    indentLine(lang, `break`, 2),
                    indentLine(lang, `}`),
                ];
            case "swift":
                return [
                    `while ${c} {`,
                    `  ${printer(bodyText).trim()}`,
                    `  break`,
                    `}`,
                ];
            case "javascript":
            default:
                return [
                    indentLine(lang, `while (${c}) {`),
                    indentLine(lang, printer(bodyText).trim(), 2),
                    indentLine(lang, `break; // remove this if you want a real loop`, 2),
                    indentLine(lang, `}`),
                ];
        }
    };
}

// --- Save/Load via API (optional)
async function saveProject() {
    const payload = {
        language: currentLanguage,
        code: editor.getValue(),
        flow,
        title: `Project (${LANGUAGES[currentLanguage].name})`,
    };

    openModal("Save Project", `
    <div class="modal-row">
      <div class="modal-hint">Name your project (stored in Supabase via /api/saveProject).</div>
      <div class="field">
        <label>Project name</label>
        <input id="projName" type="text" value="${escapeHtml(payload.title)}"/>
      </div>
      <div class="modal-hint subtle">If Supabase env vars aren't set on Vercel, save will fail.</div>
    </div>
  `, [{
        label: "Save",
        kind: "primary",
        onClick: async () => {
            const name = els.modalBody.querySelector("#projName").value.trim() || payload.title;
            payload.title = name;

            try {
                const res = await fetch("/api/saveProject", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || "Save failed.");
                toast("Saved.");
                closeModal();
            } catch (err) {
                toast(err.message, true);
            }
        }
    }, ]);
}

async function loadProjectPicker() {
    try {
        const res = await fetch("/api/listProjects");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Load list failed.");

        const items = (data.projects || []);
        if (!items.length) {
            openModal("Load Project", `<div class="modal-hint">No projects found.</div>`, []);
            return;
        }

        const listHtml = items.map(p => `
      <div class="proj-row">
        <div>
          <div class="proj-title">${escapeHtml(p.title || "Untitled")}</div>
          <div class="proj-meta">${escapeHtml(p.language || "")} • ${escapeHtml(p.updated_at || "")}</div>
        </div>
        <button class="btn small primary" data-load="${escapeHtml(p.id)}">Load</button>
      </div>
    `).join("");

        openModal("Load Project", `
      <div class="modal-hint">Pick a saved project.</div>
      <div class="proj-list">${listHtml}</div>
    `, []);

        els.modalBody.querySelectorAll("[data-load]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.getAttribute("data-load");
                try {
                    const r = await fetch(`/api/loadProject?id=${encodeURIComponent(id)}`);
                    const d = await r.json();
                    if (!r.ok) throw new Error(d?.error || "Load failed.");

                    const proj = d.project;
                    if (proj?.language && LANGUAGES[proj.language]) {
                        els.languageSelect.value = proj.language;
                        setLanguage(proj.language);
                    }
                    if (typeof proj?.code === "string") editor.setValue(proj.code);
                    if (Array.isArray(proj?.flow)) {
                        flow = proj.flow;
                        renderFlow();
                    }

                    closeModal();
                    toast("Loaded.");
                } catch (err) {
                    toast(err.message, true);
                }
            });
        });

    } catch (err) {
        toast(err.message, true);
    }
}

// --- Modal helpers
function openModal(title, bodyHtml, actions) {
    els.modalTitle.textContent = title;
    els.modalBody.innerHTML = bodyHtml;

    // foot buttons
    els.modalFoot.innerHTML = "";
    (actions || []).forEach(a => {
        const b = document.createElement("button");
        b.className = `btn ${a.kind === "primary" ? "primary" : ""}`;
        b.type = "button";
        b.textContent = a.label;
        b.addEventListener("click", a.onClick);
        els.modalFoot.appendChild(b);
    });

    // Add a cancel by default
    const cancel = document.createElement("button");
    cancel.className = "btn";
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", closeModal);
    els.modalFoot.appendChild(cancel);

    // Inject minimal modal styling extras (keep file count small)
    injectModalExtras();

    els.modalBackdrop.classList.remove("hidden");
}

function closeModal() {
    els.modalBackdrop.classList.add("hidden");
    els.modalTitle.textContent = "";
    els.modalBody.innerHTML = "";
    els.modalFoot.innerHTML = "";
}

function toast(msg, isError = false) {
    els.output.textContent = (isError ? "Error: " : "") + msg + "\n" + els.output.textContent;
}

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function injectModalExtras() {
    if (document.getElementById("modalExtras")) return;
    const style = document.createElement("style");
    style.id = "modalExtras";
    style.textContent = `
    .modal-hint{ color: var(--muted); font-size: 13px; margin-bottom: 12px; }
    .modal-hint.subtle{ margin-top: 10px; opacity: .9; }
    .modal-textarea{
      width: 100%;
      min-height: 260px;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 10px;
      font-family: var(--mono);
      background: rgba(255,255,255,.55);
      color: var(--text);
      outline: none;
      resize: vertical;
    }
    .proj-list{ display:flex; flex-direction:column; gap:10px; }
    .proj-row{
      display:flex; align-items:center; justify-content:space-between; gap: 12px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: rgba(0,0,0,.03);
    }
    .proj-title{ font-weight: 900; }
    .proj-meta{ font-size: 12px; color: var(--muted); margin-top: 2px; }
  `;
    document.head.appendChild(style);
}