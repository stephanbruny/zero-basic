function ast_interpret(token = {}, heap = {}) {
	const isSome = (value) => value !== undefined && value !== null;
	const interpret = (tok, new_heap) => ast_interpret(tok, new_heap || heap)
	const expectType = (tok, allowedTypes = []) => {
		if (tok.identifier) {
			return tok;
		}
		const tokenType = tok.type || tok.value && typeof(tok.value) || typeof(token);
		if (allowedTypes.includes(tokenType)) return tok;
		throw new Error(`Invalid Type ${tokenType} (Expected: ${allowedTypes.join(', ')}`);
	}

	const execBody = (body, arguments = {}, isLocal = false) => {
		let local = { ...arguments, ...heap, debug() { console.log(heap) } }
		for (let i = 0; i < body.length; i++) {
			const res = interpret(body[i], local);
			if (typeof res === 'object') {
				local = {...local, ...res}
			}
			if (res && res.__call_result) {
				return res.__call_result;
			}
		}
		return { type: 'none' };
	}

	if (token.add) {
		const [left, right] = token.add;
		const result = interpret(expectType(left, ['number'])) + interpret(expectType(right, ['number']));
		return result;
	}

	if (token.sub) {
		const [left, right] = token.sub;
		const result = interpret(left) - interpret(right);
		return result;
	}

	if (token.multiply) {
		const [left, right] = token.multiply;
		const result = interpret(left) * interpret(right);
		return result;
	}

	if (token.divide) {
		const [left, right] = token.divide;
		const result = interpret(left) / interpret(right);
		return result;
	}

	if (token.and) {
		const left = interpret(token.and.left[0]);
		const right = interpret(token.and.right[0]);
		return left && right;
	}

	if (token.not) {
		const right = interpret(token.not);
		return !right;
	}

	if (token.equals) {
		const left = interpret(token.equals.left[0]);
		const right = interpret(token.equals.right[0]);
		return left === right;
	}

	if (token.greaterThan) {
		const left = interpret(token.greaterThan.left[0]);
		const right = interpret(token.greaterThan.right[0]);
		return left > right;
	}

	if (token.lessThan) {
		const left = interpret(token.lessThan.left[0]);
		const right = interpret(token.lessThan.right[0]);
		return left < right;
	}

	if (token.type) {
		return token.value;
	}

	if (token.let) {
		heap[token.let.identifier.identifier] = interpret(token.let.value);
		return heap;
	}

	if (token.identifier) {
		if (!isSome(heap[token.identifier])) {
			throw new Error(`Undeclared identifier: ${token.identifier}`)
		}
		return heap[token.identifier];
	}

	if (token.return) {
		const result = interpret(token.return)
		return { __call_result: result };
	}

	if (token.function) {
		const body = token.function.body;
		heap[token.function.name.identifier] = function(...args) {
			const arguments = (token.function.parameters || [])
				.map((param, i) => [param.identifier, args[i]])
				.reduce((acc, [key, value]) => ({...acc, [key]: value}), {});
			return execBody(body, arguments, true);
		}
	}

	if (token.call) {
		if (!heap[token.call.name.identifier]) throw new Error(`Undefined function: ${token.call.name.identifier}`)
		const fn = token.call.name.identifier;
		const args = (token.call.arguments || []).map(a => interpret(a));
		return heap[fn](...args)
	}

	if (token.if) {
		const clause = interpret(token.if.clause[0]);
		if (clause) {
			return execBody(token.if.body)
		}
		return { type: 'none', ifNotFullfilled: true }
	}

	if (token.body) {
		return execBody(token.body);
	}

	return heap;
}

module.exports = {
    interpret: ast_interpret
}