/**
 * Block Generator Utility
 * Automatically generates puzzle blocks (initial_blocks + correct_sequence)
 * from a solution string. Used when instructors update solution/expected_output
 * so blocks stay in sync.
 */

// Block color palette based on type
const BLOCK_COLORS = {
    function: 'bg-red-500',
    value: 'bg-purple-500',
    control: 'bg-cyan-500',
    operator: 'bg-amber-500',
    keyword: 'bg-emerald-500',
    string: 'bg-purple-500',
    output: 'bg-red-500',
};

/**
 * Classify a code fragment into a block type
 */
function classifyFragment(fragment) {
    const trimmed = fragment.trim();

    // Output/print functions
    if (/^(print\(|console\.log\(|Console\.WriteLine\(|echo |std::cout|cout\s*<<|SELECT|INSERT|UPDATE|DELETE)/i.test(trimmed)) {
        return 'function';
    }
    // Control flow keywords
    if (/^(if|else|elif|for|while|switch|case|try|catch|foreach)\b/i.test(trimmed)) {
        return 'control';
    }
    // String literals
    if (/^["']/.test(trimmed) || /^[`]/.test(trimmed)) {
        return 'value';
    }
    // Numeric values
    if (/^\d/.test(trimmed)) {
        return 'value';
    }
    // Operators/assignments
    if (/^[=+\-*/<>!&|]/.test(trimmed)) {
        return 'operator';
    }
    // Keywords
    if (/^(def |class |function |const |let |var |int |string |float |double |void |return |import |from |using |namespace |#include)/i.test(trimmed)) {
        return 'keyword';
    }

    return 'value';
}

/**
 * Split a single-line code statement into logical fragments.
 * E.g., `print("Hello")` → [`print(`, `"Hello")`]
 * E.g., `x = 5` → [`x = `, `5`]
 */
function splitStatement(statement) {
    const trimmed = statement.trim();
    if (!trimmed) return [];

    // Pattern 1: Function call — split into function+paren and arguments+close
    // Matches: print("x"), console.log("x"), Console.WriteLine("x"), echo "x"
    const funcCallMatch = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_.$]*(?:::)?[a-zA-Z0-9_]*\s*(?:<<\s*)?\()(.+\).*)$/);
    if (funcCallMatch) {
        return [funcCallMatch[1], funcCallMatch[2]];
    }

    // Pattern 1b: echo/print without parens (PHP)
    const echoMatch = trimmed.match(/^(echo\s+)(.+)$/i);
    if (echoMatch) {
        return [echoMatch[1], echoMatch[2]];
    }

    // Pattern 1c: cout << with chaining
    const coutMatch = trimmed.match(/^((?:std::)?cout\s*<<\s*)(.+)$/);
    if (coutMatch) {
        return [coutMatch[1], coutMatch[2]];
    }

    // Pattern 2: Assignment — split at '='
    const assignMatch = trimmed.match(/^(.+?=\s*)(.+)$/);
    if (assignMatch && !trimmed.startsWith('==')) {
        return [assignMatch[1], assignMatch[2]];
    }

    // Pattern 3: SQL keywords — split at first space after keyword
    const sqlMatch = trimmed.match(/^(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|FROM|WHERE|JOIN|ORDER\s+BY|GROUP\s+BY)\s+(.+)$/i);
    if (sqlMatch) {
        return [sqlMatch[1] + ' ', sqlMatch[2]];
    }

    // Fallback: return as single block
    return [trimmed];
}

/**
 * Generate a plausible distractor (dummy) block based on existing fragments.
 * Creates a block that looks similar but is syntactically wrong.
 */
function generateDistractorBlock(fragments, blockIdCounter) {
    const distractors = [
        { content: 'console.log(', type: 'function' },
        { content: 'println(', type: 'function' },
        { content: 'printf(', type: 'function' },
        { content: 'echo ', type: 'function' },
        { content: 'System.out.print(', type: 'function' },
        { content: '"undefined")', type: 'value' },
        { content: '"null")', type: 'value' },
        { content: '"error")', type: 'value' },
        { content: 'x = 0', type: 'operator' },
        { content: 'break;', type: 'control' },
        { content: 'return;', type: 'control' },
        { content: 'pass', type: 'keyword' },
        { content: 'None', type: 'value' },
        { content: '# comment', type: 'keyword' },
        { content: 'True', type: 'value' },
    ];

    // Filter out distractors that match an existing fragment
    const existingContents = fragments.map(f => f.toLowerCase().trim());
    const available = distractors.filter(d => !existingContents.includes(d.content.toLowerCase().trim()));

    const chosen = available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : { content: 'None', type: 'value' };

    return {
        id: `dummy${blockIdCounter}`,
        content: chosen.content,
        type: chosen.type,
        color: BLOCK_COLORS[chosen.type] || 'bg-slate-500',
    };
}

/**
 * Assign interlocking connectors to all blocks.
 * Rules:
 * - All sides must be 1 (Tab/Out) or 2 (Slot/In). NEVER 0.
 * - Sequential blocks: current.right = 1, next.left = 2
 * - Top/Bottom: random 1 or 2
 */
function assignConnectors(blocks, correctSequence) {
    const seqMap = {};
    correctSequence.forEach((id, idx) => {
        seqMap[id] = idx;
    });

    blocks.forEach(block => {
        const seqIdx = seqMap[block.id];
        const isInSequence = seqIdx !== undefined;

        // Top/Bottom: random
        const topConn = Math.random() > 0.5 ? 1 : 2;
        const bottomConn = Math.random() > 0.5 ? 1 : 2;

        if (isInSequence) {
            // Right: Tab (1) if there's a next block, else random
            const hasNext = seqIdx < correctSequence.length - 1;
            // Left: Slot (2) if there's a previous block, else random
            const hasPrev = seqIdx > 0;

            block.connectors = {
                top: topConn,
                right: hasNext ? 1 : (Math.random() > 0.5 ? 1 : 2),
                bottom: bottomConn,
                left: hasPrev ? 2 : (Math.random() > 0.5 ? 1 : 2),
            };
        } else {
            // Dummy block — give random connectors that COULD fit but are wrong
            block.connectors = {
                top: topConn,
                right: Math.random() > 0.5 ? 1 : 2,
                bottom: bottomConn,
                left: Math.random() > 0.5 ? 1 : 2,
            };
        }
    });

    return blocks;
}

/**
 * Main entry point: Generate blocks from a solution string.
 * 
 * @param {string} solution - The complete code solution
 * @param {string} courseMode - 'Beginner', 'Intermediate', or 'Advance'
 * @returns {{ initialBlocks: Array, correctSequence: Array } | null}
 */
export function generateBlocksFromSolution(solution, courseMode) {
    // Advance mode uses pure code, no blocks needed
    if (!solution || courseMode === 'Advance' || courseMode === 'Advanced') {
        return null;
    }

    // Split solution into lines, filter empties
    const lines = solution.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Split each line into fragments
    let allFragments = [];
    for (const line of lines) {
        const fragments = splitStatement(line);
        allFragments.push(...fragments);
    }

    // If splitting produced nothing useful, use lines as-is
    if (allFragments.length === 0) {
        allFragments = lines.length > 0 ? lines : [solution.trim()];
    }

    // Cap at reasonable block count (max 10 real blocks)
    // If there are too many fragments, merge some
    while (allFragments.length > 10) {
        const merged = [];
        for (let i = 0; i < allFragments.length; i += 2) {
            if (i + 1 < allFragments.length) {
                merged.push(allFragments[i] + allFragments[i + 1]);
            } else {
                merged.push(allFragments[i]);
            }
        }
        allFragments = merged;
    }

    // Create block objects
    let blockIdCounter = 1;
    const blocks = allFragments.map((fragment) => {
        const type = classifyFragment(fragment);
        return {
            id: `b${blockIdCounter++}`,
            content: fragment,
            type: type,
            color: BLOCK_COLORS[type] || 'bg-purple-500',
        };
    });

    // Correct sequence is the order of real blocks
    const correctSequence = blocks.map(b => b.id);

    // Determine dummy block count based on mode
    const isBeginner = courseMode?.toLowerCase().includes('beginner');
    const isIntermediate = courseMode?.toLowerCase().includes('intermediate');
    const baseDummyCount = isBeginner ? 3 : isIntermediate ? 2 : 2;

    // Ensure minimum of 7 total blocks
    const MIN_TOTAL_BLOCKS = 7;
    const currentTotal = blocks.length + baseDummyCount;
    const dummyCount = currentTotal < MIN_TOTAL_BLOCKS
        ? baseDummyCount + (MIN_TOTAL_BLOCKS - currentTotal)
        : baseDummyCount;

    // Add dummy distractor blocks
    for (let i = 0; i < dummyCount; i++) {
        const dummy = generateDistractorBlock(allFragments, blockIdCounter++);
        blocks.push(dummy);
    }

    // Assign connectors to all blocks
    assignConnectors(blocks, correctSequence);

    // Shuffle initial blocks using Fisher-Yates so they are NOT in correct order
    const shuffled = [...blocks];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return {
        initialBlocks: shuffled,
        correctSequence: correctSequence,
    };
}

/**
 * Check if existing blocks match the current solution.
 * Returns true if they are in sync, false if regeneration is needed.
 */
export function blocksMatchSolution(existingBlocks, solution) {
    if (!solution || !existingBlocks) return true;
    if (!Array.isArray(existingBlocks) || existingBlocks.length === 0) return false;

    // Parse if string
    let blocks = existingBlocks;
    if (typeof blocks === 'string') {
        try {
            blocks = JSON.parse(blocks);
        } catch {
            return false;
        }
    }

    // Filter out dummy blocks
    const realBlocks = blocks.filter(b => !b.id?.startsWith('dummy'));
    if (realBlocks.length === 0) return false;

    // Concatenate block contents
    const blockContent = realBlocks.map(b => b.content || '').join('').trim();

    // Normalize the solution (remove extra whitespace between tokens)
    const normalizedSolution = solution.replace(/\n/g, '').trim();

    // Compare
    return blockContent === normalizedSolution;
}

export default { generateBlocksFromSolution, blocksMatchSolution };
