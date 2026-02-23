const LANGUAGES = {
    javascript: {
        name: "JavaScript",
        ext: "js",
        judge0Hint: "JavaScript"
    },
    python: {
        name: "Python",
        ext: "py",
        judge0Hint: "Python"
    },
    java: {
        name: "Java",
        ext: "java",
        judge0Hint: "Java"
    },
    c: {
        name: "C",
        ext: "c",
        judge0Hint: "C "
    },
    cpp: {
        name: "C++",
        ext: "cpp",
        judge0Hint: "C++"
    },
    csharp: {
        name: "C#",
        ext: "cs",
        judge0Hint: "C#"
    },
    php: {
        name: "PHP",
        ext: "php",
        judge0Hint: "PHP"
    },
    ruby: {
        name: "Ruby",
        ext: "rb",
        judge0Hint: "Ruby"
    },
    go: {
        name: "Go",
        ext: "go",
        judge0Hint: "Go"
    },
    swift: {
        name: "Swift",
        ext: "swift",
        judge0Hint: "Swift"
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

    newProjectBtn: document.getElementById("newProjectBtn"),
    copyBtn: document.getElementById("copyBtn"),
    downloadBtn: document.getElementById("downloadBtn"),

    // Nested Flow
    flowTree: document.getElementById("flowTree"),
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

let editor;
let currentLanguage = "javascript";
let currentTheme = localStorage.getItem("cf_theme") || "light";

/**
 * Nested flow model:
 * program = { type:"program", children: Node[] }
 * Node types:
 * - output: {type:"output", text}
 * - assign: {type:"assign", varName, value}
 * - if: {type:"if", condition, then: Node[], else: Node[]}
 * - while: {type:"while", condition, body: Node[]}
 */
let program = {
    type: "program",
    children: []
};

// Cached Judge0 languages list (from /api/languages)
let judge0Languages = null;

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

window.addEventListener("DOMContentLoaded", () => {
    applyTheme(currentTheme);
    initEditor();
    initUI();
    setLanguage("javascript");
    resetSandbox();
    renderProgram();
});

function initEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
        lineNumbers: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true,
        theme: currentTheme === "dark"?"material-darker" : "eclipse",
        mode: "javascript",
        viewportMargin: Infinity,
    });
}

