// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

	const moo = require("moo")
	const lexer = moo.compile({
		number: 				{ match: /[0-9]+/, value: str => Number(str) },
		lparen:  				"(",
		rparen:  				")",
		identifier:			/[a-z][a-z-.]*/,
		separator:			/[,+]/,
		multiplicator:	/[xX×*]/,
		ws:     				/[ \t]+/
	});
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "PATTERN", "symbols": ["ROW"], "postprocess": id},
    {"name": "ROW$subexpression$1", "symbols": ["STITCH"]},
    {"name": "ROW$subexpression$1", "symbols": ["REPEAT"]},
    {"name": "ROW$ebnf$1", "symbols": []},
    {"name": "ROW$ebnf$1$subexpression$1$subexpression$1", "symbols": ["STITCH"]},
    {"name": "ROW$ebnf$1$subexpression$1$subexpression$1", "symbols": ["REPEAT"]},
    {"name": "ROW$ebnf$1$subexpression$1", "symbols": ["separator", "ROW$ebnf$1$subexpression$1$subexpression$1"]},
    {"name": "ROW$ebnf$1", "symbols": ["ROW$ebnf$1", "ROW$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "ROW", "symbols": ["ROW$subexpression$1", "ROW$ebnf$1"], "postprocess": 
        data => [
        	...data[0],  //mandatory step
        	...data[1].map(x => x[1][0]) //optional additional steps [[separator [STEP]].map( _ => STEP)
        ]
        },
    {"name": "REPEAT$ebnf$1", "symbols": []},
    {"name": "REPEAT$ebnf$1$subexpression$1", "symbols": ["separator", "STITCH"]},
    {"name": "REPEAT$ebnf$1", "symbols": ["REPEAT$ebnf$1", "REPEAT$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "REPEAT", "symbols": [{"literal":"("}, "_", "STITCH", "REPEAT$ebnf$1", "_", {"literal":")"}, "_", (lexer.has("multiplicator") ? {type: "multiplicator"} : multiplicator), "_", (lexer.has("number") ? {type: "number"} : number)], "postprocess": 
        data => {
        	return {
        		type: "repeat",
        		stitches: [
        			data[2], //mandatory stitch
        			...data[3].map(x => x[1]) //optional additional stitches [[separator STITCH]].map( _ => STITCH)
        		],
        		times: data[9].value, //%number
        		col: data[0].col,
        		offset: data[9].col - data[0].col + data[9].text.length
        	}
        }
        },
    {"name": "STITCH", "symbols": [(lexer.has("number") ? {type: "number"} : number), "_", (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": 
        data => {
        	return {
        		type: "stitch",
        		times: data[0].value, //%number
        		value: data[2].value,  //%identifier
        		col: data[0].col,
        		offset: data[2].col - data[0].col + data[2].text.length
        	}
        }},
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
