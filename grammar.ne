@{%
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
%}

@lexer lexer

PATTERN -> ROW											{% id %}

ROW -> (STITCH|REPEAT) (separator (STITCH|REPEAT)):* {%
	data => [ // 0.[stitch|repeat] 1.[[0.+ 1.[stitch|repeat]]]
		...data[0],  // step (mandatory)
		...data[1].map(x => x[1][0]) // steps (optional), [[separator [STEP]]].map(array => STEP)
	]
%}

REPEAT -> "(" _ STITCH (separator STITCH):*  _ ")" _ %multiplicator _ %number {%
	data => { // 0.( 1._ 2.stitch 3.[[0.+ 1.stitch]] 4._ 5.) 6._ 7.x 8._ 9.number
		return {
			type: "repeat",
			stitches: [
				data[2], // stitch (mandatory)
				...data[3].map(x => x[1]) // stiches (optional), [[separator STITCH]].map(array => STITCH)
			],
			times: data[9].value, // number.value
			col: data[0].col, // first.col
			offset: data[9].col - data[0].col + data[9].text.length // last.col - first.col + last.length = total length
		}
	}
%}

STITCH -> %number _ %identifier {%
	data => { // 0.number 1._ 2.identifier
		return {
			type: "stitch",
			times: data[0].value, // number.value
			value: data[2].value,  // identifier.value
			col: data[0].col,	// first.col
			offset: data[2].col - data[0].col + data[2].text.length // last.col - first.col + last.length = total length
		}
	}
%}

separator -> __ | _ %separator _		{% () => null %}
_ -> %ws:*													{% () => null %}
__ -> %ws:+ 												{% () => null %}
