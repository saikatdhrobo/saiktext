const input = document.querySelector("#inputText");
const output = document.querySelector("#outputText");

const clearButton = document.querySelector("#clearButton");
const copyButton = document.querySelector("#copyButton");

const toast = document.querySelector("#toast");
const header = document.querySelector("#siteHeader");
const cursorLight = document.querySelector(".cursor-light");

const counters = {
    characters: document.querySelector("#charCount"),
    words: document.querySelector("#wordCount"),
    sentences: document.querySelector("#sentenceCount"),
    paragraphs: document.querySelector("#paragraphCount")
};

let activeTransform = "identity";

let historyStack = [""];
let historyIndex = 0;
let isRestoring = false;

const EMPTY_STATE =
    "Start typing to see live transformations.";

const wordsFromText = (text) =>
    text
        .trim()
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean);

const capitalize = (word) =>
    word
        ? word.charAt(0).toUpperCase() +
          word.slice(1).toLowerCase()
        : "";

const transformText = {

    identity: (text) => text,

    uppercase: (text) =>
        text.toUpperCase(),

    lowercase: (text) =>
        text.toLowerCase(),

    title: (text) =>
        text
            .toLowerCase()
            .replace(
                /\b[\p{L}\p{N}'-]+/gu,
                (word) => capitalize(word)
            ),

    sentence: (text) => {
        const lower = text.toLowerCase();

        return lower.replace(
            /(^\s*[a-z])|([.!?]\s+[a-z])/g,
            (match) => match.toUpperCase()
        );
    },

    alternating: (text) => {
        let index = 0;

        return Array.from(text)
            .map((char) => {

                if (!/[a-z]/i.test(char)) {
                    return char;
                }

                const transformed =
                    index % 2 === 0
                        ? char.toUpperCase()
                        : char.toLowerCase();

                index += 1;

                return transformed;
            })
            .join("");
    },

    camel: (text) => {

        const words =
            wordsFromText(text).map(
                (word) => word.toLowerCase()
            );

        return words
            .map((word, index) =>
                index === 0
                    ? word
                    : capitalize(word)
            )
            .join("");
    },

    pascal: (text) =>
        wordsFromText(text)
            .map(capitalize)
            .join(""),

    snake: (text) =>
        wordsFromText(text)
            .map((word) =>
                word.toLowerCase()
            )
            .join("_"),

    kebab: (text) =>
        wordsFromText(text)
            .map((word) =>
                word.toLowerCase()
            )
            .join("-"),

    constant: (text) =>
        wordsFromText(text)
            .map((word) =>
                word.toUpperCase()
            )
            .join("_"),

    trimSpaces: (text) =>
        text
            .split("\n")
            .map((line) =>
                line
                    .trim()
                    .replace(/\s+/g, " ")
            )
            .join("\n")
            .trim(),

    dedupeLines: (text) => {

        const seen = new Set();

        return text
            .split(/\r?\n/)
            .filter((line) => {

                const normalized =
                    line.trim();

                if (seen.has(normalized)) {
                    return false;
                }

                seen.add(normalized);

                return true;
            })
            .join("\n");
    },

    removeBlankLines: (text) =>
        text
            .split(/\r?\n/)
            .filter(
                (line) => line.trim() !== ""
            )
            .join("\n"),

    reverseText: (text) =>
        Array.from(text)
            .reverse()
            .join(""),

    reverseWords: (text) =>
        text
            .split("\n")
            .map((line) =>
                line
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .reverse()
                    .join(" ")
            )
            .join("\n"),

    sortLines: (text) =>
        text
            .split(/\r?\n/)
            .sort((a, b) =>
                a.localeCompare(b)
            )
            .join("\n"),

    shuffleText: (text) => {

        const words = text
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        for (
            let i = words.length - 1;
            i > 0;
            i -= 1
        ) {

            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [words[i], words[j]] =
                [words[j], words[i]];
        }

        return words.join(" ");
    }
};

function setOutput(text) {

    const transformer =
        transformText[activeTransform] ||
        transformText.identity;

    const value = transformer(text);

    output.textContent =
        value || EMPTY_STATE;

    output.classList.toggle(
        "has-value",
        Boolean(value)
    );

    updateAnalytics(value);
}

function resizeTextarea() {

    input.style.height = "auto";

    input.style.height =
        `${Math.max(
            input.scrollHeight,
            310
        )}px`;
}

function pushHistory(value) {

    if (
        isRestoring ||
        historyStack[historyIndex] === value
    ) {
        return;
    }

    historyStack =
        historyStack.slice(
            0,
            historyIndex + 1
        );

    historyStack.push(value);

    historyIndex =
        historyStack.length - 1;
}

function setInput(
    value,
    shouldTrack = true
) {

    input.value = value;

    resizeTextarea();

    setOutput(value);

    if (shouldTrack) {
        pushHistory(value);
    }
}

function applyAction(action) {

    if (action === "undo") {
        undo();
        return;
    }

    if (action === "redo") {
        redo();
        return;
    }

    if (!transformText[action]) {
        return;
    }

    activeTransform = action;

    setOutput(input.value);

    markActiveButton(action);
}

function markActiveButton(action) {

    document
        .querySelectorAll("[data-action]")
        .forEach((button) => {

            button.classList.toggle(
                "is-active",
                button.dataset.action === action
            );
        });

    window.setTimeout(() => {

        document
            .querySelectorAll(".is-active")
            .forEach((button) => {

                button.classList.remove(
                    "is-active"
                );
            });

    }, 650);
}

function undo() {

    if (historyIndex === 0) {
        return;
    }

    isRestoring = true;

    historyIndex -= 1;

    setInput(
        historyStack[historyIndex],
        false
    );

    isRestoring = false;
}

function redo() {

    if (
        historyIndex >=
        historyStack.length - 1
    ) {
        return;
    }

    isRestoring = true;

    historyIndex += 1;

    setInput(
        historyStack[historyIndex],
        false
    );

    isRestoring = false;
}

function updateAnalytics(text) {

    const trimmed = text.trim();

    const stats = {

        characters: text.length,

        words: trimmed
            ? trimmed.split(/\s+/).length
            : 0,

        sentences: trimmed
            ? (
                trimmed.match(
                    /[^.!?]+[.!?]+|[^.!?]+$/g
                ) || []
            ).filter(
                (item) => item.trim()
            ).length
            : 0,

        paragraphs: trimmed
            ? trimmed
                .split(/\n\s*\n/)
                .filter(
                    (item) => item.trim()
                ).length
            : 0
    };

    Object.entries(stats).forEach(
        ([key, value]) => {

            animateCounter(
                counters[key],
                value
            );
        }
    );
}

function animateCounter(
    element,
    nextValue
) {

    const current =
        Number(
            element.textContent.replace(
                /,/g,
                ""
            )
        ) || 0;

    const duration = 260;

    const start = performance.now();

    function tick(now) {

        const progress =
            Math.min(
                (now - start) / duration,
                1
            );

        const eased =
            1 - Math.pow(
                1 - progress,
                3
            );

        const value = Math.round(
            current +
            (nextValue - current) *
            eased
        );

        element.textContent =
            value.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    }

    requestAnimationFrame(tick);
}

async function copyOutput() {

    const text =
        output.textContent === EMPTY_STATE
            ? ""
            : output.textContent;

    if (!text) {

        showToast(
            "Nothing to copy yet"
        );

        return;
    }

    try {

        await navigator
            .clipboard
            .writeText(text);

        showToast(
            "Copied to clipboard"
        );

    } catch {

        const selection =
            window.getSelection();

        const range =
            document.createRange();

        range.selectNodeContents(output);

        selection.removeAllRanges();

        selection.addRange(range);

        showToast(
            "Text selected for copy"
        );
    }
}

function showToast(message) {

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 1800);
}

