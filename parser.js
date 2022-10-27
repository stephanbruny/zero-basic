const Ohm = require('ohm-js');
const fs = require('fs');

const ZeroBasicGrammar = fs.readFileSync('./zbasic.ohm')

const grammar = Ohm.grammar(ZeroBasicGrammar);

const evalNodes = nodes => nodes.isIteration() ? (nodes.children || []).map(child => child.eval()) : [nodes.eval()];

const semantics = grammar.createSemantics().addOperation('eval', {
	Program (statements, _end) {
		return statements.eval();
	},
	Body(e) {
		return { body: evalNodes(e) }
	},
	'Function'(kw_function, identifier, parameters, statements, kw_end) {
		return { 'function': {
			name: identifier.eval(),
			parameters: parameters.eval().pop(),
			body: evalNodes(statements)
		}};
	},
	Parameters(symOpenBrace, parameterNames, symCloseBrace) {
		return evalNodes(parameterNames)
	},
	ParameterNames(first, comma, tail) {
		return [first.eval()].concat(evalNodes(tail));
	},
	Return(_return, e) {
		return { return: e.eval() };
	},
	Statement(e) {
		return e.eval();
	},
	CallArguments(_o, arguments, _c) {
		return evalNodes(arguments).pop();
	},
	Call(identifier, arguments) {
		return {
			call: {
				name: identifier.eval(),
				arguments: arguments.eval()
			}
		}
	},
	Arguments(head, comma, tail) {
		return evalNodes(head).concat(evalNodes(tail));
	},
    If(kw_if, logicExp, kw_then, statements, kw_end) {
        return {
            'if': {
                clause: evalNodes(logicExp),
                body: evalNodes(statements)
            }
        }
    },
    LogicExp_equals(left, eq, right) {
        return {
            'equals': { left: evalNodes(left), right: evalNodes(right) }
        }
    },
    LogicExp_greaterThan(left, eq, right) {
        return {
            'greaterThan': { left: evalNodes(left), right: evalNodes(right) }
        }
    },
    LogicExp_lessThan(left, eq, right) {
        return {
            'lessThan': { left: evalNodes(left), right: evalNodes(right) }
        }
    },
    LogicExp_and(left, eq, right) {
        return {
            'and': { left: evalNodes(left), right: evalNodes(right) }
        }
    },
    LogicExp_not(eq, right) {
        return {
            'not': evalNodes(right)
        }
    },
    Exp(e) {
        return e.eval();
    },
	MulExp_multiply(left, op, right) {
		return { 'multiply': [left.eval(), right.eval()] };
	},
	MulExp_divide(left, op, right) {
		return { 'divide': [ left.eval(), right.eval() ] };
	},
    AddExp(e) {
        return e.eval();
    },
    AddExp_plus(left, op, right) {
        return { 'add': [ left.eval(), right.eval() ] };
    },
    AddExp_minus(left, op, right) {
        return { 'sub': [ left.eval(), right.eval() ] };
    },
    PriExp(e) {
        return e.eval();
    },
    PriExp_paren(open, exp, close) {
        return exp.eval();
    },
    Integer(chars) {
        return { type: 'integer', value: parseInt(this.sourceString, 10) };
    },
	Float(a, b, c) {
        return { type: 'float', value: parseFloat(this.sourceString) };
    },
	String(_q1, text, q2) {
		return { type: 'string', value: text.sourceString }
	},
	identifier(a) {
		return { identifier: this.sourceString }
	},
	Let(kw, ident, _, exp) {
		return { 
			let: {
				identifier: ident.eval(),
				value: exp.eval() 
			}
		}
	}
});

module.exports = ({
    parse(code) {
        const m = grammar.match(code);
        if (m.failed()) {
            throw m.message;
        }
        return semantics(m).eval();
    }
});