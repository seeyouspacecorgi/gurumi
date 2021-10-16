// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

	const moo = require("moo")
	const lexer = moo.compile({
		number: 						{ match: /[0-9]+/, value: str => Number(str) },
		lparen:  						"(",
		rparen:  						")",
		identifier:					/[a-z][a-z-.]*/,
		separator:					/[,+]/,
		multiplicator:			/[xX×*]/,
		ws:     						/[ \t]+/,
		nl:      						{ match: /\n/, lineBreaks: true },
	});
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "PATTERN$ebnf$1", "symbols": []},
    {"name": "PATTERN$ebnf$1$subexpression$1", "symbols": ["nl", "ROW"]},
    {"name": "PATTERN$ebnf$1", "symbols": ["PATTERN$ebnf$1", "PATTERN$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "PATTERN", "symbols": ["ROW", "PATTERN$ebnf$1"], "postprocess": 
        data => { // 0.row 1.[[0.nl 1.row]]
        	return [
        		data[0],  // row (mandatory) [! no array spread, because row should be iterable]
        		...data[1].map(x => x[1]) // rows (optional)
        	]
        }
        },
    {"name": "ROW$subexpression$1", "symbols": ["STITCH"]},
    {"name": "ROW$subexpression$1", "symbols": ["REPEAT"]},
    {"name": "ROW$ebnf$1", "symbols": []},
    {"name": "ROW$ebnf$1$subexpression$1$subexpression$1", "symbols": ["STITCH"]},
    {"name": "ROW$ebnf$1$subexpression$1$subexpression$1", "symbols": ["REPEAT"]},
    {"name": "ROW$ebnf$1$subexpression$1", "symbols": ["separator", "ROW$ebnf$1$subexpression$1$subexpression$1"]},
    {"name": "ROW$ebnf$1", "symbols": ["ROW$ebnf$1", "ROW$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ROW", "symbols": ["ROW$subexpression$1", "ROW$ebnf$1"], "postprocess": 
        data => { // 0.[stitch|repeat] 1.[[0.+ 1.[stitch|repeat]]]
        	return {
        		type: "row",
        		operations: [
        			...data[0],  // step (mandatory)
        			...data[1].map(x => x[1][0]) // steps (optional), [[separator [STEP]]].map(array => STEP)
        		]
        	}
        }
        },
    {"name": "REPEAT$ebnf$1", "symbols": []},
    {"name": "REPEAT$ebnf$1$subexpression$1", "symbols": ["separator", "STITCH"]},
    {"name": "REPEAT$ebnf$1", "symbols": ["REPEAT$ebnf$1", "REPEAT$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "REPEAT", "symbols": [{"literal":"("}, "_", "STITCH", "REPEAT$ebnf$1", "_", {"literal":")"}, "_", (lexer.has("multiplicator") ? {type: "multiplicator"} : multiplicator), "_", (lexer.has("number") ? {type: "number"} : number)], "postprocess": 
        data => { // 0.( 1._ 2.stitch 3.[[0.+ 1.stitch]] 4._ 5.) 6._ 7.x 8._ 9.number
        	return {
        		type: "repeat",
        		operations: [
        			data[2], // stitch (mandatory)
        			...data[3].map(x => x[1]) // stiches (optional), [[separator STITCH]].map(array => STITCH)
        		],
        		times: data[9].value, // number.value
        		line: data[0].line,
        		col: data[0].col, // first.col
        		offset: data[9].col - data[0].col + data[9].text.length // last.col - first.col + last.length = total length
        	}
        }
        },
    {"name": "STITCH", "symbols": [(lexer.has("number") ? {type: "number"} : number), "_", (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": 
        data => { // 0.number 1._ 2.identifier
        	return {
        		type: "stitch",
        		times: data[0].value, // number.value
        		value: data[2].value,  // identifier.value
        		line: data[0].line,
        		col: data[0].col,	// first.col
        		offset: data[2].col - data[0].col + data[2].text.length // last.col - first.col + last.length = total length
        	}
        }
        },
    {"name": "nl", "symbols": ["_", (lexer.has("nl") ? {type: "nl"} : nl), "_"], "postprocess": () => null},
    {"name": "separator", "symbols": ["__"]},
    {"name": "separator", "symbols": ["_", (lexer.has("separator") ? {type: "separator"} : separator), "_"], "postprocess": () => null},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": () => null},
    {"name": "__$ebnf$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": () => null}
]
  , ParserStart: "PATTERN"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
