export const objectives = {
    '1': [
        "Learn Basic Python Syntax",
        "Understand Variables",
        "Master Print Statements"
    ],
    '2': [
        "Control Flow",
        "If/Else Statements",
        "Comparison Operators"
    ]
};

export const puzzleData = {
    '1': {
        '1': {
            id: 't1-f1',
            floor: 1,
            towerId: 1,
            description: 'You need to cast a simple print spell. Arrange the blocks to print "Hello World" to the console.',
            expectedOutput: 'Hello World',
            rewards: {
                exp: 100,
                gems: 10
            },
            initialBlocks: [
                { id: 'b1', content: '("Hello World")', type: 'value', color: 'bg-purple-500' },
                { id: 'b2', content: 'print', type: 'function', color: 'bg-red-500' },
                { id: 'b3', content: 'if', type: 'control', color: 'bg-cyan-500' },
            ],
            correctSequence: ['b2', 'b1'], // print -> ("Hello World")
            hints: [
                { cost: 10, text: "The 'print' block is used to output text to the console." },
                { cost: 20, text: "Try placing the function block before the string value." },
                { cost: 50, text: "Solution: Connect [print] -> [(\"Hello World\")]" }
            ]
        }
    }
};