document
    .querySelectorAll("[data-action]")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () =>
                applyAction(
                    button.dataset.action
                )
        );
    });

input.addEventListener(
    "input",
    () => {

        setOutput(input.value);

        resizeTextarea();

        pushHistory(input.value);
    }
);

clearButton.addEventListener(
    "click",
    () => {

        activeTransform = "identity";

        setInput("");

        input.focus();

        showToast("Text cleared");
    }
);

copyButton.addEventListener(
    "click",
    copyOutput
);

document.addEventListener(
    "keydown",
    (event) => {

        const shortcut =
            event.ctrlKey &&
            event.shiftKey;

        if (
            shortcut &&
            event.key.toLowerCase() === "u"
        ) {

            event.preventDefault();

            applyAction("uppercase");
        }

        if (
            shortcut &&
            event.key.toLowerCase() === "l"
        ) {

            event.preventDefault();

            applyAction("lowercase");
        }

        if (
            shortcut &&
            event.key.toLowerCase() === "c"
        ) {

            event.preventDefault();

            copyOutput();
        }

        if (
            event.ctrlKey &&
            !event.shiftKey &&
            event.key.toLowerCase() === "z"
        ) {

            event.preventDefault();

            undo();
        }

        if (
            event.ctrlKey &&
            !event.shiftKey &&
            event.key.toLowerCase() === "y"
        ) {

            event.preventDefault();

            redo();
        }
    }
);

document.addEventListener(
    "mousemove",
    (event) => {

        cursorLight.style.opacity = "1";

        cursorLight.style.left =
            `${event.clientX}px`;

        cursorLight.style.top =
            `${event.clientY}px`;
    }
);

window.addEventListener(
    "scroll",
    () => {

        header.classList.toggle(
            "scrolled",
            window.scrollY > 20
        );
    }
);

const revealElements =
    document.querySelectorAll(".reveal");

const revealObserver =
    new IntersectionObserver(
        (entries) => {

            entries.forEach((entry) => {

                if (
                    entry.isIntersecting
                ) {

                    entry.target.classList.add(
                        "visible"
                    );
                }
            });
        },
        {
            threshold: 0.12
        }
    );

revealElements.forEach(
    (element) => {

        revealObserver.observe(element);
    }
);

window.addEventListener(
    "load",
    () => {

        document.body.classList.add(
            "loaded"
        );

        resizeTextarea();

        setOutput("");
    }
);