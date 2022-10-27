const Parser = require('./parser');

const { interpret } = require('./interpreter');
const { compile } = require('./compiler-pcode');

const code = `
function asdf(text, x)
	return 0
end
let x := 10
let foo := "FOO"
if x < 5 then
	let x := 15
end
print("X", x, foo)

`;

const ast = Parser.parse(code);
console.log(JSON.stringify(ast, null, 2))
const bitcode = compile(ast);

function runBitcode(bitcode = []) {
	let pc = 0;
	let ac = null;
	let current = bitcode[pc];
	let jumpreg = [];
	const stack = [];
	const heap = [];

	const next = (address) => {
		pc++;
		if (address) {
			pc = address;
		}
		current = bitcode[pc];
		return current;
	}

	while (pc < bitcode.length) {
		if (!current) {
			console.error('Unexpected exit', pc);
			break;
		}
		if (current.op === 'loadstring') ac = Buffer.from(current.value, 'base64').toString('utf8');
		if (current.op === 'load') ac = current.value;
		if (current.op === 'loadaddr') ac = heap[current.value];

		if (current.op === 'push') {
			stack.push(ac);
		}
		if (current.op === 'pop') {
			ac = stack.pop();
		}
		if (current.op === 'jump') {
			next(current.value);
			continue;
		}
		if (current.op === 'next') {
			jumpreg.push(pc + 2);
		}
		if (current.op === 'ret') {
			next(jumpreg.pop());
			continue;
		}
		if (current.op === 'add') {
			const a = stack.pop();
			const b = stack.pop();
			ac = a + b;
		}
		if (current.op === 'sub') {
			const a = stack.pop();
			const b = stack.pop();
			ac = b - a;
		}
		if (current.op === 'mul') {
			const a = stack.pop();
			const b = stack.pop();
			ac = a * b;
		}
		if (current.op === 'div') {
			const a = stack.pop();
			const b = stack.pop();
			ac = b / a;
		}

		if (current.op === 'eq') {
			const a = stack.pop();
			const b = stack.pop();
			ac = a === b;
		}

		if (current.op === 'lt') {
			const a = stack.pop();
			const b = stack.pop();
			ac = b < a;
		}

		if (current.op === 'gt') {
			const a = stack.pop();
			const b = stack.pop();
			ac = b > a;
		}

		if (current.op === 'jump?') {
			if (ac === true) {
				next(current.value);
				continue;
			}
		}

		if (current.op === 'jump!') {
			if (ac === false) {
				next(current.value);
				continue;
			}
		}

		if (current.op === 'store') {
			heap[current.value] = ac;
		}

		if (current.op === 'call') {
			const arglength = ac;
			const args = [];
			for(let i = 0; i < arglength; i++) {
				args.push(stack.pop());
			}
			if (current.value === 'print') {
				console.log(...args.reverse());
			}
			next(jumpreg.pop());
			continue;
		}

		next();
	}
	return { heap, stack }
};

runBitcode(bitcode)

// console.log(bitcode)
// console.log(
// 	runBitcode(bitcode)
// )