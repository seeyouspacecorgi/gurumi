// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

	const moo = require("moo")
	const lexer = moo.compile({
		number: 	{ match: /[0-9]+/, value: str => Number(str) },
		lparen:  	"(",
		rparen:  	")",
		identifier:	/[a-z]+/, //stitchname
		separator:	/[,+]/,
		ws:     	/[ \t]+/,

	});
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "STITCHES", "symbols": ["STITCH"]},
    {"name": "STITCHES", "symbols": ["STITCH", "separator", "STITCHES"], "postprocess": data => [data[0], ...data[2]]},
    {"name": "STITCH", "symbols": ["number", "_", (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": 
        ([n, _, i]) => {
        	return {
        		type: "stitch",
        		times: n.value,
        		value: i.value
        	}
        }},
    {"name": "number", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": id},
    {"name": "separator", "symbols": ["__"]},
    {"name": "separator", "symbols": ["_", (lexer.has("separator") ? {type: "separator"} : separator), "_"], "postprocess": () => null},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": () => null},
    {"name": "__$ebnf$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": () => null}
]
  , ParserStart: "STITCHES"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
