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
	data => [
		...data[0],  //mandatory step
		...data[1].map(x => x[1][0]) //optional additional steps [[separator [STEP]].map( _ => STEP)
	]
%}

REPEAT -> "(" _ STITCH (separator STITCH):*  _ ")" _ %multiplicator _ %number {%
	data => {
		return {
			type: "repeat",
			stitches: [
				data[2], //mandatory stitch
				...data[3].map(x => x[1]) //optional additional stitches [[separator STITCH]].map( _ => STITCH)
			],
			times: data[9].value, //%number
			col: data[0].col,
			offset: data[9].col - data[0].col + data[9].text.length // endcol - startcol + endlength = total length
		}
	}
%}

STITCH -> %number _ %identifier {%
			data => {
				return {
					type: "stitch",
					times: data[0].value, //%number
					value: data[2].value,  //%identifier
					col: data[0].col,
					offset: data[2].col - data[0].col + data[2].text.length // endcol - startcol + endlength = total length
				}
			}%}

separator -> __ | _ %separator _		{% () => null %}
_ -> %ws:*													{% () => null %}
__ -> %ws:+ 												{% () => null %}
