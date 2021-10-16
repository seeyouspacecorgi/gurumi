@{%
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
%}

@lexer lexer

PATTERN -> ROW (nl	ROW):* {%
	data => { // 0.row 1.[[0.nl 1.row]]
		return [
			data[0],  // row (mandatory) [! no array spread, because row should be iterable]
			...data[1].map(x => x[1]) // rows (optional)
		]
	}
%}

ROW -> (STITCH|REPEAT) (separator (STITCH|REPEAT)):* {%
	data => { // 0.[stitch|repeat] 1.[[0.+ 1.[stitch|repeat]]]
		return {
			type: "row",
			operations: [
				...data[0],  // step (mandatory)
				...data[1].map(x => x[1][0]) // steps (optional), [[separator [STEP]]].map(array => STEP)
			]
		}
	}
%}

REPEAT -> "(" _ STITCH (separator STITCH):*  _ ")" _ %multiplicator _ %number {%
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
%}

STITCH -> %number _ %identifier {%
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
%}

nl -> _ %nl _														{% () => null %}
separator -> __ | _ %separator _				{% () => null %}
_ -> %ws:*															{% () => null %}
__ -> %ws:+ 														{% () => null %}