function initUI() {
    els.languageSelect.addEventListener("change", (e) => setLanguage(e.target.value));

    els.modeCodeBtn.addEventListener("click", () => setMode("code"));
    els.modeFlowBtn.addEventListener("click", () => setMode("flow"));

    els.wrapToggle?.addEventListener("change", () => editor.setOption("lineWrapping", els.wrapToggle.checked));

    els.themeBtn.addEventListener("click", () => {
        currentTheme = currentTheme === "light"?"dark" : "light";
        localStorage.setItem("cf_theme", currentTheme);
        applyTheme(currentTheme);
        editor.setOption("theme", currentTheme === "dark"?"material-darker" : "eclipse");
    });

    els.runBtn.addEventListener("click", runViaJudge0);

    els.newProjectBtn.addEventListener("click", () => {
        editor.setValue(DEFAULT_SNIPPETS[currentLanguage] || "");
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

    els.generateBtn.addEventListener("click", () => {
        const code = generateCode(program, currentLanguage);
        editor.setValue(code);
        toast("Generated code into editor.");
        setMode("code");
    });

    els.clearFlowBtn.addEventListener("click", () => {
        program = {
            type: "program",
            children: []
        };
        renderProgram();
    });

    els.exportFlowJsonBtn.addEventListener("click", () => {
        const json = JSON.stringify(program, null, 2);
        openModal("Export Flow JSON", `<textarea class="modal-textarea"></textarea>`, [{
            label: "Copy",
            kind: "primary",
            onClick: async () => {
                await navigator.clipboard.writeText(json);
                toast("Flow JSON copied.");
            }
        }, ]);
        els.modalBody.querySelector("textarea").value = json;
    });

    els.importFlowJsonBtn.addEventListener("click", () => {
        openModal("Import Flow JSON", `
      <div class="modal-hint">Paste exported JSON to restore the program.</div>
      <textarea class="modal-textarea" placeholder='{"type":"program","children":[...]}'></textarea>
    `, [{
            label: "Import",
            kind: "primary",
            onClick: () => {
                const ta = els.modalBody.querySelector("textarea");
                try {
                    const parsed = JSON.parse(ta.value);
                    validateProgram(parsed);
                    program = parsed;
                    closeModal();
                    renderProgram();
                    toast("Flow imported.");
                } catch (err) {
                    toast(`Import failed: ${err.message}`, true);
                }
            }
        }, ]);
    });

    // Save/Load still supported (same endpoints as earlier)
    els.saveBtn.addEventListener("click", () => saveProject());
    els.loadBtn.addEventListener("click", () => loadProjectPicker());

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
}

function setLanguage(langKey) {
    if (!LANGUAGES[langKey]) return;
    currentLanguage = langKey;

    // Minimal mode mapping for CodeMirror; good enough for highlighting
    const cmMode = {
        javascript: "javascript",
        python: "python",
        java: "text/x-java",
        c: "text/x-csrc",
        cpp: "text/x-c++src",
        csharp: "text/x-csharp",
        php: "application/x-httpd-php",
        ruby: "ruby",
        go: "go",
        swift: "swift",
    } [langKey];

    editor.setOption("mode", cmMode);

    const cur = editor.getValue().trim();
    if (!cur || Object.values(DEFAULT_SNIPPETS).some(s => s.trim() === cur)) {
        editor.setValue(DEFAULT_SNIPPETS[langKey] || "");
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
}

// Local sandbox (still useful for JS quick demo)
function resetSandbox() {
    if (!els.sandboxFrame) return;
    els.sandboxFrame.srcdoc = `
<!doctype html><html><head><meta charset="utf-8" />
<style>body{font-family:ui-monospace,Menlo,Consolas,monospace;padding:10px}.err{color:#b22b2b}.line{white-space:pre-wrap}</style>
</head><body><div id="root"></div>
<script>
const root=document.getElementById('root');
function line(t,c){const d=document.createElement('div');d.className='line'+(c?' '+c:'');d.textContent=t;root.appendChild(d);}
console.log=(...a)=>line(a.map(x=>String(x)).join(' '));
console.error=(...a)=>line(a.map(x=>String(x)).join(' '),'err');
window.addEventListener('error',e=>line('Error: '+e.message,'err'));
<\/script></body></html>`;
}

/* ---------------------------
   NESTED FLOW UI
---------------------------- */

function renderProgram() {
    if (!els.flowTree) return;
    els.flowTree.innerHTML = "";

    const rootBranch = renderBranch("Program", program.children, (node) => program.children.push(node));
    els.flowTree.appendChild(rootBranch);
}

function renderBranch(title, arr, addFn) {
    const branch = document.createElement("div");
    branch.className = "branch";
    branch.innerHTML = `
    <div class="branch-head">
      <div class="branch-title">${escapeHtml(title)}</div>
      <div class="branch-actions">
        <button class="mini" data-add="output">+ Output</button>
        <button class="mini" data-add="assign">+ Assign</button>
        <button class="mini" data-add="if">+ If</button>
        <button class="mini" data-add="while">+ While</button>
      </div>
    </div>
    <div class="branch-body"></div>
  `;

    const body = branch.querySelector(".branch-body");
    if (!arr.length) {
        const empty = document.createElement("div");
        empty.style.color = "rgba(15,27,15,.65)";
        empty.style.fontSize = "13px";
        empty.textContent = "No blocks yet. Add one above.";
        body.appendChild(empty);
    } else {
        arr.forEach((node, idx) => body.appendChild(renderNode(node, arr, idx)));
    }

    branch.querySelectorAll("[data-add]").forEach(btn => {
        btn.addEventListener("click", () => {
            const type = btn.getAttribute("data-add");
            addFn(makeNode(type));
            renderProgram();
        });
    });

    return branch;
}

function renderNode(node, parentArr, index) {
    const wrap = document.createElement("div");
    wrap.className = "node";

    wrap.innerHTML = `
    <div class="node-head">
      <div class="node-type">${escapeHtml(nodeLabel(node))}</div>
      <div class="node-actions">
        <button class="mini" data-up>↑</button>
        <button class="mini" data-down>↓</button>
        <button class="mini" data-del>✕</button>
      </div>
    </div>
    <div class="node-sub"></div>
  `;

    // up/down/del
    wrap.querySelector("[data-up]").addEventListener("click", () => {
        if (index <= 0) return;
        [parentArr[index - 1], parentArr[index]] = [parentArr[index], parentArr[index - 1]];
        renderProgram();
    });
    wrap.querySelector("[data-down]").addEventListener("click", () => {
        if (index >= parentArr.length - 1) return;
        [parentArr[index + 1], parentArr[index]] = [parentArr[index], parentArr[index + 1]];
        renderProgram();
    });
    wrap.querySelector("[data-del]").addEventListener("click", () => {
        parentArr.splice(index, 1);
        renderProgram();
    });

    const sub = wrap.querySelector(".node-sub");

    // fields + children branches
    if (node.type === "output") {
        sub.appendChild(fieldInput("Text", node.text?? "", (v) => node.text = v));
    }

    if (node.type === "assign") {
        sub.appendChild(fieldInput("Variable", node.varName?? "x", (v) => node.varName = v));
        sub.appendChild(fieldInput("Value / expression", node.value?? "0", (v) => node.value = v));
    }

    if (node.type === "if") {
        sub.appendChild(fieldInput("Condition", node.condition?? "true", (v) => node.condition = v));

        const kids = document.createElement("div");
        kids.className = "node-children";
        kids.appendChild(renderBranch("THEN", node.then, (n) => node.then.push(n)));
        kids.appendChild(renderBranch("ELSE", node.else, (n) => node.else.push(n)));
        sub.appendChild(kids);
    }

    if (node.type === "while") {
        sub.appendChild(fieldInput("Condition", node.condition?? "true", (v) => node.condition = v));

        const kids = document.createElement("div");
        kids.className = "node-children";
        kids.appendChild(renderBranch("BODY", node.body, (n) => node.body.push(n)));
        sub.appendChild(kids);
    }

    return wrap;
}

function nodeLabel(node) {
    if (node.type === "output") return "OUTPUT";
    if (node.type === "assign") return "ASSIGN";
    if (node.type === "if") return "IF";
    if (node.type === "while") return "WHILE";
    return node.type.toUpperCase();
}

function makeNode(type) {
    if (type === "output") return {
        id: uid(),
        type: "output",
        text: "Hello!"
    };
    if (type === "assign") return {
        id: uid(),
        type: "assign",
        varName: "x",
        value: "10"
    };
    if (type === "if") return {
        id: uid(),
        type: "if",
        condition: "x > 5",
        then: [],
        else: []
    };
    if (type === "while") return {
        id: uid(),
        type: "while",
        condition: "i < 3",
        body: []
    };
    return {
        id: uid(),
        type
    };
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

function validateProgram(p) {
    if (!p || typeof p !== "object") throw new Error("Program must be an object.");
    if (p.type !== "program") throw new Error("Root type must be 'program'.");
    if (!Array.isArray(p.children)) throw new Error("Program.children must be an array.");
    const walk = (arr) => {
        arr.forEach(n => {
            if (!n || typeof n !== "object") throw new Error("Invalid node.");
            if (!n.type) throw new Error("Node missing type.");
            if (!n.id) n.id = uid();
            if (n.type === "if") {
                if (!Array.isArray(n.then) || !Array.isArray(n.else)) throw new Error("If node must have then/else arrays.");
                walk(n.then);
                walk(n.else);
            }
            if (n.type === "while") {
                if (!Array.isArray(n.body)) throw new Error("While node must have body array.");
                walk(n.body);
            }
        });
    };
    walk(p.children);
}

/* ---------------------------
   CODE GENERATION (recursive)
---------------------------- */

function generateCode(program, lang) {
    const lines = [];
    const emit = (s) => lines.push(s);

    const IND = (lvl) => (lang === "python"?"    " : "  ").repeat(lvl);

    // Prelude
    if (lang === "javascript") {
        emit(`// Generated by CodeFlow`);
        emit(`function main(){`);
    } else if (lang === "python") {
        emit(`# Generated by CodeFlow`);
        emit(`def main():`);
    } else if (lang === "java") {
        emit(`// Generated by CodeFlow`);
        emit(`public class Main {`);
        emit(`  public static void main(String[] args) {`);
    } else if (lang === "c") {
        emit(`// Generated by CodeFlow`);
        emit(`#include <stdio.h>`);
        emit(``);
        emit(`int main(void){`);
    } else if (lang === "cpp") {
        emit(`// Generated by CodeFlow`);
        emit(`#include <iostream>`);
        emit(`using namespace std;`);
        emit(``);
        emit(`int main(){`);
    } else if (lang === "csharp") {
        emit(`// Generated by CodeFlow`);
        emit(`using System;`);
        emit(``);
        emit(`class Program {`);
        emit(`  static void Main(){`);
    } else if (lang === "php") {
        emit(`<?php`);
        emit(`// Generated by CodeFlow`);
    } else if (lang === "go") {
        emit(`// Generated by CodeFlow`);
        emit(`package main`);
        emit(`import "fmt"`);
        emit(``);
        emit(`func main(){`);
    } else if (lang === "ruby") {
        emit(`# Generated by CodeFlow`);
    } else if (lang === "swift") {
        emit(`// Generated by CodeFlow`);
        emit(`import Foundation`);
    }

    const baseIndent =
        (lang === "java" || lang === "csharp")?2 :
        (lang === "php" || lang === "ruby" || lang === "swift")?0 :
        (lang === "go" || lang === "c" || lang === "cpp" || lang === "javascript" || lang === "python")?1 : 0;

    const printLine = (text, lvl) => {
        const safe = String(text).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
        if (lang === "javascript") emit(`${IND(lvl)}console.log("${safe}");`);
        else if (lang === "python") emit(`${IND(lvl)}print("${safe}")`);
        else if (lang === "java") emit(`${IND(lvl)}System.out.println("${safe}");`);
        else if (lang === "c") emit(`${IND(lvl)}printf("${safe}\\n");`);
        else if (lang === "cpp") emit(`${IND(lvl)}cout << "${safe}" << endl;`);
        else if (lang === "csharp") emit(`${IND(lvl)}Console.WriteLine("${safe}");`);
        else if (lang === "php") emit(`${IND(lvl)}echo "${safe}\\n";`);
        else if (lang === "ruby") emit(`${IND(lvl)}puts "${safe}"`);
        else if (lang === "go") emit(`${IND(lvl)}fmt.Println("${safe}")`);
        else if (lang === "swift") emit(`${IND(lvl)}print("${safe}")`);
        else emit(`${IND(lvl)}// output: ${safe}`);
    };

    const assignLine = (varName, value, lvl) => {
        const v = (varName || "x").trim() || "x";
        const expr = (value || "0").trim() || "0";
        if (lang === "javascript") emit(`${IND(lvl)}let ${v} = ${expr};`);
        else if (lang === "python") emit(`${IND(lvl)}${v} = ${expr}`);
        else if (lang === "java") emit(`${IND(lvl)}var ${v} = ${expr};`);
        else if (lang === "c") emit(`${IND(lvl)}int ${v} = ${expr};`);
        else if (lang === "cpp") emit(`${IND(lvl)}auto ${v} = ${expr};`);
        else if (lang === "csharp") emit(`${IND(lvl)}var ${v} = ${expr};`);
        else if (lang === "php") emit(`${IND(lvl)}$${v} = ${expr};`);
        else if (lang === "ruby") emit(`${IND(lvl)}${v} = ${expr}`);
        else if (lang === "go") emit(`${IND(lvl)}${v} := ${expr}`);
        else if (lang === "swift") emit(`${IND(lvl)}let ${v} = ${expr}`);
        else emit(`${IND(lvl)}// ${v} = ${expr}`);
    };

    const openIf = (cond, lvl) => {
        const c = (cond || "true").trim() || "true";
        if (lang === "python") emit(`${IND(lvl)}if ${c}:`);
        else if (lang === "ruby") emit(`${IND(lvl)}if ${c}`);
        else if (lang === "go") emit(`${IND(lvl)}if ${c} {`);
        else emit(`${IND(lvl)}if (${c}) {`);
    };

    const elseIf = (lvl) => {
        if (lang === "python") emit(`${IND(lvl)}else:`);
        else if (lang === "ruby") emit(`${IND(lvl)}else`);
        else emit(`${IND(lvl)}} else {`);
    };

    const closeIf = (lvl) => {
        if (lang === "python") return;
        if (lang === "ruby") emit(`${IND(lvl)}end`);
        else emit(`${IND(lvl)}}`);
    };

    const openWhile = (cond, lvl) => {
        const c = (cond || "true").trim() || "true";
        if (lang === "python") emit(`${IND(lvl)}while ${c}:`);
        else if (lang === "ruby") emit(`${IND(lvl)}while ${c}`);
        else if (lang === "go") emit(`${IND(lvl)}for ${c} {`);
        else if (lang === "swift") emit(`${IND(lvl)}while ${c} {`);
        else emit(`${IND(lvl)}while (${c}) {`);
    };

    const closeWhile = (lvl) => {
        if (lang === "python") return;
        if (lang === "ruby") emit(`${IND(lvl)}end`);
        else emit(`${IND(lvl)}}`);
    };

    const walk = (nodes, lvl) => {
        for (const n of nodes) {
            if (n.type === "output") printLine(n.text?? "", lvl);
            else if (n.type === "assign") assignLine(n.varName, n.value, lvl);
            else if (n.type === "if") {
                openIf(n.condition, lvl);
                walk(n.then || [], lvl + (lang === "python"?1 : 1));
                const hasElse = (n.else || []).length > 0;
                if (hasElse) {
                    if (lang === "python") elseIf(lvl);
                    else elseIf(lvl);
                    walk(n.else || [], lvl + (lang === "python"?1 : 1));
                }
                closeIf(lvl);
            } else if (n.type === "while") {
                openWhile(n.condition, lvl);
                walk(n.body || [], lvl + (lang === "python"?1 : 1));
                // safety break if user leaves body empty and condition could be true forever:
                if ((n.body || []).length === 0) {
                    if (lang === "python") emit(`${IND(lvl + 1)}break  # add body blocks or remove this`);
                    else emit(`${IND(lvl + 1)}break; // add body blocks or remove this`);
                }
                closeWhile(lvl);
            } else {
                emit(`${IND(lvl)}// Unsupported node type: ${n.type}`);
            }
        }
    };

    walk(program.children || [], baseIndent);

    // Postlude
    if (lang === "javascript") {
        emit(`}`);
        emit(`main();`);
    } else if (lang === "python") {
        emit(``);
        emit(`if __name__ == "__main__":`);
        emit(`    main()`);
    } else if (lang === "java") {
        emit(`  }`);
        emit(`}`);
    } else if (lang === "c" || lang === "cpp") {
        emit(`  return 0;`);
        emit(`}`);
    } else if (lang === "csharp") {
        emit(`  }`);
        emit(`}`);
    } else if (lang === "go") {
        emit(`}`);
    }

    return lines.join("\n");
}

/* ---------------------------
   JUDGE0 RUNNER
---------------------------- */

async function ensureJudge0Languages() {
    if (judge0Languages) return judge0Languages;
    const res = await fetch("/api/languages");
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load Judge0 languages.");
    judge0Languages = data.languages || [];
    return judge0Languages;
}

function pickJudge0LanguageId(all, langKey) {
    const hint = LANGUAGES[langKey]?.judge0Hint || LANGUAGES[langKey]?.name || langKey;

    // Judge0 language names can be like:
    // "JavaScript (Node.js 20.11.1)" / "Python (3.11.2)" / etc.
    // We'll fuzzy-match.
    const normalized = (s) => String(s).toLowerCase();

    const candidates = all
        .map(x => ({
            id: x.id,
            name: x.name
        }))
        .filter(x => x && x.id && x.name);

    // Prefer startsWith match
    const start = candidates.find(c => normalized(c.name).startsWith(normalized(hint)));
    if (start) return start.id;

    // Fallback contains match
    const contains = candidates.find(c => normalized(c.name).includes(normalized(hint)));
    if (contains) return contains.id;

    return null;
}

async function runViaJudge0() {
    els.output.textContent = "";
    toast(`Submitting to Judge0 (${LANGUAGES[currentLanguage].name})…`);

    try {
        const langs = await ensureJudge0Languages();
        const language_id = pickJudge0LanguageId(langs, currentLanguage);
        if (!language_id) {
            throw new Error(`Couldn't map ${LANGUAGES[currentLanguage].name} to a Judge0 language_id. Check /languages on your Judge0.`);
        }

        const payload = {
            language_id,
            source_code: editor.getValue(),
            stdin: "", // you can add a UI input later
        };

        const res = await fetch("/api/run", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Run failed.");

        const out = [];
        out.push(`Status: ${data.status?.description || "?"} (id ${data.status?.id ?? "?"})`);
        if (data.time != null) out.push(`Time: ${data.time}s`);
        if (data.memory != null) out.push(`Memory: ${data.memory} KB`);

        if (data.compile_output) out.push(`\n--- compile_output ---\n${data.compile_output}`);
        if (data.stdout) out.push(`\n--- stdout ---\n${data.stdout}`);
        if (data.stderr) out.push(`\n--- stderr ---\n${data.stderr}`);
        if (data.message) out.push(`\n--- message ---\n${data.message}`);

        els.output.textContent = out.join("\n");
        toast("Done.");
    } catch (err) {
        toast(err.message, true);
    }
}

/* ---------------------------
   SAVE/LOAD (unchanged behaviour)
---------------------------- */

async function saveProject() {
    const payload = {
        language: currentLanguage,
        code: editor.getValue(),
        flow: program,
        title: `Project (${LANGUAGES[currentLanguage].name})`,
    };

    openModal("Save Project", `
    <div class="modal-hint">Name your project (stored in Supabase via /api/saveProject).</div>
    <div class="field">
      <label>Project name</label>
      <input id="projName" type="text" value="${escapeHtml(payload.title)}"/>
    </div>
    <div class="modal-hint subtle">If Supabase env vars aren’t set on Vercel, save will fail.</div>
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

                    // New nested format: proj.flow is {type:"program", children:[...]}
                    if (proj?.flow) {
                        validateProgram(proj.flow);
                        program = proj.flow;
                        renderProgram();
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

/* ---------------------------
   MODAL + UTIL
---------------------------- */

function openModal(title, bodyHtml, actions) {
    els.modalTitle.textContent = title;
    els.modalBody.innerHTML = bodyHtml;

    els.modalFoot.innerHTML = "";
    (actions || []).forEach(a => {
        const b = document.createElement("button");
        b.className = `btn ${a.kind === "primary"?"primary" : ""}`;
        b.type = "button";
        b.textContent = a.label;
        b.addEventListener("click", a.onClick);
        els.modalFoot.appendChild(b);
    });

    const cancel = document.createElement("button");
    cancel.className = "btn";
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", closeModal);
    els.modalFoot.appendChild(cancel);

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
    els.output.textContent = (isError?"Error: " : "") + msg + "\n" + els.output.textContent;
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