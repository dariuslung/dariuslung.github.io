const input = document.getElementById('ls_input');
const countEl = document.getElementById('ls_count');
const criteriaEl = document.getElementById('ls_criteria');
const orderEl = document.getElementById('ls_order');
const dedupeEl = document.getElementById('ls_dedupe');
const sortBtn = document.getElementById('ls_sort');
const undoBtn = document.getElementById('ls_undo');
const copyBtn = document.getElementById('ls_copy');
const noteEl = document.getElementById('ls_note');

// Single-level undo: the text from just before the last sort.
let previousText = null;

const alphaCollator = new Intl.Collator(undefined, { sensitivity: 'accent' });
const naturalCollator = new Intl.Collator(undefined, { sensitivity: 'accent', numeric: true });

const comparators = {
    alpha: (a, b) => alphaCollator.compare(a, b),
    natural: (a, b) => naturalCollator.compare(a, b),
    length: (a, b) => a.length - b.length,
};

// Trim each line and drop empty ones; accepts \n and \r\n.
function parseLines(text) {
    const raw = text.split(/\r?\n/);
    const lines = raw.map(l => l.trim()).filter(l => l !== '');
    return { lines, blanks: raw.length - lines.length };
}

function removeDuplicates(lines) {
    const seen = new Set();
    return lines.filter(line => {
        const key = line.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Fisher-Yates
function shuffle(lines) {
    const out = [...lines];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

function sortLines(lines, criteria, order) {
    if (criteria === 'random') return shuffle(lines);
    if (criteria === 'reverse') return [...lines].reverse();
    const cmp = comparators[criteria];
    // Negate rather than reverse for descending, so equal lines keep their original order.
    const signed = order === 'desc' ? (a, b) => -cmp(a, b) : cmp;
    return [...lines].sort(signed);
}

function plural(n, word) {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function updateCount() {
    countEl.textContent = plural(parseLines(input.value).lines.length, 'line');
}

function setUndo(text) {
    previousText = text;
    undoBtn.disabled = text === null;
}

function updateOrderAvailability() {
    const orderless = criteriaEl.value === 'random' || criteriaEl.value === 'reverse';
    orderEl.disabled = orderless;
}

sortBtn.addEventListener('click', () => {
    const before = input.value;
    const parsed = parseLines(before);
    let lines = parsed.lines;

    if (lines.length === 0) {
        noteEl.textContent = 'Nothing to sort.';
        return;
    }

    let duplicates = 0;
    if (dedupeEl.checked) {
        const unique = removeDuplicates(lines);
        duplicates = lines.length - unique.length;
        lines = unique;
    }

    const sorted = sortLines(lines, criteriaEl.value, orderEl.value);
    setUndo(before);
    input.value = sorted.join('\n');

    const parts = [`${plural(sorted.length, 'line')} sorted`];
    if (parsed.blanks > 0) parts.push(`${parsed.blanks} blank removed`);
    if (duplicates > 0) parts.push(`${plural(duplicates, 'duplicate')} removed`);
    noteEl.textContent = parts.join(', ');
    updateCount();
});

undoBtn.addEventListener('click', () => {
    if (previousText === null) return;
    input.value = previousText;
    setUndo(null);
    noteEl.textContent = 'Restored the text from before the last sort.';
    updateCount();
});

// Typing means the saved snapshot no longer matches what the user is working on.
input.addEventListener('input', () => {
    setUndo(null);
    updateCount();
});

criteriaEl.addEventListener('change', updateOrderAvailability);

// Copy stays hidden when the Clipboard API is unavailable.
if (navigator.clipboard) {
    copyBtn.classList.remove('hidden');
    let timer;
    copyBtn.addEventListener('click', () => {
        const flash = (label, message) => {
            copyBtn.textContent = label;
            noteEl.textContent = message;
            clearTimeout(timer);
            timer = setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        };
        navigator.clipboard.writeText(input.value)
            .then(() => flash('Copied', 'Text copied to clipboard.'))
            .catch(() => flash('Copy failed', 'Could not copy the text.'));
    });
}

updateOrderAvailability();
updateCount();
